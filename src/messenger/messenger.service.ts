import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface MessengerSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly pageAccessToken: string;
  private readonly graphApiVersion = 'v19.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.pageAccessToken = this.configService.get<string>(
      'MESSENGER_PAGE_ACCESS_TOKEN',
    )!;
  }

  // recipientPsid = "Page-Scoped ID" du destinataire, obtenu quand un utilisateur écrit à la Page
  async sendMessage(
    recipientPsid: string,
    message: string,
  ): Promise<MessengerSendResult> {
    const url = `https://graph.facebook.com/${this.graphApiVersion}/me/messages`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ message_id?: string }>(
          url,
          {
            recipient: { id: recipientPsid },
            message: { text: message },
            messaging_type: 'MESSAGE_TAG',
            tag: 'CONFIRMED_EVENT_UPDATE', // Tag autorisant l'envoi hors fenêtre de 24h pour les notifs de RDV
          },
          { params: { access_token: this.pageAccessToken } },
        ),
      );

      return { success: true, messageId: response.data.message_id };
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const message =
        axiosError.response?.data?.error?.message ||
        axiosError.message ||
        'Erreur Messenger inconnue';

      this.logger.error(
        `Échec envoi Messenger vers ${recipientPsid}: ${message}`,
      );

      return { success: false, error: message };
    }
  }
}
