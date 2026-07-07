import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GroupMember } from './group-member.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => GroupMember, (member) => member.group, { cascade: true })
  members: GroupMember[];

  @Column({ default: 0, name: 'member_count' })
  memberCount: number;

  @Column({ nullable: true, name: 'encryption_key' })
  encryptionKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
