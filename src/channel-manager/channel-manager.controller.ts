import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelContactInfo, FallbackChannel } from './channel-manager.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('channel-manager')
export class ChannelManagerController {
  constructor(private readonly channelManagerService: ChannelManagerService) {}

  // Envoie une notification en essayant les canaux disponibles dans l'ordre,
  // avec bascule automatique (fallback) si un canal échoue.
  @Post('send-with-fallback')
  async sendWithFallback(
    @Body()
    body: {
      userId: string;
      message: string;
      subject?: string;
      contactInfo: ChannelContactInfo;
      channelPriority?: FallbackChannel[];
    },
  ) {
    return this.channelManagerService.sendWithFallback({
      userId: body.userId,
      message: body.message,
      subject: body.subject,
      contactInfo: body.contactInfo,
      channelPriority: body.channelPriority,
    });
  }
}
