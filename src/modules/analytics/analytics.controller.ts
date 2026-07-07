import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboard(userId);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getUserStats(userId);
  }
}
