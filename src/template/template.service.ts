import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplateEntity } from './notification-template.entity';
import { ReminderNotificationType } from '../reminder/reminder-job.types';

// Templates par défaut du cabinet, utilisés tant que personne ne les a personnalisés.
// Syntaxe des variables: {{nomDeLaVariable}}
const DEFAULT_TEMPLATES: Record<
  ReminderNotificationType,
  { subject?: string; bodyTemplate: string }
> = {
  confirmation: {
    subject: 'Confirmation de votre rendez-vous',
    bodyTemplate:
      'Bonjour {{patientName}}, votre rendez-vous au {{cabinetName}} est confirmé pour le {{appointmentDate}} à {{appointmentTime}}.',
  },
  reminder_j1: {
    subject: 'Rappel : rendez-vous demain',
    bodyTemplate:
      'Bonjour {{patientName}}, petit rappel : vous avez rendez-vous demain {{appointmentDate}} à {{appointmentTime}} au {{cabinetName}}.',
  },
  reminder_h2: {
    subject: 'Rappel : rendez-vous dans 2 heures',
    bodyTemplate:
      'Bonjour {{patientName}}, votre rendez-vous au {{cabinetName}} est dans 2 heures, à {{appointmentTime}}.',
  },
  cancellation: {
    subject: 'Annulation de votre rendez-vous',
    bodyTemplate:
      'Bonjour {{patientName}}, votre rendez-vous du {{appointmentDate}} à {{appointmentTime}} au {{cabinetName}} a été annulé. Contactez-nous pour en reprogrammer un.',
  },
  modification: {
    subject: 'Modification de votre rendez-vous',
    bodyTemplate:
      'Bonjour {{patientName}}, votre rendez-vous a été modifié. Nouvelle date : {{appointmentDate}} à {{appointmentTime}} au {{cabinetName}}.',
  },
  document_available: {
    subject: 'Un nouveau document est disponible',
    bodyTemplate:
      'Bonjour {{patientName}}, un document ({{documentName}}) est disponible. Consultez-le ici : {{documentLink}}',
  },
};

@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepository: Repository<NotificationTemplateEntity>,
  ) {}

  // Au démarrage, on s'assure que chaque type de notification a un template en base
  // (on ne touche jamais à un template déjà personnalisé par le cabinet)
  async onModuleInit() {
    for (const type of Object.keys(
      DEFAULT_TEMPLATES,
    ) as ReminderNotificationType[]) {
      const existing = await this.templateRepository.findOne({
        where: { type },
      });

      if (!existing) {
        const defaults = DEFAULT_TEMPLATES[type];
        await this.templateRepository.save(
          this.templateRepository.create({
            type,
            subject: defaults.subject,
            bodyTemplate: defaults.bodyTemplate,
          }),
        );
        this.logger.log(`Template par défaut créé pour '${type}'`);
      }
    }
  }

  async findAll(): Promise<NotificationTemplateEntity[]> {
    return this.templateRepository.find({ order: { type: 'ASC' } });
  }

  async findByType(
    type: ReminderNotificationType,
  ): Promise<NotificationTemplateEntity | null> {
    return this.templateRepository.findOne({ where: { type } });
  }

  // Crée ou met à jour le template d'un type donné (le cabinet personnalise ses messages)
  async upsert(
    type: ReminderNotificationType,
    data: { subject?: string; bodyTemplate: string },
  ): Promise<NotificationTemplateEntity> {
    const existing = await this.findByType(type);

    if (existing) {
      existing.subject = data.subject;
      existing.bodyTemplate = data.bodyTemplate;
      return this.templateRepository.save(existing);
    }

    return this.templateRepository.save(
      this.templateRepository.create({
        type,
        subject: data.subject,
        bodyTemplate: data.bodyTemplate,
      }),
    );
  }

  // Remplace les {{variables}} par leurs valeurs réelles dans un texte donné
  private interpolate(text: string, variables: Record<string, string>): string {
    return text.replace(/{{\s*([\w.]+)\s*}}/g, (match, key: string) => {
      return Object.prototype.hasOwnProperty.call(variables, key)
        ? variables[key]
        : match; // si la variable n'est pas fournie, on laisse le placeholder tel quel
    });
  }

  // Récupère le template du type demandé et l'interpole avec les variables fournies
  async render(
    type: ReminderNotificationType,
    variables: Record<string, string>,
  ): Promise<{ subject?: string; message: string }> {
    const template = await this.findByType(type);

    if (!template) {
      throw new Error(`Aucun template trouvé pour le type '${type}'`);
    }

    return {
      subject: template.subject
        ? this.interpolate(template.subject, variables)
        : undefined,
      message: this.interpolate(template.bodyTemplate, variables),
    };
  }
}
