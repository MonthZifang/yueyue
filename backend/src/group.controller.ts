import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RootGuard } from './root.guard';
import { PrismaService } from './prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

class GroupDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() qrImage?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() sort?: number;
}

class GroupPatchDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() qrImage?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() sort?: number;
}

@Controller()
export class GroupController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('groups')
  async listPublic() {
    return this.prisma.group.findMany({
      where: { hidden: false },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Get('groups/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const row = await this.prisma.group.findFirst({ where: { id, hidden: false } });
    if (!row) throw new NotFoundException('组不存在');
    return row;
  }

  @Get('admin/groups')
  @UseGuards(RootGuard)
  adminList() {
    return this.prisma.group.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post('admin/groups')
  @UseGuards(RootGuard)
  create(@Body() dto: GroupDto) {
    return this.prisma.group.create({
      data: {
        title: dto.title,
        kind: dto.kind || 'other',
        summary: dto.summary ?? '',
        content: dto.content ?? '',
        url: dto.url,
        qrImage: dto.qrImage,
        cover: dto.cover,
        hidden: dto.hidden ?? false,
        sort: dto.sort ?? 0,
      },
    });
  }

  @Patch('admin/groups/:id')
  @UseGuards(RootGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: GroupPatchDto) {
    const row = await this.prisma.group.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('组不存在');
    return this.prisma.group.update({
      where: { id },
      data: {
        title: dto.title,
        kind: dto.kind,
        summary: dto.summary,
        content: dto.content,
        url: dto.url,
        qrImage: dto.qrImage,
        cover: dto.cover,
        hidden: dto.hidden,
        sort: dto.sort,
      },
    });
  }

  @Delete('admin/groups/:id')
  @UseGuards(RootGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const row = await this.prisma.group.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('组不存在');
    await this.prisma.group.delete({ where: { id } });
    return { ok: true };
  }
}

export { BadRequestException };
