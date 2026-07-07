import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, AccountStatus } from '../../database/entities/user.entity';
import { ReportStatus } from '../../database/entities/report.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, { role, status, search });
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserRole(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.updateUserRole(adminId, userId, role);
  }

  @Post('users/:id/status')
  async updateUserStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body('status') status: AccountStatus,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateUserStatus(adminId, userId, status, reason);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('reports')
  async getReports(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(page, limit, status);
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @CurrentUser('id') adminId: string,
    @Param('id') reportId: string,
    @Body('status') status: ReportStatus,
    @Body('note') note?: string,
  ) {
    return this.adminService.resolveReport(adminId, reportId, status, note);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('severity') severity?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, { userId, action, severity });
  }

  @Get('admin-logs')
  async getAdminLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAdminLogs(page, limit);
  }
}
