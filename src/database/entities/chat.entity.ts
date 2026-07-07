import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';
import { Group } from './group.entity';

export enum ChatType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ChatType, default: ChatType.DIRECT })
  type: ChatType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_one_id' })
  userOne: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_two_id' })
  userTwo: User;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ nullable: true, name: 'last_message_preview' })
  lastMessagePreview: string;

  @Column({ nullable: true, type: 'timestamp', name: 'last_message_at' })
  lastMessageAt: Date;

  @Column({ nullable: true, name: 'encryption_key' })
  encryptionKey: string;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
