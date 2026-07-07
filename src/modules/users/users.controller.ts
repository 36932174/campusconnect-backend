import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Public()
  @Get(':username')
  async getProfile(
    @Param('username') username: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.usersService.getPublicProfile(username, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updates: any,
  ) {
    return this.usersService.updateProfile(userId, updates);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  async updateAvatar(
    @CurrentUser('id') userId: string,
    @Body('url') url: string,
  ) {
    return this.usersService.updateAvatar(userId, url);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('cover')
  async updateCover(
    @CurrentUser('id') userId: string,
    @Body('url') url: string,
  ) {
    return this.usersService.updateCover(userId, url);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('privacy/toggle')
  async togglePrivacy(@CurrentUser('id') userId: string) {
    return this.usersService.togglePrivacy(userId);
  }

  @Public()
  @Get('search/all')
  async searchUsers(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.searchUsers(query, page, limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('suggestions')
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query('limit') limit = 10,
  ) {
    return this.usersService.getUserSuggestions(userId, limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('block/:userId')
  async blockUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.usersService.blockUser(currentUserId, targetUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('report/:userId')
  async reportUser(
    @CurrentUser('id') reporterId: string,
    @Param('userId') targetUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.usersService.reportUser(reporterId, targetUserId, reason);
  }
}
