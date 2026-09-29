import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { RootGuard } from './root.guard';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

@Controller('admin')
@UseGuards(RootGuard)
export class UploadController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const ext = `.${(file.originalname.split('.').pop() || 'png').toLowerCase()}`;
          const safeExt = ALLOWED_EXT.has(ext) ? ext : '.png';
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = `.${(file.originalname.split('.').pop() || '').toLowerCase()}`;
        const okExt = ALLOWED_EXT.has(ext);
        const okMime = /^image\//.test(file.mimetype) && file.mimetype !== 'image/svg+xml';
        cb(null, okExt && okMime);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('仅支�?png/jpg/jpeg/webp/gif 图片');
    return { url: `/uploads/${file.filename}` };
  }
}
