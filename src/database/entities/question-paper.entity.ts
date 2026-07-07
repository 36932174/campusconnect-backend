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

@Entity('question_papers')
@Index(['subject', 'semester', 'branch', 'year'])
export class QuestionPaper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column()
  subject: string;

  @Column()
  branch: string;

  @Column()
  semester: number;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true, name: 'exam_type' })
  examType: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @ManyToOne(() => User, (user) => user.questionPapers, { onDelete: 'CASCADE' })
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
