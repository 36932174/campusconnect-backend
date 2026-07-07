import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResourcesService } from './resources.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../database/entities/user.entity';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  // ─── Notes ───

  @UseGuards(AuthGuard('jwt'))
  @Post('notes')
  async uploadNote(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.resourcesService.uploadNote(userId, data);
  }

  @Public()
  @Get('notes')
  async getNotes(
    @Query('subject') subject?: string,
    @Query('semester') semester?: number,
    @Query('branch') branch?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.getNotes({ subject, semester, branch, page, limit });
  }

  @Public()
  @Get('notes/:id')
  async getNoteById(@Param('id') id: string) {
    return this.resourcesService.getNoteById(id);
  }

  @Public()
  @Get('notes/:id/download')
  async downloadNote(@Param('id') id: string) {
    return this.resourcesService.downloadNote(id);
  }

  // ─── Assignments ───

  @UseGuards(AuthGuard('jwt'))
  @Post('assignments')
  async uploadAssignment(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.resourcesService.uploadAssignment(userId, data);
  }

  @Public()
  @Get('assignments')
  async getAssignments(
    @Query('subject') subject?: string,
    @Query('semester') semester?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.getAssignments({ subject, semester, page, limit });
  }

  @Public()
  @Get('assignments/:id')
  async getAssignmentById(@Param('id') id: string) {
    return this.resourcesService.getAssignmentById(id);
  }

  // ─── Question Papers ───

  @UseGuards(AuthGuard('jwt'))
  @Post('question-papers')
  async uploadQuestionPaper(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.resourcesService.uploadQuestionPaper(userId, data);
  }

  @Public()
  @Get('question-papers')
  async getQuestionPapers(
    @Query('subject') subject?: string,
    @Query('semester') semester?: number,
    @Query('branch') branch?: string,
    @Query('year') year?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.getQuestionPapers({ subject, semester, branch, year, page, limit });
  }

  @Public()
  @Get('question-papers/:id')
  async getQuestionPaperById(@Param('id') id: string) {
    return this.resourcesService.getQuestionPaperById(id);
  }

  @Public()
  @Get('search')
  async searchAll(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.searchAll(query, page, limit);
  }

  // ─── Moderation (Admin only) ───

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @Get('moderation/pending')
  async getPendingResources(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.getPendingResources(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @Post('moderate')
  async moderateResource(
    @CurrentUser('id') moderatorId: string,
    @Body() body: { resourceType: string; resourceId: string; status: string; note?: string },
  ) {
    return this.resourcesService.moderateResource(
      body.resourceType,
      body.resourceId,
      body.status as any,
      moderatorId,
      body.note,
    );
  }
}
