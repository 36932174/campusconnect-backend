import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { memoryStorage } from 'multer';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadsService.uploadFile(file, 'images');
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadsService.uploadFile(file, 'documents');
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.uploadsService.uploadFile(file, 'avatars');
    return { ...result, userId };
  }

  @Post('resource')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadResource(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.uploadsService.uploadFile(file, 'resources');
  }

  @Delete(':path(*)')
  async deleteFile(
    @Param('path') filePath: string,
  ) {
    await this.uploadsService.deleteFile(`/uploads/${filePath}`);
    return { message: 'File deleted' };
  }
}
