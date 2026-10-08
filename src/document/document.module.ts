import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentLinkEntity } from './document-link.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { TemplateModule } from '../template/template.module';
import { ChannelManagerModule } from '../channel-manager/channel-manager.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentLinkEntity]),
    TemplateModule,
    ChannelManagerModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
