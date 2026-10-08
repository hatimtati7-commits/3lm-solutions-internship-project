import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncomingMessengerMessageEntity } from './incoming-messenger-message.entity';

interface MessengerWebhookEntry {
  messaging?: Array<{
    sender: { id: string };
    message?: { text?: string };
  }>;
}

interface MessengerWebhookBody {
  object: string;
  entry: MessengerWebhookEntry[];
}

@Controller('messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(IncomingMessengerMessageEntity)
    private readonly incomingMessageRepository: Repository<IncomingMessengerMessageEntity>,
  ) {}

  // Meta appelle cet endpoint UNE FOIS, en configuration, pour vérifier que le webhook t'appartient
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expectedToken = this.configService.get<string>(
      'MESSENGER_VERIFY_TOKEN',
    );

    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('Webhook Messenger vérifié avec succès');
      return challenge;
    }

    this.logger.warn('Échec de vérification du webhook Messenger');
    return 'Verification failed';
  }

  // Meta envoie ici chaque message reçu par la Page
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Body() body: MessengerWebhookBody,
  ): Promise<{ status: string }> {
    if (body.object !== 'page') {
      return { status: 'ignored' };
    }

    for (const entry of body.entry) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender.id;
        const text = event.message?.text;

        if (text) {
          // Persisté pour l'audit/monitoring : qui, quand, quel canal, quel contenu
          await this.incomingMessageRepository.save(
            this.incomingMessageRepository.create({
              senderId,
              message: text,
            }),
          );

          this.logger.log(`[Messenger] Message reçu de ${senderId}: ${text}`);
          // TODO: brancher ici la logique de réponse automatique/IA
        }
      }
    }

    return { status: 'ok' };
  }
}
