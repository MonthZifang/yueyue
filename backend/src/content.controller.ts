import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ContentService } from './content.service';

class CommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  nickname: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

class LikeDto {
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}

class GuestbookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  nickname: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('posts')
  listPosts(
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.content.listPosts({ tag, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('posts/:slug')
  getPost(@Param('slug') slug: string, @Query('fingerprint') fingerprint?: string) {
    return this.content.getPost(slug, fingerprint);
  }

  @Get('posts/:slug/comments')
  listComments(@Param('slug') slug: string) {
    return this.content.listComments(slug);
  }

  @Post('posts/:slug/comments')
  addComment(@Param('slug') slug: string, @Body() dto: CommentDto) {
    return this.content.addComment(slug, dto.nickname, dto.content);
  }

  @Post('posts/:slug/like')
  like(@Param('slug') slug: string, @Body() dto: LikeDto) {
    return this.content.like(slug, dto.fingerprint);
  }

  @Get('tags')
  tags() {
    return this.content.tags();
  }

  @Get('archive')
  archive() {
    return this.content.archive();
  }

  @Get('guestbook')
  listGuestbook() {
    return this.content.listGuestbook();
  }

  @Post('guestbook')
  addGuestbook(@Body() dto: GuestbookDto) {
    return this.content.addGuestbook(dto.nickname, dto.content);
  }

  @Get('friends')
  friends() {
    return this.content.friends();
  }

  @Get('projects')
  projects() {
    return this.content.projects();
  }

  @Get('gallery')
  gallery() {
    return this.content.gallery();
  }

  @Get('about')
  about() {
    return this.content.about();
  }
}
