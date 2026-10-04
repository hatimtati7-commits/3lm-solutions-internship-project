import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelManagerController } from './channel-manager.controller';

@Module({
  imports: [NotificationModule],
  controllers: [ChannelManagerController],
  providers: [ChannelManagerService],
  exports: [ChannelManagerService],
})
export class ChannelManagerModule {}
