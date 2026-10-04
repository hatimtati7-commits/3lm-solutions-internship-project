import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type NotificationStatus = 'saved' | 'sent' | 'failed';
export type NotificationChannel =
  'internal' | 'sms' | 'whatsapp' | 'email' | 'messenger';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column('text')
  message!: string;

  // Numéro de téléphone destinataire (rempli seulement si envoyé via SMS/WhatsApp)
  @Column({ nullable: true })
  phoneNumber?: string;

  // Adresse email destinataire (rempli seulement si envoyé via Email)
  @Column({ nullable: true })
  emailAddress?: string;

  // Page-Scoped ID Messenger du destinataire (rempli seulement si envoyé via Messenger)
  @Column({ nullable: true })
  messengerPsid?: string;

  // Canal utilisé pour cette notification
  @Column({ default: 'internal' })
  channel!: NotificationChannel;

  // 'saved' = juste enregistrée, 'sent' = message envoyé avec succès, 'failed' = échec fournisseur
  @Column({ default: 'saved' })
  status!: NotificationStatus;

  // Identifiant retourné par le fournisseur (SID Twilio ou message-id SendGrid), utile pour le suivi/debug
  @Column({ nullable: true })
  providerMessageId?: string;

  // Message d'erreur exact renvoyé par le fournisseur en cas d'échec (affiché dans le tableau de bord)
  @Column('text', { nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
