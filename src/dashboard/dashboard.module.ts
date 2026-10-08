import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [NotificationModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
