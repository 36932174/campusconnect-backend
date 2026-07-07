import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getChats(@CurrentUser('id') userId: string) {
    return this.chatService.getUserChats(userId);
  }

  @Get('search')
  async searchChats(
    @CurrentUser('id') userId: string,
    @Query('q') q: string,
  ) {
    return this.chatService.searchChats(userId, q);
  }

  @Post('direct/:userId')
  async getOrCreateDirectChat(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') otherUserId: string,
  ) {
    return this.chatService.getOrCreateDirectChat(currentUserId, otherUserId);
  }

  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getMessages(chatId, userId, page, limit);
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId') chatId: string,
    @CurrentUser('id') senderId: string,
    @Body() content: any,
  ) {
    return this.chatService.sendMessage(chatId, senderId, content);
  }

  @Post(':chatId/read')
  async markAsRead(
    @Param('chatId') chatId: string,
    @CurrentUser('id') userId: string,
    @Body('messageIds') messageIds: string[],
  ) {
    return this.chatService.markAsRead(chatId, userId, messageIds);
  }

  @Put('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.updateMessage(messageId, userId, content);
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.deleteMessage(messageId, userId);
  }

  @Post('messages/:messageId/reactions')
  async addReaction(
    @Param('messageId') messageId: string,
    @CurrentUser('id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(messageId, userId, emoji);
  }

  @Post('groups')
  async createGroup(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; description: string; memberIds: string[] },
  ) {
    return this.chatService.createGroup(body.name, body.description, userId, body.memberIds);
  }
}
