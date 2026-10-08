import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageEntity } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageEntity])],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
