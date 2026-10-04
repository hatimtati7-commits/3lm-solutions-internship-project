import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface TwilioSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

@Injectable()
export class TwilioService {
  private client: Twilio;
  private twilioPhoneNumber: string;
  private twilioWhatsappNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')!;
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')!;
    this.twilioPhoneNumber = this.configService.get<string>(
      'TWILIO_PHONE_NUMBER',
    )!;
    // Numéro WhatsApp Twilio (sandbox ou numéro validé WhatsApp Business)
    this.twilioWhatsappNumber = this.configService.get<string>(
      'TWILIO_WHATSAPP_NUMBER',
    )!;

    // Initialiser Twilio client b tariqa s-s7iha
    this.client = new Twilio(accountSid, authToken);
  }

  async sendSms(to: string, message: string): Promise<TwilioSendResult> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to,
      });
      return { success: true, sid: result.sid };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erreur Twilio inconnue';
      return { success: false, error: message };
    }
  }

  // Twilio exige le préfixe "whatsapp:" sur le from ET le to pour ce canal
  async sendWhatsapp(to: string, message: string): Promise<TwilioSendResult> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.twilioWhatsappNumber}`,
        to: `whatsapp:${to}`,
      });
      return { success: true, sid: result.sid };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erreur Twilio inconnue';
      return { success: false, error: message };
    }
  }
}
