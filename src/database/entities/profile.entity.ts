import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true, length: 500 })
  bio: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ nullable: true, name: 'cover_url' })
  coverUrl: string;

  @Column({ nullable: true, length: 255, name: 'display_name' })
  displayName: string;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[];

  @Column({ type: 'simple-json', nullable: true, name: 'education' })
  education: { institution: string; degree: string; field: string; startYear: number; endYear?: number }[];

  @Column({ type: 'simple-json', nullable: true, name: 'social_links' })
  socialLinks: { platform: string; url: string }[];

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ default: 0, name: 'follower_count' })
  followerCount: number;

  @Column({ default: 0, name: 'following_count' })
  followingCount: number;

  @Column({ default: 0, name: 'resource_count' })
  resourceCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
