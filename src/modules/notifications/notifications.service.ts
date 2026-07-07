import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['actor', 'actor.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        actor: n.actor ? {
          id: n.actor.id,
          username: n.actor.username,
          displayName: n.actor.profile?.displayName,
          avatarUrl: n.actor.profile?.avatarUrl,
        } : null,
        data: n.data,
        createdAt: n.createdAt,
      })),
      unreadCount: await this.notificationRepository.count({
        where: { user: { id: userId }, read: false },
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { read: true, readAt: new Date() },
    );
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { user: { id: userId }, read: false },
      { read: true, readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { user: { id: userId }, read: false },
    });
    return { unreadCount: count };
  }

  async deleteNotification(notificationId: string, userId: string) {
    await this.notificationRepository.delete({
      id: notificationId,
      user: { id: userId },
    });
    return { message: 'Notification deleted' };
  }
}
