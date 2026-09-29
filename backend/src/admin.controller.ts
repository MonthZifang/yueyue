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
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RootGuard } from './root.guard';
import { AdminService, PostInput } from './admin.service';

class PostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}

class PartialPostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) tagIds?: number[];
}

@Controller('admin')
@UseGuards(RootGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('posts')
  listPosts() {
    return this.admin.listPosts();
  }

  @Get('posts/:id')
  getPost(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getPost(id);
  }

  @Post('posts')
  createPost(@Body() dto: PostDto) {
    return this.admin.createPost(dto as PostInput);
  }

  @Patch('posts/:id')
  updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: PartialPostDto) {
    return this.admin.updatePost(id, dto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deletePost(id);
  }
}
