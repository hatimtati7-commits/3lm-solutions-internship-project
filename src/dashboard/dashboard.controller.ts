import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import type {
  NotificationChannel,
  NotificationStatus,
} from '../notification/notification.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Le tableau de bord contient l'historique complet des notifications :
// réservé au personnel du cabinet authentifié via le Core (token JWT partagé).
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly notificationService: NotificationService) {}

  // Liste paginée + filtrée des notifications, pour le tableau de bord admin
  @Get('notifications')
  async listNotifications(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('userId') userId?: string,
    @Query('status') status?: NotificationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.findNotifications({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      channel,
      userId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Détail d'une notification précise
  @Get('notifications/:id')
  async getNotification(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notificationService.findById(id);
    return notification ?? { error: 'Notification introuvable' };
  }

  // Relance l'envoi d'une notification (même canal, même destinataire, même message)
  @Post('notifications/:id/retry')
  async retryNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.retryNotification(id);
  }

  // Statistiques par canal : volume, taux de réussite (pour le monitoring)
  @Get('stats')
  async getStats() {
    return this.notificationService.getChannelStats();
  }
}
