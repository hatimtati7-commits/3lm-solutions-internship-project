import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 1. Zid had l-import
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { NotificationModule } from './notification/notification.module';
import { TwilioModule } from './twilio/twilio.module';
import { ChatModule } from './chat/chat.module';
import { ReminderModule } from './reminder/reminder.module';
import { ChannelManagerModule } from './channel-manager/channel-manager.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TemplateModule } from './template/template.module';
import { DocumentModule } from './document/document.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 2. Bach y-wlli global f koulchi
    }),
    // Sert les fichiers statiques du dossier public/ (ex: /widget.js) à la racine du serveur
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'Hymm99@', // Le mot de passe dial postgres dyalk
      database: 'notification_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    // Connexion Redis utilisée par BullMQ pour les files d'attente de rappels planifiés
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    NotificationModule,
    TwilioModule,
    ChatModule,
    ReminderModule,
    ChannelManagerModule,
    DashboardModule,
    TemplateModule,
    DocumentModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
