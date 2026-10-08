import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Qui a envoyé le message : patient, secrétaire humaine ou l'IA
export type ChatSenderType = 'patient' | 'secretary' | 'ai';

@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // Identifie la conversation (ex: id du patient, ou id de session de chat)
  @Column()
  conversationId!: string;

  // Identifiant de l'auteur du message (userId patient, id secrétaire, ou 'ai')
  @Column()
  senderId!: string;

  @Column({ default: 'patient' })
  senderType!: ChatSenderType;

  @Column('text')
  message!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
