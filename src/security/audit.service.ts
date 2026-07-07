import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Request } from 'express';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    request?: Request;
    severity?: 'info' | 'warning' | 'critical';
  }): Promise<void> {
    const { action, entityType, entityId, userId, metadata, request, severity = 'info' } = params;

    const log = this.auditLogRepository.create({
      action,
      entityType,
      entityId,
      userId,
      metadata,
      severity,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      timestamp: new Date(),
    });

    try {
      await this.auditLogRepository.save(log);
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }

    if (severity === 'critical') {
      this.logger.warn(`CRITICAL: ${action} on ${entityType} by user ${userId}`);
    }
  }

  async query(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    severity?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('log');
    const { userId, action, entityType, severity, from, to, page = 1, limit = 50 } = filters;

    if (userId) query.andWhere('log.userId = :userId', { userId });
    if (action) query.andWhere('log.action = :action', { action });
    if (entityType) query.andWhere('log.entityType = :entityType', { entityType });
    if (severity) query.andWhere('log.severity = :severity', { severity });
    if (from) query.andWhere('log.timestamp >= :from', { from });
    if (to) query.andWhere('log.timestamp <= :to', { to });

    query.orderBy('log.timestamp', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [logs, total] = await query.getManyAndCount();
    return { logs, total };
  }
}
