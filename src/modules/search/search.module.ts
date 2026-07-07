import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { User } from '../../database/entities/user.entity';
import { Note } from '../../database/entities/note.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { QuestionPaper } from '../../database/entities/question-paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Note, Assignment, QuestionPaper])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
