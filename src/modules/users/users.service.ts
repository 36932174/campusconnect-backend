import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { AuditService } from '../../security/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly auditService: AuditService,
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPublicProfile(username: string, currentUserId?: string) {
    const user = await this.findByUsername(username);

    if (user.isPrivate && currentUserId !== user.id) {
      const isFollowing = await this.isFollowing(currentUserId, user.id);
      if (!isFollowing) {
        return {
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName,
          avatarUrl: user.profile?.avatarUrl,
          bio: user.profile?.bio,
          followerCount: user.profile?.followerCount,
          followingCount: user.profile?.followingCount,
          isPrivate: true,
          message: 'This account is private',
        };
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.profile?.displayName,
      avatarUrl: user.profile?.avatarUrl,
      coverUrl: user.profile?.coverUrl,
      bio: user.profile?.bio,
      skills: user.profile?.skills,
      education: user.profile?.education,
      socialLinks: user.profile?.socialLinks,
      location: user.profile?.location,
      website: user.profile?.website,
      followerCount: user.profile?.followerCount,
      followingCount: user.profile?.followingCount,
      resourceCount: user.profile?.resourceCount,
      isVerified: user.isVerified,
      verificationBadgeType: user.verificationBadgeType,
      isPrivate: user.isPrivate,
      joinedAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const user = await this.findById(userId);
    const profile = user.profile;

    if (!profile) {
      const newProfile = this.profileRepository.create({ user, ...updates });
      return this.profileRepository.save(newProfile);
    }

    Object.assign(profile, updates);
    return this.profileRepository.save(profile);
  }

  async searchUsers(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.username ILIKE :query', { query: `%${query}%` })
      .orWhere('profile.displayName ILIKE :query', { query: `%${query}%` })
      .andWhere('user.status = :status', { status: 'active' })
      .skip(skip)
      .take(limit)
      .orderBy('profile.followerCount', 'DESC')
      .getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName,
        avatarUrl: u.profile?.avatarUrl,
        bio: u.profile?.bio,
        followerCount: u.profile?.followerCount,
        isVerified: u.isVerified,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserSuggestions(currentUserId: string, limit = 10) {
    const currentUser = await this.findById(currentUserId);

    const suggestions = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id != :id', { id: currentUserId })
      .andWhere('user.status = :status', { status: 'active' })
      .orderBy('profile.followerCount', 'DESC')
      .take(limit)
      .getMany();

    return suggestions.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.profile?.displayName,
      avatarUrl: u.profile?.avatarUrl,
      bio: u.profile?.bio,
      followerCount: u.profile?.followerCount,
      isVerified: u.isVerified,
    }));
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    profile.avatarUrl = avatarUrl;
    return this.profileRepository.save(profile);
  }

  async updateCover(userId: string, coverUrl: string) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    profile.coverUrl = coverUrl;
    return this.profileRepository.save(profile);
  }

  async togglePrivacy(userId: string) {
    const user = await this.findById(userId);
    user.isPrivate = !user.isPrivate;
    return this.userRepository.save(user);
  }

  async blockUser(currentUserId: string, targetUserId: string) {
    await this.auditService.log({
      action: 'USER_BLOCKED',
      entityType: 'user',
      entityId: targetUserId,
      userId: currentUserId,
      severity: 'warning',
    });
    return { message: 'User blocked' };
  }

  async reportUser(reporterId: string, targetUserId: string, reason: string) {
    await this.auditService.log({
      action: 'USER_REPORTED',
      entityType: 'user',
      entityId: targetUserId,
      userId: reporterId,
      severity: 'warning',
      metadata: { reason },
    });
    return { message: 'Report submitted. Our team will review it.' };
  }

  private async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId) return false;
    const result = await this.userRepository.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId],
    );
    return result.length > 0;
  }
}
