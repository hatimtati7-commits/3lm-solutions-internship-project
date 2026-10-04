import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationModule } from '../notification/notification.module';
import { TemplateModule } from '../template/template.module';
import { ReminderService, NOTIFICATIONS_QUEUE } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { ReminderController } from './reminder.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    NotificationModule,
    TemplateModule,
  ],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderProcessor],
  exports: [ReminderService],
})
export class ReminderModule {}
