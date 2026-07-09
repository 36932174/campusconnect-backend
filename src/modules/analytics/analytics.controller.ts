import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('public/stats')
  async getPublicStats() {
    return {
      success: true,
      data: await this.analyticsService.getPublicStats(),
    };
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboard(userId);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.analyticsService.getUserStats(userId);
  }
}
