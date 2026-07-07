import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Note } from '../../database/entities/note.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { QuestionPaper } from '../../database/entities/question-paper.entity';
import { ResourceModeration } from '../../database/entities/resource-moderation.entity';
import { User } from '../../database/entities/user.entity';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Assignment, QuestionPaper, ResourceModeration, User]),
    SecurityModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
