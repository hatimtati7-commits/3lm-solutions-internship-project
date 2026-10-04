import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from '../notification/notification.service';
import { ReminderJobData } from './reminder-job.types';
import { NOTIFICATIONS_QUEUE } from './reminder.service';

@Processor(NOTIFICATIONS_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<ReminderJobData>) {
    const { channel, userId, to, message, subject, notificationType } =
      job.data;

    this.logger.log(
      `Traitement du job ${job.id} (${notificationType} / ${channel})`,
    );

    switch (channel) {
      case 'sms':
        return this.notificationService.sendSmsNotification(
          userId,
          message,
          to,
        );
      case 'whatsapp':
        return this.notificationService.sendWhatsappNotification(
          userId,
          message,
          to,
        );
      case 'email':
        return this.notificationService.sendEmailNotification(
          userId,
          message,
          to,
          subject,
        );
      default:
        this.logger.error(`Canal inconnu: ${channel as string}`);
        return null;
    }
  }
}
