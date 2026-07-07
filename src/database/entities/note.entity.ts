import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ResourceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity('notes')
@Index(['subject', 'semester', 'branch'])
@Index(['user'])
@Index(['status'])
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  subject: string;

  @Column()
  branch: string;

  @Column()
  semester: number;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @ManyToOne(() => User, (user) => user.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ResourceStatus, default: ResourceStatus.PENDING })
  status: ResourceStatus;

  @Column({ default: 0, name: 'download_count' })
  downloadCount: number;

  @Column({ default: 0, name: 'view_count' })
  viewCount: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ nullable: true, name: 'moderator_id' })
  moderatorId: string;

  @Column({ nullable: true, type: 'text', name: 'moderation_note' })
  moderationNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
