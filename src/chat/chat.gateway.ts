import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatSenderType } from './chat-message.entity';

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  senderType: ChatSenderType;
  message: string;
}

// CORS ouvert ici pour le dev ; à restreindre au(x) domaine(s) du widget en prod
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`[Chat] Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Chat] Client déconnecté: ${client.id}`);
  }

  // Le client rejoint une "room" correspondant à sa conversation, et reçoit l'historique
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    await client.join(payload.conversationId);

    const history = await this.chatService.getConversationHistory(
      payload.conversationId,
    );

    client.emit('conversationHistory', history);

    console.log(
      `[Chat] Client ${client.id} a rejoint la conversation ${payload.conversationId}`,
    );
  }

  // Réception d'un message : on le sauvegarde puis on le diffuse à tous les membres de la room
  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() payload: SendMessagePayload) {
    const savedMessage = await this.chatService.saveMessage(
      payload.conversationId,
      payload.senderId,
      payload.senderType,
      payload.message,
    );

    this.server.to(payload.conversationId).emit('newMessage', savedMessage);

    console.log(
      `[Chat] Message sauvegardé et diffusé sur ${payload.conversationId} (id: ${savedMessage.id})`,
    );

    return savedMessage;
  }
}
