import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplateEntity } from './notification-template.entity';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplateEntity])],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
