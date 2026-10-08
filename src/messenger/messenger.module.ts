import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessengerService } from './messenger.service';
import { MessengerController } from './messenger.controller';
import { IncomingMessengerMessageEntity } from './incoming-messenger-message.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([IncomingMessengerMessageEntity]),
  ],
  controllers: [MessengerController],
  providers: [MessengerService],
  exports: [MessengerService],
})
export class MessengerModule {}
