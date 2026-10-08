import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReminderChannel, ReminderJobData } from './reminder-job.types';

export const NOTIFICATIONS_QUEUE = 'notifications-queue';

// Délais standards définis par le CDC : rappel la veille (J-1) et 2h avant (H-2)
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export interface ScheduleAppointmentParams {
  appointmentId: string;
  appointmentDateTime: Date;
  userId: string;
  channel: ReminderChannel;
  to: string;
  subject?: string;
  confirmationMessage: string;
  reminderJ1Message: string;
  reminderH2Message: string;
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
  ) {}

  // Construit un jobId stable pour pouvoir annuler/retrouver un job précis plus tard
  private buildJobId(appointmentId: string, type: string): string {
    return `${appointmentId}-${type}`;
  }

  // Planifie la confirmation immédiate + les rappels J-1 et H-2 pour un rendez-vous
  async scheduleAppointmentNotifications(params: ScheduleAppointmentParams) {
    const {
      appointmentId,
      appointmentDateTime,
      userId,
      channel,
      to,
      subject,
      confirmationMessage,
      reminderJ1Message,
      reminderH2Message,
    } = params;

    const now = Date.now();
    const appointmentTime = appointmentDateTime.getTime();

    const jobs: { type: string; delay: number; message: string }[] = [
      { type: 'confirmation', delay: 0, message: confirmationMessage },
      {
        type: 'reminder_j1',
        delay: appointmentTime - ONE_DAY_MS - now,
        message: reminderJ1Message,
      },
      {
        type: 'reminder_h2',
        delay: appointmentTime - TWO_HOURS_MS - now,
        message: reminderH2Message,
      },
    ];

    const scheduled: string[] = [];

    for (const job of jobs) {
      // On ignore les rappels dont l'heure de déclenchement est déjà passée
      if (job.delay < 0) {
        this.logger.warn(
          `Rappel ${job.type} ignoré pour ${appointmentId} (heure déjà passée)`,
        );
        continue;
      }

      const jobData: ReminderJobData = {
        userId,
        channel,
        to,
        message: job.message,
        subject,
        notificationType: job.type as ReminderJobData['notificationType'],
      };

      await this.notificationsQueue.add(job.type, jobData, {
        delay: job.delay,
        jobId: this.buildJobId(appointmentId, job.type),
        removeOnComplete: true,
        removeOnFail: false,
      });

      scheduled.push(job.type);
    }

    this.logger.log(
      `Notifications planifiées pour ${appointmentId}: ${scheduled.join(', ')}`,
    );

    return { appointmentId, scheduled };
  }

  // Annule les rappels J-1/H-2 encore en attente pour un rendez-vous (ex: en cas d'annulation)
  async cancelPendingReminders(appointmentId: string) {
    const cancelled: string[] = [];

    for (const type of ['reminder_j1', 'reminder_h2']) {
      const jobId = this.buildJobId(appointmentId, type);
      const job = await this.notificationsQueue.getJob(jobId);

      if (job) {
        await job.remove();
        cancelled.push(type);
      }
    }

    this.logger.log(
      `Rappels annulés pour ${appointmentId}: ${cancelled.join(', ') || 'aucun'}`,
    );

    return { appointmentId, cancelled };
  }

  // Gère un rendez-vous modifié : annule les anciens rappels, notifie immédiatement
  // le changement, puis replanifie J-1/H-2 pour la nouvelle date.
  async modifyAppointmentNotifications(params: {
    appointmentId: string;
    newAppointmentDateTime: Date;
    userId: string;
    channel: ReminderChannel;
    to: string;
    subject?: string;
    modificationMessage: string;
    reminderJ1Message: string;
    reminderH2Message: string;
  }) {
    await this.cancelPendingReminders(params.appointmentId);

    await this.sendImmediateNotification(
      params.userId,
      params.channel,
      params.to,
      params.modificationMessage,
      'modification',
      params.subject,
    );

    const now = Date.now();
    const appointmentTime = params.newAppointmentDateTime.getTime();

    const jobs: { type: string; delay: number; message: string }[] = [
      {
        type: 'reminder_j1',
        delay: appointmentTime - ONE_DAY_MS - now,
        message: params.reminderJ1Message,
      },
      {
        type: 'reminder_h2',
        delay: appointmentTime - TWO_HOURS_MS - now,
        message: params.reminderH2Message,
      },
    ];

    const scheduled: string[] = [];

    for (const job of jobs) {
      if (job.delay < 0) {
        this.logger.warn(
          `Rappel ${job.type} ignoré pour ${params.appointmentId} (nouvelle heure déjà passée)`,
        );
        continue;
      }

      const jobData: ReminderJobData = {
        userId: params.userId,
        channel: params.channel,
        to: params.to,
        message: job.message,
        subject: params.subject,
        notificationType: job.type as ReminderJobData['notificationType'],
      };

      await this.notificationsQueue.add(job.type, jobData, {
        delay: job.delay,
        jobId: this.buildJobId(params.appointmentId, job.type),
        removeOnComplete: true,
        removeOnFail: false,
      });

      scheduled.push(job.type);
    }

    this.logger.log(
      `Rendez-vous ${params.appointmentId} modifié, nouveaux rappels: ${scheduled.join(', ') || 'aucun'}`,
    );

    return { appointmentId: params.appointmentId, scheduled };
  }

  // Envoie une notification immédiate (annulation, modification, document disponible)
  async sendImmediateNotification(
    userId: string,
    channel: ReminderChannel,
    to: string,
    message: string,
    notificationType: ReminderJobData['notificationType'],
    subject?: string,
  ) {
    const jobData: ReminderJobData = {
      userId,
      channel,
      to,
      message,
      subject,
      notificationType,
    };

    await this.notificationsQueue.add(notificationType, jobData, {
      removeOnComplete: true,
      removeOnFail: false,
    });

    return { queued: true, notificationType };
  }
}
