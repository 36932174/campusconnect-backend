import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Chat } from '../../database/entities/chat.entity';
import { Message } from '../../database/entities/message.entity';
import { Group } from '../../database/entities/group.entity';
import { GroupMember } from '../../database/entities/group-member.entity';
import { User } from '../../database/entities/user.entity';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, Group, GroupMember, User]),
    SecurityModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
