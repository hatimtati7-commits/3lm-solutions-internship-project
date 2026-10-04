import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('incoming_messenger_messages')
export class IncomingMessengerMessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // PSID (Page-Scoped ID) de l'expéditeur
  @Column()
  senderId!: string;

  @Column('text')
  message!: string;

  @CreateDateColumn()
  receivedAt!: Date;
}
