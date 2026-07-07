import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Note, ResourceStatus } from '../../database/entities/note.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { QuestionPaper } from '../../database/entities/question-paper.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(QuestionPaper)
    private readonly questionPaperRepository: Repository<QuestionPaper>,
  ) {}

  async globalSearch(query: string, filters: {
    type?: string;
    subject?: string;
    semester?: number;
    branch?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const results: any = {};

    if (!type || type === 'users') {
      const [users, total] = await this.userRepository.findAndCount({
        where: [
          { username: Like(searchTerm) },
          { email: Like(searchTerm) },
        ],
        relations: ['profile'],
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      results.users = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName,
        avatarUrl: u.profile?.avatarUrl,
        bio: u.profile?.bio,
        followerCount: u.profile?.followerCount,
        isVerified: u.isVerified,
        _type: 'user',
      }));
      results.userTotal = total;
    }

    if (!type || type === 'notes') {
      const where: any[] = [
        { title: Like(searchTerm), status: ResourceStatus.APPROVED },
        { subject: Like(searchTerm), status: ResourceStatus.APPROVED },
        { description: Like(searchTerm), status: ResourceStatus.APPROVED },
      ];
      if (filters.subject) where.forEach((w) => (w.subject = filters.subject));
      if (filters.semester) where.forEach((w) => (w.semester = filters.semester));
      if (filters.branch) where.forEach((w) => (w.branch = filters.branch));

      const [notes, total] = await this.noteRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { downloadCount: 'DESC' },
      });
      results.notes = notes.map((n) => ({ ...n, _type: 'note' }));
      results.noteTotal = total;
    }

    if (!type || type === 'assignments') {
      const where: any[] = [
        { title: Like(searchTerm) },
        { subject: Like(searchTerm) },
      ];
      if (filters.subject) where.forEach((w) => (w.subject = filters.subject));
      if (filters.semester) where.forEach((w) => (w.semester = filters.semester));

      const [assignments, total] = await this.assignmentRepository.findAndCount({
        where,
        skip,
        take: limit,
      });
      results.assignments = assignments.map((a) => ({ ...a, _type: 'assignment' }));
      results.assignmentTotal = total;
    }

    if (!type || type === 'question_papers') {
      const where: any[] = [
        { title: Like(searchTerm) },
        { subject: Like(searchTerm) },
      ];
      if (filters.subject) where.forEach((w) => (w.subject = filters.subject));
      if (filters.semester) where.forEach((w) => (w.semester = filters.semester));
      if (filters.branch) where.forEach((w) => (w.branch = filters.branch));

      const [papers, total] = await this.questionPaperRepository.findAndCount({
        where,
        skip,
        take: limit,
      });
      results.questionPapers = papers.map((p) => ({ ...p, _type: 'question_paper' }));
      results.paperTotal = total;
    }

    return {
      ...results,
      query,
      page,
      limit,
    };
  }
}
