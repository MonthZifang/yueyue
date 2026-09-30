import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { RootGuard } from './root.guard';
import { PrismaService } from './prisma.service';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

class MediaPatchDto {
  @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @IsOptional() @IsString() @MaxLength(120) filename?: string;
}

@Controller()
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

  /** 上传：存入数据库 */
  @Post('admin/upload')
  @UseGuards(RootGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME.has(file.mimetype) && file.mimetype !== 'image/svg+xml');
      },
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('仅支持 png/jpg/jpeg/webp/gif');
    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase();
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ext : 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
    const row = await this.prisma.media.create({
      data: {
        filename,
        displayName: file.originalname.slice(0, 120) || filename,
        mime: file.mimetype,
        size: file.size,
        data: new Uint8Array(file.buffer),
      },
    });
    // 同时支持路径与 ID 引用
    return {
      id: row.id,
      url: `/uploads/${filename}`,
      idUrl: `/api/media/${row.id}`,
      filename,
      displayName: row.displayName,
    };
  }

  /** 按 ID 取图（封面可直接填 /api/media/3） */
  @Get('media/:id')
  async serveById(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(row.data));
  }

  /** 按文件名取图（兼容 /uploads/xxx） */
  @Get('uploads/:filename')
  async serveByFile(@Param('filename') filename: string, @Res() res: Response) {
    const row = await this.prisma.media.findUnique({ where: { filename } });
    if (!row) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(row.data));
  }

  /** 图片库列表 */
  @Get('admin/media')
  @UseGuards(RootGuard)
  list() {
    return this.prisma.media.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        filename: true,
        displayName: true,
        mime: true,
        size: true,
        createdAt: true,
      },
    });
  }

  @Patch('admin/media/:id')
  @UseGuards(RootGuard)
  async rename(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MediaPatchDto,
  ) {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) throw new BadRequestException('图片不存在');
    return this.prisma.media.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        filename: dto.filename,
      },
      select: {
        id: true,
        filename: true,
        displayName: true,
        mime: true,
        size: true,
      },
    });
  }

  @Delete('admin/media/:id')
  @UseGuards(RootGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }
}
