import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity, NotificationChannel } from './notification.entity';
import { TwilioService } from '../twilio/twilio.service';
import { EmailService } from '../email/email.service';
import { MessengerService } from '../messenger/messenger.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly twilioService: TwilioService,
    private readonly emailService: EmailService,
    private readonly messengerService: MessengerService,
  ) {}

  // Notification simple, juste enregistrée en base (pas d'envoi externe)
  async sendNotification(userId: string, message: string) {
    const newNotification = this.notificationRepository.create({
      userId,
      message,
      channel: 'internal',
      status: 'saved',
    });

    const savedNotification =
      await this.notificationRepository.save(newNotification);

    console.log(`[Notification Saved to Postgres] ID: ${savedNotification.id}`);

    return {
      success: true,
      message: 'Notification envoyée et sauvegardée avec succès !',
      timestamp: savedNotification.createdAt,
      data: savedNotification,
    };
  }

  // Notification envoyée par SMS via Twilio, puis enregistrée avec le résultat
  async sendSmsNotification(
    userId: string,
    message: string,
    phoneNumber: string,
  ) {
    return this.sendViaTwilioChannel('sms', userId, message, phoneNumber);
  }

  // Notification envoyée par WhatsApp via Twilio, puis enregistrée avec le résultat
  async sendWhatsappNotification(
    userId: string,
    message: string,
    phoneNumber: string,
  ) {
    return this.sendViaTwilioChannel('whatsapp', userId, message, phoneNumber);
  }

  // Notification envoyée par Email via SendGrid, puis enregistrée avec le résultat
  async sendEmailNotification(
    userId: string,
    message: string,
    emailAddress: string,
    subject?: string,
  ) {
    const emailResult = await this.emailService.sendEmail(
      emailAddress,
      message,
      subject,
    );

    const newNotification = this.notificationRepository.create({
      userId,
      message,
      emailAddress,
      channel: 'email',
      status: emailResult.success ? 'sent' : 'failed',
      providerMessageId: emailResult.success
        ? emailResult.messageId
        : undefined,
      errorMessage: emailResult.success ? undefined : emailResult.error,
    });

    const savedNotification =
      await this.notificationRepository.save(newNotification);

    console.log(
      `[Notification EMAIL ${savedNotification.status}] ID: ${savedNotification.id}${
        emailResult.success
          ? ` - MessageId: ${emailResult.messageId}`
          : ` - Erreur: ${emailResult.error}`
      }`,
    );

    return {
      success: emailResult.success,
      message: emailResult.success
        ? 'Email envoyé et notification sauvegardée avec succès !'
        : "L'envoi via email a échoué, notification enregistrée avec le statut 'failed'.",
      data: savedNotification,
    };
  }

  // Notification envoyée par Messenger (Facebook Page), puis enregistrée avec le résultat
  async sendMessengerNotification(
    userId: string,
    message: string,
    messengerPsid: string,
  ) {
    const messengerResult = await this.messengerService.sendMessage(
      messengerPsid,
      message,
    );

    const newNotification = this.notificationRepository.create({
      userId,
      message,
      messengerPsid,
      channel: 'messenger',
      status: messengerResult.success ? 'sent' : 'failed',
      providerMessageId: messengerResult.success
        ? messengerResult.messageId
        : undefined,
      errorMessage: messengerResult.success ? undefined : messengerResult.error,
    });

    const savedNotification =
      await this.notificationRepository.save(newNotification);

    console.log(
      `[Notification MESSENGER ${savedNotification.status}] ID: ${savedNotification.id}${
        messengerResult.success
          ? ` - MessageId: ${messengerResult.messageId}`
          : ` - Erreur: ${messengerResult.error}`
      }`,
    );

    return {
      success: messengerResult.success,
      message: messengerResult.success
        ? 'Message Messenger envoyé et notification sauvegardée avec succès !'
        : "L'envoi via Messenger a échoué, notification enregistrée avec le statut 'failed'.",
      data: savedNotification,
    };
  }

  private async sendViaTwilioChannel(
    channel: Extract<NotificationChannel, 'sms' | 'whatsapp'>,
    userId: string,
    message: string,
    phoneNumber: string,
  ) {
    const twilioResult =
      channel === 'whatsapp'
        ? await this.twilioService.sendWhatsapp(phoneNumber, message)
        : await this.twilioService.sendSms(phoneNumber, message);

    const newNotification = this.notificationRepository.create({
      userId,
      message,
      phoneNumber,
      channel,
      status: twilioResult.success ? 'sent' : 'failed',
      providerMessageId: twilioResult.success ? twilioResult.sid : undefined,
      errorMessage: twilioResult.success ? undefined : twilioResult.error,
    });

    const savedNotification =
      await this.notificationRepository.save(newNotification);

    console.log(
      `[Notification ${channel.toUpperCase()} ${savedNotification.status}] ID: ${savedNotification.id}${
        twilioResult.success
          ? ` - SID: ${twilioResult.sid}`
          : ` - Erreur: ${twilioResult.error}`
      }`,
    );

    return {
      success: twilioResult.success,
      message: twilioResult.success
        ? `Message ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} envoyé et notification sauvegardée avec succès !`
        : `L'envoi via ${channel} a échoué, notification enregistrée avec le statut 'failed'.`,
      data: savedNotification,
    };
  }

  // --- Utilisé par le tableau de bord admin ---

  // Liste paginée avec filtres par date, canal, patient (userId) et statut
  async findNotifications(filters: {
    startDate?: Date;
    endDate?: Date;
    channel?: NotificationChannel;
    userId?: string;
    status?: NotificationEntity['status'];
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.startDate) {
      qb.andWhere('notification.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('notification.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }
    if (filters.channel) {
      qb.andWhere('notification.channel = :channel', {
        channel: filters.channel,
      });
    }
    if (filters.userId) {
      qb.andWhere('notification.userId = :userId', { userId: filters.userId });
    }
    if (filters.status) {
      qb.andWhere('notification.status = :status', { status: filters.status });
    }

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Statistiques par canal : total, envoyés, échecs, taux de réussite
  async getChannelStats(): Promise<
    Array<{
      channel: NotificationChannel;
      total: number;
      sent: number;
      failed: number;
      successRate: number;
    }>
  > {
    const rows = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.channel', 'channel')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN notification.status = 'sent' THEN 1 ELSE 0 END)`,
        'sent',
      )
      .addSelect(
        `SUM(CASE WHEN notification.status = 'failed' THEN 1 ELSE 0 END)`,
        'failed',
      )
      .groupBy('notification.channel')
      .getRawMany<{
        channel: NotificationChannel;
        total: string;
        sent: string;
        failed: string;
      }>();

    return rows.map((row) => {
      const total = parseInt(row.total, 10);
      const sent = parseInt(row.sent, 10);
      const failed = parseInt(row.failed, 10);
      const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

      return { channel: row.channel, total, sent, failed, successRate };
    });
  }

  async findById(id: number): Promise<NotificationEntity | null> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  // Renvoie ("retry") une notification échouée en réutilisant le même canal, destinataire et message
  async retryNotification(id: number) {
    const original = await this.findById(id);

    if (!original) {
      return { success: false, message: 'Notification introuvable' };
    }

    switch (original.channel) {
      case 'sms':
        return this.sendSmsNotification(
          original.userId,
          original.message,
          original.phoneNumber!,
        );
      case 'whatsapp':
        return this.sendWhatsappNotification(
          original.userId,
          original.message,
          original.phoneNumber!,
        );
      case 'email':
        return this.sendEmailNotification(
          original.userId,
          original.message,
          original.emailAddress!,
        );
      case 'messenger':
        return this.sendMessengerNotification(
          original.userId,
          original.message,
          original.messengerPsid!,
        );
      default:
        return {
          success: false,
          message: `Le canal '${original.channel}' ne peut pas être renvoyé automatiquement.`,
        };
    }
  }
}
