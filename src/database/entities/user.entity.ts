import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Session } from './session.entity';
import { Follow } from './follow.entity';
import { Message } from './message.entity';
import { Notification } from './notification.entity';
import { Report } from './report.entity';
import { Note } from './note.entity';
import { Assignment } from './assignment.entity';
import { QuestionPaper } from './question-paper.entity';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  username: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, name: 'email_verification_token', select: false })
  emailVerificationToken: string;

  @Column({ nullable: true, name: 'password_reset_token', select: false })
  passwordResetToken: string;

  @Column({ nullable: true, type: 'timestamp', name: 'password_reset_expires' })
  passwordResetExpires: Date;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ nullable: true, name: 'verification_badge_type' })
  verificationBadgeType: string;

  @Column({ default: false, name: 'two_factor_enabled' })
  twoFactorEnabled: boolean;

  @Column({ nullable: true, name: 'two_factor_secret', select: false })
  twoFactorSecret: string;

  @Column({ default: true, name: 'is_private' })
  isPrivate: boolean;

  @Column({ nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ nullable: true, name: 'last_login_ip' })
  lastLoginIp: string;

  @Column({ name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column({ nullable: true, type: 'timestamp', name: 'lockout_until' })
  lockoutUntil: Date;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToMany(() => Session, (session) => session.user, { cascade: true })
  sessions: Session[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Report, (report) => report.reporter)
  reports: Report[];

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => Assignment, (assignment) => assignment.user)
  assignments: Assignment[];

  @OneToMany(() => QuestionPaper, (qp) => qp.user)
  questionPapers: QuestionPaper[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
