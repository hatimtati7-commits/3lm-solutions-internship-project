import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')!;
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL')!;

    sgMail.setApiKey(apiKey);
  }

  // subject optionnel : si absent on prend un sujet par défaut selon le contexte notification
  async sendEmail(
    to: string,
    message: string,
    subject: string = 'Notification',
  ): Promise<EmailSendResult> {
    try {
      const [response] = await sgMail.send({
        to,
        from: this.fromEmail,
        subject,
        text: message,
        html: `<p>${message}</p>`,
      });

      // SendGrid renvoie l'ID du message dans le header x-message-id
      const headers = response.headers as Record<string, string>;
      const messageId = headers['x-message-id'];

      return { success: true, messageId };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erreur SendGrid inconnue';
      return { success: false, error: message };
    }
  }
}
