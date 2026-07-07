import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatType } from '../../database/entities/chat.entity';
import { Message, MessageType, MessageStatus } from '../../database/entities/message.entity';
import { Group } from '../../database/entities/group.entity';
import { GroupMember, GroupMemberRole } from '../../database/entities/group-member.entity';
import { User } from '../../database/entities/user.entity';
import { EncryptionService } from '../../security/encryption.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getOrCreateDirectChat(userOneId: string, userTwoId: string) {
    const existingChat = await this.chatRepository
      .createQueryBuilder('chat')
      .where(
        '(chat.userOneId = :userOne AND chat.userTwoId = :userTwo) OR (chat.userOneId = :userTwo AND chat.userTwoId = :userOne)',
        { userOne: userOneId, userTwo: userTwoId },
      )
      .getOne();

    if (existingChat) return existingChat;

    const chat = this.chatRepository.create({
      type: ChatType.DIRECT,
      userOne: { id: userOneId } as any,
      userTwo: { id: userTwoId } as any,
      encryptionKey: this.encryptionService.generateEncryptionKey(),
    });

    return this.chatRepository.save(chat);
  }

  async getMessages(chatId: string, userId: string, page = 1, limit = 50) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['userOne', 'userTwo', 'group', 'group.members'],
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const canAccess = await this.canAccessChat(chat, userId);
    if (!canAccess) throw new ForbiddenException('Access denied');

    const skip = (page - 1) * limit;
    const [messages, total] = await this.messageRepository.findAndCount({
      where: { chat: { id: chatId }, isDeleted: false },
      relations: ['sender', 'sender.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      messages: messages.reverse().map((m) => ({
        id: m.id,
        chatId: m.chat.id,
        sender: {
          id: m.sender.id,
          username: m.sender.username,
          displayName: m.sender.profile?.displayName,
          avatarUrl: m.sender.profile?.avatarUrl,
        },
        type: m.type,
        content: m.content,
        fileMetadata: m.fileMetadata,
        status: m.status,
        replyTo: m.replyTo,
        reactions: m.reactions,
        isEdited: m.isEdited,
        clientId: m.clientId,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(chatId: string, senderId: string, content: any) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['userOne', 'userTwo', 'group', 'group.members'],
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const canAccess = await this.canAccessChat(chat, senderId);
    if (!canAccess) throw new ForbiddenException('Access denied');

    const message = this.messageRepository.create({
      chat: { id: chatId } as any,
      sender: { id: senderId } as any,
      type: content.type || MessageType.TEXT,
      content: content.text || null,
      fileMetadata: content.fileMetadata || null,
      replyTo: content.replyTo || null,
      clientId: content.clientId,
    });

    const saved = await this.messageRepository.save(message);

    await this.chatRepository.update(chatId, {
      lastMessagePreview: content.text?.substring(0, 100) || content.type || 'Media',
      lastMessageAt: new Date(),
    });

    return this.messageRepository.findOne({
      where: { id: saved.id },
      relations: ['sender', 'sender.profile'],
    });
  }

  async markAsRead(chatId: string, userId: string, messageIds: string[]) {
    await this.messageRepository.update(
      { id: { $in: messageIds } as any, chat: { id: chatId } },
      { status: MessageStatus.READ, readAt: new Date() },
    );
    return { message: 'Messages marked as read' };
  }

  async updateMessage(messageId: string, userId: string, content: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.id !== userId) throw new ForbiddenException('Cannot edit others messages');

    message.content = content;
    message.isEdited = true;
    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'chat'],
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.sender.id !== userId) throw new ForbiddenException('Cannot delete others messages');

    message.isDeleted = true;
    message.content = null;
    return this.messageRepository.save(message);
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex].emoji = emoji;
      }
    } else {
      reactions.push({ userId, emoji });
    }

    message.reactions = reactions;
    return this.messageRepository.save(message);
  }

  async getUserChats(userId: string) {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.userOne', 'userOne')
      .leftJoinAndSelect('chat.userOne.profile', 'userOneProfile')
      .leftJoinAndSelect('chat.userTwo', 'userTwo')
      .leftJoinAndSelect('chat.userTwo.profile', 'userTwoProfile')
      .leftJoinAndSelect('chat.group', 'group')
      .where('chat.userOneId = :userId OR chat.userTwoId = :userId', { userId })
      .orWhere('chat.groupId IN (SELECT gm.groupId FROM group_members gm WHERE gm.userId = :userId)', { userId })
      .orderBy('chat.lastMessageAt', 'DESC')
      .getMany();

    return chats.map((chat) => {
      const otherUser = chat.userOne?.id === userId ? chat.userTwo : chat.userOne;
      return {
        id: chat.id,
        type: chat.type,
        name: chat.type === 'group' ? chat.group?.name : otherUser?.profile?.displayName || otherUser?.username,
        avatarUrl: chat.type === 'group' ? chat.group?.avatarUrl : otherUser?.profile?.avatarUrl,
        lastMessagePreview: chat.lastMessagePreview,
        lastMessageAt: chat.lastMessageAt,
        otherUser: chat.type === 'direct' ? {
          id: otherUser?.id,
          username: otherUser?.username,
          displayName: otherUser?.profile?.displayName,
          avatarUrl: otherUser?.profile?.avatarUrl,
        } : null,
      };
    });
  }

  async createGroup(name: string, description: string, creatorId: string, memberIds: string[]) {
    const group = this.groupRepository.create({
      name,
      description,
      createdBy: { id: creatorId } as any,
    });

    const savedGroup = await this.groupRepository.save(group);

    const members = [
      this.groupMemberRepository.create({
        group: savedGroup,
        user: { id: creatorId } as any,
        role: GroupMemberRole.ADMIN,
      }),
      ...memberIds.map((memberId) =>
        this.groupMemberRepository.create({
          group: savedGroup,
          user: { id: memberId } as any,
          role: GroupMemberRole.MEMBER,
        }),
      ),
    ];

    await this.groupMemberRepository.save(members);

    const chat = this.chatRepository.create({
      type: ChatType.GROUP,
      group: savedGroup,
      encryptionKey: this.encryptionService.generateEncryptionKey(),
    });

    await this.chatRepository.save(chat);

    return { ...savedGroup, chatId: chat.id };
  }

  async searchChats(userId: string, query: string) {
    return this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.userOne', 'userOne')
      .leftJoinAndSelect('chat.userOne.profile', 'userOneProfile')
      .leftJoinAndSelect('chat.userTwo', 'userTwo')
      .leftJoinAndSelect('chat.userTwo.profile', 'userTwoProfile')
      .leftJoinAndSelect('chat.group', 'group')
      .where('(chat.userOneId = :userId OR chat.userTwoId = :userId)', { userId })
      .andWhere(
        '(userOneProfile.displayName ILIKE :query OR userTwoProfile.displayName ILIKE :query OR userOne.username ILIKE :query OR userTwo.username ILIKE :query)',
        { query: `%${query}%` },
      )
      .getMany();
  }

  private async canAccessChat(chat: Chat, userId: string): Promise<boolean> {
    if (chat.type === ChatType.DIRECT) {
      return chat.userOne?.id === userId || chat.userTwo?.id === userId;
    }

    if (chat.type === ChatType.GROUP && chat.group) {
      const membership = await this.groupMemberRepository.findOne({
        where: { group: { id: chat.group.id }, user: { id: userId } },
      });
      return !!membership;
    }

    return false;
  }
}
