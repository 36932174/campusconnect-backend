import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../database/entities/user.entity';
import { AdminLog } from '../../database/entities/admin-log.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Report } from '../../database/entities/report.entity';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, AdminLog, AuditLog, Report]), SecurityModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
