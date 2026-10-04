import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Notification simple, juste enregistrée en base (pas de SMS)
  @Post('send')
  async triggerNotification(@Body() body: { userId: string; message: string }) {
    return this.notificationService.sendNotification(body.userId, body.message);
  }

  // Notification envoyée par SMS via Twilio + enregistrée avec son statut
  @Post('send-sms')
  async sendSms(@Body() body: { userId: string; to: string; message: string }) {
    return this.notificationService.sendSmsNotification(
      body.userId,
      body.message,
      body.to,
    );
  }

  // Notification envoyée par WhatsApp via Twilio + enregistrée avec son statut
  @Post('send-whatsapp')
  async sendWhatsapp(
    @Body() body: { userId: string; to: string; message: string },
  ) {
    return this.notificationService.sendWhatsappNotification(
      body.userId,
      body.message,
      body.to,
    );
  }

  // Notification envoyée par Email via SendGrid + enregistrée avec son statut
  @Post('send-email')
  async sendEmail(
    @Body()
    body: {
      userId: string;
      to: string;
      message: string;
      subject?: string;
    },
  ) {
    return this.notificationService.sendEmailNotification(
      body.userId,
      body.message,
      body.to,
      body.subject,
    );
  }

  // Notification envoyée par Messenger (Facebook Page) + enregistrée avec son statut
  @Post('send-messenger')
  async sendMessenger(
    @Body() body: { userId: string; to: string; message: string },
  ) {
    return this.notificationService.sendMessengerNotification(
      body.userId,
      body.message,
      body.to,
    );
  }
}
