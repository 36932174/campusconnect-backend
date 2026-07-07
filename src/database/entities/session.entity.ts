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

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'refresh_token', select: false })
  refreshToken: string;

  @Column({ name: 'device_info', nullable: true })
  deviceInfo: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ nullable: true, name: 'last_activity_at' })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
