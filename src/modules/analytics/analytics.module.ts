import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Note } from '../../database/entities/note.entity';
import { Follow } from '../../database/entities/follow.entity';
import { Group } from '../../database/entities/group.entity';
import { Assignment } from '../../database/entities/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Note, Follow, Group, Assignment])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
