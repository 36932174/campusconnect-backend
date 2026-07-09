import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Note } from '../../database/entities/note.entity';
import { Follow } from '../../database/entities/follow.entity';
import { Group } from '../../database/entities/group.entity';
import { Assignment } from '../../database/entities/assignment.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
  ) {}

  async getUserStats(userId: string) {
    const [
      totalFollowers,
      totalFollowing,
      totalNotes,
      totalDownloads,
      totalViews,
    ] = await Promise.all([
      this.followRepository.count({ where: { following: { id: userId } } }),
      this.followRepository.count({ where: { follower: { id: userId } } }),
      this.noteRepository.count({ where: { user: { id: userId } } }),
      this.noteRepository
        .createQueryBuilder('note')
        .select('COALESCE(SUM(note.downloadCount), 0)', 'total')
        .where('note.userId = :userId', { userId })
        .getRawOne()
        .then(r => parseInt(r.total)),
      this.noteRepository
        .createQueryBuilder('note')
        .select('COALESCE(SUM(note.viewCount), 0)', 'total')
        .where('note.userId = :userId', { userId })
        .getRawOne()
        .then(r => parseInt(r.total)),
    ]);

    return {
      totalFollowers,
      totalFollowing,
      totalNotes,
      totalDownloads,
      totalViews,
    };
  }

  async getDashboard(userId: string) {
    const [stats, recentNotes] = await Promise.all([
      this.getUserStats(userId),
      this.noteRepository.find({
        where: { user: { id: userId } },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      ...stats,
      recentNotes,
    };
  }

  async getPublicStats() {
    const [totalUsers, totalNotes, totalGroups, totalDownloads, totalAssignments] = await Promise.all([
      this.userRepository.count(),
      this.noteRepository.count(),
      this.groupRepository.count(),
      this.noteRepository
        .createQueryBuilder('note')
        .select('COALESCE(SUM(note.downloadCount), 0)', 'total')
        .getRawOne()
        .then(r => parseInt(r.total)),
      this.assignmentRepository.count(),
    ]);

    return {
      totalUsers,
      totalResources: totalNotes + totalAssignments,
      totalStudyGroups: totalGroups,
      totalDownloads,
    };
  }
}
