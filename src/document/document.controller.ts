import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { TemplateService } from '../template/template.service';
import { ChannelManagerService } from '../channel-manager/channel-manager.service';
import type {
  ChannelContactInfo,
  FallbackChannel,
} from '../channel-manager/channel-manager.types';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly templateService: TemplateService,
    private readonly channelManagerService: ChannelManagerService,
  ) {}

  // Génère un lien sécurisé pour un document et envoie la notification "document disponible"
  // via le canal préféré du patient, avec bascule automatique si ce canal échoue.
  @Post('notify')
  async notifyDocumentAvailable(
    @Body()
    body: {
      userId: string;
      documentName: string;
      fileUrl: string;
      preferredChannel: FallbackChannel;
      contactInfo: ChannelContactInfo;
      variables?: Record<string, string>; // ex: { patientName, cabinetName }
      expiresInHours?: number;
    },
  ) {
    const secureLink = await this.documentService.createSecureLink(
      body.userId,
      body.documentName,
      body.fileUrl,
      body.expiresInHours,
    );

    const rendered = await this.templateService.render('document_available', {
      ...(body.variables ?? {}),
      documentName: body.documentName,
      documentLink: secureLink.publicUrl,
    });

    // Le canal préféré du patient est tenté en premier ; le ChannelManager bascule
    // automatiquement sur les autres canaux disponibles si celui-ci échoue.
    const channelPriority: FallbackChannel[] = [
      body.preferredChannel,
      ...(
        ['whatsapp', 'sms', 'email', 'messenger'] as FallbackChannel[]
      ).filter((c) => c !== body.preferredChannel),
    ];

    const sendResult = await this.channelManagerService.sendWithFallback({
      userId: body.userId,
      message: rendered.message,
      subject: rendered.subject,
      contactInfo: body.contactInfo,
      channelPriority,
    });

    return {
      ...sendResult,
      secureLink: {
        url: secureLink.publicUrl,
        expiresAt: secureLink.expiresAt,
      },
    };
  }

  // Point d'accès public que le patient ouvre depuis la notification reçue.
  // Valide le jeton puis redirige vers le document réel si le lien est encore valide.
  @Get('access/:token')
  async accessDocument(@Param('token') token: string, @Res() res: Response) {
    const result = await this.documentService.resolveToken(token);

    if (result.status === 'not_found') {
      return res
        .status(HttpStatus.NOT_FOUND)
        .send('Lien invalide ou introuvable.');
    }

    if (result.status === 'expired') {
      return res
        .status(HttpStatus.GONE)
        .send(
          'Ce lien a expiré. Merci de contacter le cabinet pour en obtenir un nouveau.',
        );
    }

    return res.redirect(HttpStatus.FOUND, result.document.fileUrl);
  }
}
