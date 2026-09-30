import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { RootGuard } from './root.guard';
import { PrismaService } from './prisma.service';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

@Controller()
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  /** 上传：存入数据库，返回 URL */
  @Post('admin/upload')
  @UseGuards(RootGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          ALLOWED_MIME.has(file.mimetype) &&
          file.mimetype !== 'image/svg+xml';
        cb(null, ok);
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('仅支持 png/jpg/jpeg/webp/gif');
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)
      ? ext
      : 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
    await this.prisma.media.create({
      data: {
        filename,
        mime: file.mimetype,
        size: file.size,
        data: new Uint8Array(file.buffer),
      },
    });
    return { url: `/uploads/${filename}` };
  }

  /** 从数据库读文件 */
  @Get('uploads/:filename')
  async serve(@Param('filename') filename: string, @Res() res: Response) {
    const row = await this.prisma.media.findUnique({ where: { filename } });
    if (!row) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(row.data));
  }

  @Get('admin/media')
  @UseGuards(RootGuard)
  list() {
    return this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mime: true,
        size: true,
        createdAt: true,
      },
      take: 200,
    });
  }
}
