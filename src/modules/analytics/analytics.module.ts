import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Note } from '../../database/entities/note.entity';
import { Follow } from '../../database/entities/follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Note, Follow])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
