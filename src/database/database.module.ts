import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Follow } from './entities/follow.entity';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Note } from './entities/note.entity';
import { Assignment } from './entities/assignment.entity';
import { QuestionPaper } from './entities/question-paper.entity';
import { Notification } from './entities/notification.entity';
import { Report } from './entities/report.entity';
import { AdminLog } from './entities/admin-log.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Session } from './entities/session.entity';
import { ResourceModeration } from './entities/resource-moderation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      Follow,
      Chat,
      Message,
      Group,
      GroupMember,
      Note,
      Assignment,
      QuestionPaper,
      Notification,
      Report,
      AdminLog,
      AuditLog,
      Session,
      ResourceModeration,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
