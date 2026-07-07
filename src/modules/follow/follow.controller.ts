import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowService } from './follow.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('users/:username/follow')
  async follow(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.followService.follow(userId, username);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:username/follow')
  async unfollow(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
  ) {
    return this.followService.unfollow(userId, username);
  }

  @Public()
  @Get('users/:username/followers')
  async getFollowers(
    @Param('username') username: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.followService.getFollowers(username, page, limit);
  }

  @Public()
  @Get('users/:username/following')
  async getFollowing(
    @Param('username') username: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.followService.getFollowing(username, page, limit);
  }
}
