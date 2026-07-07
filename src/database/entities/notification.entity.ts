import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MESSAGE = 'message',
  RESOURCE_UPLOAD = 'resource_upload',
  RESOURCE_APPROVED = 'resource_approved',
  RESOURCE_REJECTED = 'resource_rejected',
  MENTION = 'mention',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['user', 'read'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'simple-json', nullable: true, name: 'data' })
  data: Record<string, any>;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'read_at' })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
