import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DocumentLinkEntity } from './document-link.entity';

export type ResolveResult =
  | { status: 'ok'; document: DocumentLinkEntity }
  | { status: 'not_found' }
  | { status: 'expired' };

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(DocumentLinkEntity)
    private readonly documentLinkRepository: Repository<DocumentLinkEntity>,
    private readonly configService: ConfigService,
  ) {}

  private baseUrl(): string {
    // Utilisé pour construire l'URL publique du lien sécurisé
    return this.configService.get<string>(
      'PUBLIC_BASE_URL',
      'http://localhost:3000',
    );
  }

  // Génère un lien sécurisé, unique et temporaire vers un document
  async createSecureLink(
    userId: string,
    documentName: string,
    fileUrl: string,
    expiresInHours = 72,
  ): Promise<{ token: string; publicUrl: string; expiresAt: Date }> {
    const accessToken = randomBytes(24).toString('hex'); // 48 caractères, imprévisible
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const link = this.documentLinkRepository.create({
      userId,
      documentName,
      fileUrl,
      accessToken,
      expiresAt,
    });

    await this.documentLinkRepository.save(link);

    const publicUrl = `${this.baseUrl()}/documents/access/${accessToken}`;

    this.logger.log(
      `Lien sécurisé créé pour ${userId} (document: ${documentName}, expire le ${expiresAt.toISOString()})`,
    );

    return { token: accessToken, publicUrl, expiresAt };
  }

  // Valide un jeton d'accès et incrémente le compteur de consultations si valide
  async resolveToken(token: string): Promise<ResolveResult> {
    const document = await this.documentLinkRepository.findOne({
      where: { accessToken: token },
    });

    if (!document) {
      return { status: 'not_found' };
    }

    if (document.expiresAt.getTime() < Date.now()) {
      return { status: 'expired' };
    }

    document.accessCount += 1;
    await this.documentLinkRepository.save(document);

    return { status: 'ok', document };
  }
}
