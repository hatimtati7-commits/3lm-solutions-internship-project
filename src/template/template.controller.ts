import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import type { ReminderNotificationType } from '../reminder/reminder-job.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Gestion des templates réservée au personnel du cabinet authentifié
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  // Liste tous les templates (un par type de notification)
  @Get()
  async findAll() {
    return this.templateService.findAll();
  }

  // Détail d'un template précis
  @Get(':type')
  async findByType(@Param('type') type: ReminderNotificationType) {
    const template = await this.templateService.findByType(type);
    return template ?? { error: `Aucun template pour le type '${type}'` };
  }

  // Crée ou met à jour le template d'un type (le cabinet personnalise ses messages)
  @Put(':type')
  async upsert(
    @Param('type') type: ReminderNotificationType,
    @Body() body: { subject?: string; bodyTemplate: string },
  ) {
    return this.templateService.upsert(type, body);
  }

  // Aperçu : remplace les {{variables}} sans rien envoyer, pour tester un template avant utilisation
  @Post(':type/preview')
  async preview(
    @Param('type') type: ReminderNotificationType,
    @Body() body: { variables: Record<string, string> },
  ) {
    return this.templateService.render(type, body.variables ?? {});
  }
}
