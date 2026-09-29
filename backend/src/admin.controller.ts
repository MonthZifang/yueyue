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
  MaxLength,
} from 'class-validator';
import { AuthGuard } from './auth.guard';
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

class TagDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() slug: string;
}

class FriendDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() url: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsInt() sort?: number;
}

class ProjectDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() techStack?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsInt() sort?: number;
}

class GalleryDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() imageUrl: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() sort?: number;
}

@Controller('admin')
@UseGuards(AuthGuard)
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

  @Post('tags')
  createTag(@Body() dto: TagDto) {
    return this.admin.createTag(dto.name, dto.slug);
  }

  @Delete('tags/:id')
  deleteTag(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteTag(id);
  }

  @Post('friends')
  createFriend(@Body() dto: FriendDto) {
    return this.admin.createFriend(dto);
  }

  @Patch('friends/:id')
  updateFriend(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<FriendDto>) {
    return this.admin.updateFriend(id, dto);
  }

  @Delete('friends/:id')
  deleteFriend(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteFriend(id);
  }

  @Post('projects')
  createProject(@Body() dto: ProjectDto) {
    return this.admin.createProject(dto);
  }

  @Patch('projects/:id')
  updateProject(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<ProjectDto>) {
    return this.admin.updateProject(id, dto);
  }

  @Delete('projects/:id')
  deleteProject(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteProject(id);
  }

  @Post('gallery')
  createGallery(@Body() dto: GalleryDto) {
    return this.admin.createGallery(dto);
  }

  @Delete('gallery/:id')
  deleteGallery(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteGallery(id);
  }

  @Delete('guestbook/:id')
  deleteGuestbook(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteGuestbook(id);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteComment(id);
  }
}
