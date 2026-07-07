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
import { ResourceStatus } from './note.entity';

@Entity('assignments')
@Index(['subject', 'semester'])
@Index(['user'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  subject: string;

  @Column()
  semester: number;

  @Column({ nullable: true, name: 'due_date' })
  dueDate: Date;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @ManyToOne(() => User, (user) => user.assignments, { onDelete: 'CASCADE' })
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

  @Column({ nullable: true, name: 'moderator_id' })
  moderatorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
