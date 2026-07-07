import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('resource_moderation')
@Index(['status'])
export class ResourceModeration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ nullable: true, name: 'moderator_id' })
  moderatorId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'simple-json', nullable: true, name: 'scan_results' })
  scanResults: Record<string, any>;

  @Column({ default: false, name: 'virus_scan_passed' })
  virusScanPassed: boolean;

  @Column({ nullable: true, name: 'moderation_note' })
  moderationNote: string;

  @Column({ nullable: true, type: 'timestamp', name: 'reviewed_at' })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
