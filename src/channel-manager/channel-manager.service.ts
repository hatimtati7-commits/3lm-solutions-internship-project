import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import {
  ChannelAttempt,
  FallbackChannel,
  SendWithFallbackParams,
  SendWithFallbackResult,
} from './channel-manager.types';

// Ordre par défaut si le cabinet/patient n'a pas de préférence explicite :
// WhatsApp d'abord (riche, peu coûteux), puis SMS (fiable), puis Email, puis Messenger
const DEFAULT_CHANNEL_PRIORITY: FallbackChannel[] = [
  'whatsapp',
  'sms',
  'email',
  'messenger',
];

@Injectable()
export class ChannelManagerService {
  private readonly logger = new Logger(ChannelManagerService.name);

  constructor(private readonly notificationService: NotificationService) {}

  // Vérifie qu'on a bien les coordonnées nécessaires pour tenter ce canal
  private hasContactInfoFor(
    channel: FallbackChannel,
    contactInfo: SendWithFallbackParams['contactInfo'],
  ): boolean {
    switch (channel) {
      case 'sms':
      case 'whatsapp':
        return Boolean(contactInfo.phoneNumber);
      case 'email':
        return Boolean(contactInfo.emailAddress);
      case 'messenger':
        return Boolean(contactInfo.messengerPsid);
      default:
        return false;
    }
  }

  private async sendViaChannel(
    channel: FallbackChannel,
    params: SendWithFallbackParams,
  ) {
    const { userId, message, subject, contactInfo } = params;

    switch (channel) {
      case 'sms':
        return this.notificationService.sendSmsNotification(
          userId,
          message,
          contactInfo.phoneNumber!,
        );
      case 'whatsapp':
        return this.notificationService.sendWhatsappNotification(
          userId,
          message,
          contactInfo.phoneNumber!,
        );
      case 'email':
        return this.notificationService.sendEmailNotification(
          userId,
          message,
          contactInfo.emailAddress!,
          subject,
        );
      case 'messenger':
        return this.notificationService.sendMessengerNotification(
          userId,
          message,
          contactInfo.messengerPsid!,
        );
    }
  }

  // Essaie chaque canal dans l'ordre de priorité, s'arrête au premier succès.
  // Si un canal échoue (ex: WhatsApp indisponible), bascule automatiquement sur le suivant.
  async sendWithFallback(
    params: SendWithFallbackParams,
  ): Promise<SendWithFallbackResult> {
    const priority = params.channelPriority ?? DEFAULT_CHANNEL_PRIORITY;
    const attempts: ChannelAttempt[] = [];

    // On ne tente que les canaux pour lesquels on a réellement des coordonnées
    const candidateChannels = priority.filter((channel) =>
      this.hasContactInfoFor(channel, params.contactInfo),
    );

    if (candidateChannels.length === 0) {
      this.logger.warn(
        `Aucun canal disponible pour l'utilisateur ${params.userId} (coordonnées manquantes)`,
      );
      return { success: false, attempts: [] };
    }

    for (const channel of candidateChannels) {
      try {
        const result = await this.sendViaChannel(channel, params);

        if (result.success) {
          attempts.push({ channel, success: true });
          this.logger.log(
            `Notification envoyée via ${channel} pour ${params.userId} (après ${attempts.length - 1} échec(s))`,
          );
          return {
            success: true,
            channelUsed: channel,
            attempts,
            data: result.data,
          };
        }

        attempts.push({ channel, success: false, error: result.message });
        this.logger.warn(
          `Échec sur le canal ${channel} pour ${params.userId}, tentative du canal suivant...`,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        attempts.push({ channel, success: false, error: errorMessage });
        this.logger.error(
          `Exception sur le canal ${channel} pour ${params.userId}: ${errorMessage}`,
        );
      }
    }

    this.logger.error(
      `Tous les canaux ont échoué pour ${params.userId}: ${candidateChannels.join(', ')}`,
    );

    return { success: false, attempts };
  }
}
