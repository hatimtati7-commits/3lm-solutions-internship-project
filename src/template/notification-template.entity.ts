import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import type { ReminderNotificationType } from '../reminder/reminder-job.types';

@Entity('notification_templates')
export class NotificationTemplateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // Un seul template actif par type de notification (confirmation, reminder_j1, ...)
  @Column({ unique: true })
  type!: ReminderNotificationType;

  // Utilisé uniquement pour le canal email ; peut contenir des variables {{...}}
  @Column({ nullable: true })
  subject?: string;

  // Corps du message, avec des variables du type {{patientName}}, {{appointmentDate}}, etc.
  @Column('text')
  bodyTemplate!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
