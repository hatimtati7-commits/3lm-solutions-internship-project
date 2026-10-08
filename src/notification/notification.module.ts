import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationEntity } from './notification.entity'; // Smiya s-s7iha
import { TwilioModule } from '../twilio/twilio.module';
import { EmailModule } from '../email/email.module';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]), // Smiya s-s7iha hna tani
    TwilioModule,
    EmailModule,
    MessengerModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
