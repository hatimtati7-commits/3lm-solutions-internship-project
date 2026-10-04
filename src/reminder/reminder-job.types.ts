// Types de notifications planifiées gérées par la file BullMQ
export type ReminderNotificationType =
  | 'confirmation'
  | 'reminder_j1'
  | 'reminder_h2'
  | 'cancellation'
  | 'modification'
  | 'document_available';

export type ReminderChannel = 'sms' | 'whatsapp' | 'email';

export interface ReminderJobData {
  userId: string;
  channel: ReminderChannel;
  to: string; // numéro de téléphone ou adresse email selon le canal
  message: string;
  subject?: string; // utilisé seulement pour le canal email
  notificationType: ReminderNotificationType;
}
