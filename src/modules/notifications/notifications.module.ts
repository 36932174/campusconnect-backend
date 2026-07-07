import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../database/entities/notification.entity';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), SecurityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
