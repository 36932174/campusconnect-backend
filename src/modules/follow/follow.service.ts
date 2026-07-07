import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from '../../database/entities/follow.entity';
import { User } from '../../database/entities/user.entity';
import { Notification, NotificationType } from '../../database/entities/notification.entity';
import { AuditService } from '../../security/audit.service';

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly auditService: AuditService,
  ) {}

  async follow(followerId: string, followingUsername: string) {
    if (followerId === followingUsername) {
      throw new ConflictException('You cannot follow yourself');
    }

    const following = await this.userRepository.findOne({ where: { username: followingUsername } });
    if (!following) throw new NotFoundException('User not found');

    const existingFollow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: following.id } },
    });

    if (existingFollow) throw new ConflictException('Already following this user');

    const isPrivate = following.isPrivate;
    const follow = this.followRepository.create({
      follower: { id: followerId } as any,
      following: { id: following.id } as any,
      isPending: isPrivate,
    });

    await this.followRepository.save(follow);

    await this.userRepository.increment({ id: followerId }, 'profile.followingCount', 1);
    await this.userRepository.increment({ id: following.id }, 'profile.followerCount', 1);

    const notification = this.notificationRepository.create({
      user: { id: following.id } as any,
      actor: { id: followerId } as any,
      type: NotificationType.FOLLOW,
      title: 'New Follower',
      body: 'started following you',
    });
    await this.notificationRepository.save(notification);

    await this.auditService.log({
      action: 'USER_FOLLOWED',
      entityType: 'follow',
      userId: followerId,
      metadata: { targetUserId: following.id },
    });

    return { message: isPrivate ? 'Follow request sent' : 'Following successfully' };
  }

  async unfollow(followerId: string, followingUsername: string) {
    const following = await this.userRepository.findOne({ where: { username: followingUsername } });
    if (!following) throw new NotFoundException('User not found');

    const follow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: following.id } },
    });

    if (!follow) throw new NotFoundException('Not following this user');

    await this.followRepository.remove(follow);

    await this.userRepository.decrement({ id: followerId }, 'profile.followingCount', 1);
    await this.userRepository.decrement({ id: following.id }, 'profile.followerCount', 1);

    return { message: 'Unfollowed successfully' };
  }

  async getFollowers(username: string, page = 1, limit = 20) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const skip = (page - 1) * limit;
    const [follows, total] = await this.followRepository.findAndCount({
      where: { following: { id: user.id } },
      relations: ['follower', 'follower.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      followers: follows.map((f) => ({
        id: f.follower.id,
        username: f.follower.username,
        displayName: f.follower.profile?.displayName,
        avatarUrl: f.follower.profile?.avatarUrl,
        bio: f.follower.profile?.bio,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFollowing(username: string, page = 1, limit = 20) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const skip = (page - 1) * limit;
    const [follows, total] = await this.followRepository.findAndCount({
      where: { follower: { id: user.id } },
      relations: ['following', 'following.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      following: follows.map((f) => ({
        id: f.following.id,
        username: f.following.username,
        displayName: f.following.profile?.displayName,
        avatarUrl: f.following.profile?.avatarUrl,
        bio: f.following.profile?.bio,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepository.findOne({
      where: { follower: { id: followerId }, following: { id: followingId } },
    });
    return !!follow;
  }
}
