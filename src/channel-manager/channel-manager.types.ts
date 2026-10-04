import { NotificationChannel } from '../notification/notification.entity';

// Les canaux gérés par le fallback automatique (on exclut 'internal', qui n'a pas de destinataire externe)
export type FallbackChannel = Extract<
  NotificationChannel,
  'sms' | 'whatsapp' | 'email' | 'messenger'
>;

// Coordonnées du patient, canal par canal. Un champ vide = ce canal est ignoré (pas de fallback dessus).
export interface ChannelContactInfo {
  phoneNumber?: string; // utilisé pour sms ET whatsapp
  emailAddress?: string;
  messengerPsid?: string;
}

export interface SendWithFallbackParams {
  userId: string;
  message: string;
  subject?: string; // utilisé uniquement si le fallback finit par utiliser l'email
  contactInfo: ChannelContactInfo;
  // Ordre de préférence des canaux à essayer. Par défaut: whatsapp -> sms -> email -> messenger
  channelPriority?: FallbackChannel[];
}

export interface ChannelAttempt {
  channel: FallbackChannel;
  success: boolean;
  error?: string;
}

export interface SendWithFallbackResult {
  success: boolean;
  channelUsed?: FallbackChannel;
  attempts: ChannelAttempt[];
  data?: unknown;
}
