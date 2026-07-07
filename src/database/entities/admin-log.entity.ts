import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('admin_logs')
@Index(['adminId', 'action'])
@Index(['createdAt'])
export class AdminLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id' })
  adminId: string;

  @Column()
  action: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @Column({ nullable: true, name: 'target_user_id' })
  targetUserId: string;

  @Column({ type: 'text', nullable: true, name: 'details' })
  details: string;

  @Column({ type: 'simple-json', nullable: true, name: 'metadata' })
  metadata: Record<string, any>;

  @Column({ nullable: true, name: 'ip_address' })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
