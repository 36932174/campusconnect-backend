import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Chat } from './chat.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  VOICE = 'voice',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['chat', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'simple-json', nullable: true, name: 'file_metadata' })
  fileMetadata: { name: string; url: string; size: number; mimeType: string };

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @Column({ nullable: true, type: 'uuid', name: 'reply_to' })
  replyTo: string;

  @Column({ type: 'simple-json', nullable: true, name: 'reactions' })
  reactions: { userId: string; emoji: string }[];

  @Column({ default: false, name: 'is_edited' })
  isEdited: boolean;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'read_at' })
  readAt: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'delivered_at' })
  deliveredAt: Date;

  @Column({ nullable: true, name: 'client_id' })
  clientId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
