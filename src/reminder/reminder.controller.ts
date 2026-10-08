import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderChannel } from './reminder-job.types';
import { TemplateService } from '../template/template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Planification/annulation de notifications : réservé aux utilisateurs/services authentifiés via le Core
@UseGuards(JwtAuthGuard)
@Controller('reminder')
export class ReminderController {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly templateService: TemplateService,
  ) {}

  // Planifie confirmation immédiate + rappels J-1 et H-2 pour un rendez-vous
  @Post('schedule-appointment')
  async scheduleAppointment(
    @Body()
    body: {
      appointmentId: string;
      appointmentDateTime: string; // ISO 8601, ex: "2026-08-15T10:00:00.000Z"
      userId: string;
      channel: ReminderChannel;
      to: string;
      subject?: string;
      confirmationMessage: string;
      reminderJ1Message: string;
      reminderH2Message: string;
    },
  ) {
    return this.reminderService.scheduleAppointmentNotifications({
      appointmentId: body.appointmentId,
      appointmentDateTime: new Date(body.appointmentDateTime),
      userId: body.userId,
      channel: body.channel,
      to: body.to,
      subject: body.subject,
      confirmationMessage: body.confirmationMessage,
      reminderJ1Message: body.reminderJ1Message,
      reminderH2Message: body.reminderH2Message,
    });
  }

  // Idem, mais à partir des templates enregistrés + variables (pas besoin d'écrire les messages à la main)
  @Post('schedule-appointment-from-template')
  async scheduleAppointmentFromTemplate(
    @Body()
    body: {
      appointmentId: string;
      appointmentDateTime: string;
      userId: string;
      channel: ReminderChannel;
      to: string;
      variables: Record<string, string>; // ex: { patientName, cabinetName, appointmentDate, appointmentTime }
    },
  ) {
    const [confirmation, reminderJ1, reminderH2] = await Promise.all([
      this.templateService.render('confirmation', body.variables),
      this.templateService.render('reminder_j1', body.variables),
      this.templateService.render('reminder_h2', body.variables),
    ]);

    return this.reminderService.scheduleAppointmentNotifications({
      appointmentId: body.appointmentId,
      appointmentDateTime: new Date(body.appointmentDateTime),
      userId: body.userId,
      channel: body.channel,
      to: body.to,
      subject: confirmation.subject,
      confirmationMessage: confirmation.message,
      reminderJ1Message: reminderJ1.message,
      reminderH2Message: reminderH2.message,
    });
  }

  // Rendez-vous modifié : annule les anciens rappels, notifie le changement,
  // et replanifie J-1/H-2 pour la nouvelle date, via les templates enregistrés.
  @Post('modify-appointment-from-template')
  async modifyAppointmentFromTemplate(
    @Body()
    body: {
      appointmentId: string;
      newAppointmentDateTime: string;
      userId: string;
      channel: ReminderChannel;
      to: string;
      variables: Record<string, string>;
    },
  ) {
    const [modification, reminderJ1, reminderH2] = await Promise.all([
      this.templateService.render('modification', body.variables),
      this.templateService.render('reminder_j1', body.variables),
      this.templateService.render('reminder_h2', body.variables),
    ]);

    return this.reminderService.modifyAppointmentNotifications({
      appointmentId: body.appointmentId,
      newAppointmentDateTime: new Date(body.newAppointmentDateTime),
      userId: body.userId,
      channel: body.channel,
      to: body.to,
      subject: modification.subject,
      modificationMessage: modification.message,
      reminderJ1Message: reminderJ1.message,
      reminderH2Message: reminderH2.message,
    });
  }

  // Annule les rappels J-1/H-2 en attente (ex: rendez-vous annulé) et notifie immédiatement
  @Post('cancel-appointment')
  async cancelAppointment(
    @Body()
    body: {
      appointmentId: string;
      userId: string;
      channel: ReminderChannel;
      to: string;
      cancellationMessage: string;
      subject?: string;
    },
  ) {
    const cancelResult = await this.reminderService.cancelPendingReminders(
      body.appointmentId,
    );

    const notifyResult = await this.reminderService.sendImmediateNotification(
      body.userId,
      body.channel,
      body.to,
      body.cancellationMessage,
      'cancellation',
      body.subject,
    );

    return { ...cancelResult, ...notifyResult };
  }

  // Notifie qu'un document (ordonnance, résultat...) est disponible
  @Post('document-available')
  async notifyDocumentAvailable(
    @Body()
    body: {
      userId: string;
      channel: ReminderChannel;
      to: string;
      message: string;
      subject?: string;
    },
  ) {
    return this.reminderService.sendImmediateNotification(
      body.userId,
      body.channel,
      body.to,
      body.message,
      'document_available',
      body.subject,
    );
  }
}
