import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity, ChatSenderType } from './chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly chatMessageRepository: Repository<ChatMessageEntity>,
  ) {}

  async saveMessage(
    conversationId: string,
    senderId: string,
    senderType: ChatSenderType,
    message: string,
  ): Promise<ChatMessageEntity> {
    const newMessage = this.chatMessageRepository.create({
      conversationId,
      senderId,
      senderType,
      message,
    });

    return this.chatMessageRepository.save(newMessage);
  }

  // Récupère l'historique d'une conversation, du plus ancien au plus récent
  async getConversationHistory(
    conversationId: string,
  ): Promise<ChatMessageEntity[]> {
    return this.chatMessageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }
}
