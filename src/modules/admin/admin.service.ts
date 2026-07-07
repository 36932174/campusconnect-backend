import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AccountStatus } from '../../database/entities/user.entity';
import { AdminLog } from '../../database/entities/admin-log.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Report, ReportStatus } from '../../database/entities/report.entity';
import { AuditService } from '../../security/audit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AdminLog)
    private readonly adminLogRepository: Repository<AdminLog>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly auditService: AuditService,
  ) {}

  async getUsers(page = 1, limit = 20, filters?: { role?: string; status?: string; search?: string }) {
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (filters?.role) query.andWhere('user.role = :role', { role: filters.role });
    if (filters?.status) query.andWhere('user.status = :status', { status: filters.status });
    if (filters?.search) {
      query.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR profile.displayName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.skip((page - 1) * limit).take(limit).orderBy('user.createdAt', 'DESC');

    const [users, total] = await query.getManyAndCount();
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'sessions'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(adminId: string, targetUserId: string, role: UserRole) {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (admin.role !== UserRole.SUPER_ADMIN && role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can assign super admin role');
    }

    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    user.role = role;
    await this.userRepository.save(user);

    await this.logAdminAction(adminId, 'UPDATE_ROLE', 'user', targetUserId, { newRole: role });
    return { message: `User role updated to ${role}` };
  }

  async updateUserStatus(adminId: string, targetUserId: string, status: AccountStatus, reason?: string) {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    user.status = status;
    await this.userRepository.save(user);

    await this.logAdminAction(adminId, `USER_${status.toUpperCase()}`, 'user', targetUserId, { reason });
    return { message: `User ${status}` };
  }

  async getAnalytics() {
    const [totalUsers, activeUsers, bannedUsers, pendingVerification] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: AccountStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: AccountStatus.BANNED } }),
      this.userRepository.count({ where: { status: AccountStatus.PENDING_VERIFICATION } }),
    ]);

    const recentRegistrations = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE(user.createdAt) as date, COUNT(*) as count")
      .where("user.createdAt >= NOW() - INTERVAL '7 days'")
      .groupBy("DATE(user.createdAt)")
      .orderBy("date", "DESC")
      .getRawMany();

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      pendingVerification,
      recentRegistrations,
    };
  }

  async getReports(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [reports, total] = await this.reportRepository.findAndCount({
      where,
      relations: ['reporter'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { reports, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async resolveReport(adminId: string, reportId: string, status: ReportStatus, note?: string) {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = status;
    report.moderatorId = adminId;
    report.resolutionNote = note;
    await this.reportRepository.save(report);

    return { message: `Report ${status}` };
  }

  async getAuditLogs(page = 1, limit = 50, filters?: { userId?: string; action?: string; severity?: string }) {
    const query = this.auditLogRepository.createQueryBuilder('log');

    if (filters?.userId) query.andWhere('log.userId = :userId', { userId: filters.userId });
    if (filters?.action) query.andWhere('log.action = :action', { action: filters.action });
    if (filters?.severity) query.andWhere('log.severity = :severity', { severity: filters.severity });

    query.skip((page - 1) * limit).take(limit).orderBy('log.timestamp', 'DESC');

    const [logs, total] = await query.getManyAndCount();
    return { logs, total, page, limit };
  }

  async getAdminLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await this.adminLogRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { logs, total, page, limit };
  }

  private async logAdminAction(adminId: string, action: string, entityType: string, entityId?: string, metadata?: any) {
    const log = this.adminLogRepository.create({ adminId, action, entityType, entityId, metadata });
    await this.adminLogRepository.save(log);

    await this.auditService.log({
      action: `ADMIN_${action}`,
      entityType,
      entityId,
      userId: adminId,
      metadata,
      severity: 'warning',
    });
  }
}
