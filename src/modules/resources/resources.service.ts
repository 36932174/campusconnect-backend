import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Note, ResourceStatus } from '../../database/entities/note.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { QuestionPaper } from '../../database/entities/question-paper.entity';
import { ResourceModeration } from '../../database/entities/resource-moderation.entity';
import { User } from '../../database/entities/user.entity';
import { AuditService } from '../../security/audit.service';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(QuestionPaper)
    private readonly questionPaperRepository: Repository<QuestionPaper>,
    @InjectRepository(ResourceModeration)
    private readonly moderationRepository: Repository<ResourceModeration>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  // ─── Notes ───

  async uploadNote(userId: string, data: Partial<Note>) {
    const note = this.noteRepository.create({
      ...data,
      user: { id: userId } as any,
      status: ResourceStatus.PENDING,
    });

    const saved = await this.noteRepository.save(note);

    await this.moderationRepository.save({
      resourceType: 'note',
      resourceId: saved.id,
      status: 'pending',
      virusScanPassed: true,
    });

    await this.userRepository.increment({ id: userId }, 'profile.resourceCount', 1);

    await this.auditService.log({
      action: 'NOTE_UPLOADED',
      entityType: 'note',
      entityId: saved.id,
      userId,
    });

    return saved;
  }

  async getNotes(filters: { subject?: string; semester?: number; branch?: string; page?: number; limit?: number }) {
    const { subject, semester, branch, page = 1, limit = 20 } = filters;
    const where: any = { status: ResourceStatus.APPROVED };

    if (subject) where.subject = subject;
    if (semester) where.semester = semester;
    if (branch) where.branch = branch;

    const skip = (page - 1) * limit;
    const [notes, total] = await this.noteRepository.findAndCount({
      where,
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC', downloadCount: 'DESC' },
    });

    return {
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        subject: n.subject,
        branch: n.branch,
        semester: n.semester,
        fileUrl: n.fileUrl,
        fileSize: n.fileSize,
        mimeType: n.mimeType,
        thumbnailUrl: n.thumbnailUrl,
        downloadCount: n.downloadCount,
        viewCount: n.viewCount,
        tags: n.tags,
        isFeatured: n.isFeatured,
        user: {
          id: n.user.id,
          username: n.user.username,
          displayName: n.user.profile?.displayName,
          avatarUrl: n.user.profile?.avatarUrl,
        },
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNoteById(id: string) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!note) throw new NotFoundException('Note not found');
    await this.noteRepository.increment({ id }, 'viewCount', 1);
    return note;
  }

  async downloadNote(id: string) {
    const note = await this.getNoteById(id);
    await this.noteRepository.increment({ id }, 'downloadCount', 1);
    return note;
  }

  async getUserNotes(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notes, total] = await this.noteRepository.findAndCount({
      where: { user: { id: userId } },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { notes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Assignments ───

  async uploadAssignment(userId: string, data: Partial<Assignment>) {
    const assignment = this.assignmentRepository.create({
      ...data,
      user: { id: userId } as any,
      status: ResourceStatus.PENDING,
    });

    const saved = await this.assignmentRepository.save(assignment);

    await this.userRepository.increment({ id: userId }, 'profile.resourceCount', 1);

    await this.auditService.log({
      action: 'ASSIGNMENT_UPLOADED',
      entityType: 'assignment',
      entityId: saved.id,
      userId,
    });

    return saved;
  }

  async getAssignments(filters: { subject?: string; semester?: number; page?: number; limit?: number }) {
    const { subject, semester, page = 1, limit = 20 } = filters;
    const where: any = { status: ResourceStatus.APPROVED };

    if (subject) where.subject = subject;
    if (semester) where.semester = semester;

    const skip = (page - 1) * limit;
    const [assignments, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        subject: a.subject,
        semester: a.semester,
        dueDate: a.dueDate,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        downloadCount: a.downloadCount,
        viewCount: a.viewCount,
        tags: a.tags,
        user: {
          id: a.user.id,
          username: a.user.username,
          displayName: a.user.profile?.displayName,
          avatarUrl: a.user.profile?.avatarUrl,
        },
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAssignmentById(id: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assignmentRepository.increment({ id }, 'viewCount', 1);
    return assignment;
  }

  // ─── Question Papers ───

  async uploadQuestionPaper(userId: string, data: Partial<QuestionPaper>) {
    const qp = this.questionPaperRepository.create({
      ...data,
      user: { id: userId } as any,
      status: ResourceStatus.PENDING,
    });

    const saved = await this.questionPaperRepository.save(qp);
    await this.userRepository.increment({ id: userId }, 'profile.resourceCount', 1);

    await this.auditService.log({
      action: 'QUESTION_PAPER_UPLOADED',
      entityType: 'question_paper',
      entityId: saved.id,
      userId,
    });

    return saved;
  }

  async getQuestionPapers(filters: { subject?: string; semester?: number; branch?: string; year?: number; page?: number; limit?: number }) {
    const { subject, semester, branch, year, page = 1, limit = 20 } = filters;
    const where: any = { status: ResourceStatus.APPROVED };

    if (subject) where.subject = subject;
    if (semester) where.semester = semester;
    if (branch) where.branch = branch;
    if (year) where.year = year;

    const skip = (page - 1) * limit;
    const [papers, total] = await this.questionPaperRepository.findAndCount({
      where,
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
      order: { year: 'DESC', createdAt: 'DESC' },
    });

    return {
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        subject: p.subject,
        branch: p.branch,
        semester: p.semester,
        year: p.year,
        examType: p.examType,
        fileUrl: p.fileUrl,
        fileSize: p.fileSize,
        mimeType: p.mimeType,
        downloadCount: p.downloadCount,
        viewCount: p.viewCount,
        tags: p.tags,
        user: {
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.profile?.displayName,
          avatarUrl: p.user.profile?.avatarUrl,
        },
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getQuestionPaperById(id: string) {
    const qp = await this.questionPaperRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!qp) throw new NotFoundException('Question paper not found');
    await this.questionPaperRepository.increment({ id }, 'viewCount', 1);
    return qp;
  }

  // ─── Search All Resources ───

  async searchAll(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notes, notesTotal] = await this.noteRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), status: ResourceStatus.APPROVED },
        { subject: Like(`%${query}%`), status: ResourceStatus.APPROVED },
        { description: Like(`%${query}%`), status: ResourceStatus.APPROVED },
      ],
      skip,
      take: limit,
      order: { downloadCount: 'DESC' },
    });

    const [assignments, assignmentsTotal] = await this.assignmentRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), status: ResourceStatus.APPROVED },
        { subject: Like(`%${query}%`), status: ResourceStatus.APPROVED },
      ],
      skip,
      take: limit,
    });

    const [papers, papersTotal] = await this.questionPaperRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), status: ResourceStatus.APPROVED },
        { subject: Like(`%${query}%`), status: ResourceStatus.APPROVED },
      ],
      skip,
      take: limit,
    });

    return {
      notes,
      assignments,
      questionPapers: papers,
      totalResults: notesTotal + assignmentsTotal + papersTotal,
      page,
      limit,
    };
  }

  // ─── Admin: Moderation ───

  async getPendingResources(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [pendingNotes, notesTotal] = await this.noteRepository.findAndCount({
      where: { status: ResourceStatus.PENDING },
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
    });

    const [pendingAssignments, assignmentsTotal] = await this.assignmentRepository.findAndCount({
      where: { status: ResourceStatus.PENDING },
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
    });

    const [pendingPapers, papersTotal] = await this.questionPaperRepository.findAndCount({
      where: { status: ResourceStatus.PENDING },
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
    });

    return {
      pendingNotes,
      pendingAssignments,
      pendingPapers,
      totalPending: notesTotal + assignmentsTotal + papersTotal,
    };
  }

  async moderateResource(resourceType: string, resourceId: string, status: ResourceStatus, moderatorId: string, note?: string) {
    let resource: any;

    switch (resourceType) {
      case 'note':
        resource = await this.noteRepository.findOne({ where: { id: resourceId } });
        break;
      case 'assignment':
        resource = await this.assignmentRepository.findOne({ where: { id: resourceId } });
        break;
      case 'question_paper':
        resource = await this.questionPaperRepository.findOne({ where: { id: resourceId } });
        break;
    }

    if (!resource) throw new NotFoundException('Resource not found');

    resource.status = status;
    resource.moderatorId = moderatorId;
    resource.moderationNote = note;
    if (resourceType === 'note') {
      await this.noteRepository.save(resource);
    } else if (resourceType === 'assignment') {
      await this.assignmentRepository.save(resource);
    } else {
      await this.questionPaperRepository.save(resource);
    }

    await this.moderationRepository.update(
      { resourceType, resourceId },
      { status, moderatorId, moderationNote: note, reviewedAt: new Date() },
    );

    return { message: `Resource ${status}` };
  }
}
