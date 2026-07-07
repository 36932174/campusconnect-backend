import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle(5, 60000)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle(10, 60000)
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
  ) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      fingerprint: req.headers['x-device-fingerprint'],
    };
    return this.authService.login(dto, deviceInfo);
  }

  @Public()
  @Post('two-factor/verify')
  @Throttle(5, 60000)
  async verifyTwoFactor(
    @Body() body: { userId: string; token: string },
    @Req() req: any,
  ) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      fingerprint: req.headers['x-device-fingerprint'],
    };
    return this.authService.verifyTwoFactor(body.userId, body.token, deviceInfo);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/setup')
  async setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/enable')
  async enableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    return this.authService.enableTwoFactor(userId, token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/disable')
  async disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('password') password: string,
  ) {
    return this.authService.disableTwoFactor(userId, password);
  }

  @Public()
  @Post('refresh')
  @Throttle(5, 60000)
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: any,
  ) {
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      fingerprint: req.headers['x-device-fingerprint'],
    };
    return this.authService.refreshTokens(refreshToken, deviceInfo);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @CurrentUser('id') userId: string,
    @Body('sessionId') sessionId?: string,
    @Body('allDevices') allDevices?: boolean,
  ) {
    return this.authService.logout(userId, sessionId, allDevices);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @Throttle(3, 60000)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @Throttle(3, 60000)
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any) {
    return req.user;
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req: any) {
    return req.user;
  }

  @Public()
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuth() {}

  @Public()
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthCallback(@Req() req: any) {
    return req.user;
  }
}
