import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
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
import { OptionalAuthGuard } from './optional-auth.guard';
import { ContentService } from './content.service';

class CommentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  content?: string;

  /** 兼容旧字�?*/
  @IsOptional()
  @IsString()
  nickname?: string;
}

class LikeDto {
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}

class GuestbookDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

class FriendDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() url: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() sort?: number;
}

class GalleryDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() imageUrl: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() sort?: number;
}

class TagDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() slug?: string;
}

class AboutDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() content: string;
}

class SiteDto {
  @IsOptional() @IsString() heroKicker?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroSubtitle?: string;
  @IsOptional() @IsString() heroImage?: string;
  @IsOptional() @IsString() siteName?: string;
  @IsOptional() @IsString() footerNote?: string;
  @IsOptional() @IsString() aboutTitle?: string;
  @IsOptional() @IsBoolean() commentRequireSso?: boolean;
}

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('site')
  site() {
    return this.content.siteSettings();
  }

  @Get('posts')
  listPosts(
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.content.listPosts({ tag, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('posts/:slug')
  getPost(
    @Param('slug') slug: string,
    @Query('fingerprint') fingerprint?: string,
    @Query('view') view?: string,
  ) {
    const countView = view === '1' || view === 'true';
    return this.content.getPost(slug, fingerprint, countView);
  }

  @Get('posts/:slug/comments')
  listComments(@Param('slug') slug: string) {
    return this.content.listComments(slug);
  }

  @Post('posts/:slug/comments')
  @UseGuards(OptionalAuthGuard)
  addComment(
    @Param('slug') slug: string,
    @Body() dto: CommentDto,
    @Req() req: { user?: { sub: number; username: string; displayName?: string; avatarUrl?: string; email?: string } },
  ) {
    const content = dto.content ?? '';
    return this.content.addComment(slug, content, req.user ?? null);
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
  @UseGuards(OptionalAuthGuard)
  addGuestbook(
    @Body() dto: GuestbookDto,
    @Req() req: {
      user?: {
        sub: number;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        email?: string;
      };
    },
  ) {
    return this.content.addGuestbook(dto.content ?? '', req.user ?? null);
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
    return this.content.gallery(false);
  }

  @Get('about')
  about() {
    return this.content.about();
  }

  // ---- admin content management ----

  @Get('admin/site')
  @UseGuards(RootGuard)
  adminSite() {
    return this.content.siteSettings();
  }

  @Patch('admin/site')
  @UseGuards(RootGuard)
  updateSite(@Body() dto: SiteDto) {
    return this.content.updateSiteSettings(dto);
  }

  @Get('admin/tags')
  @UseGuards(RootGuard)
  adminTags() {
    return this.content.allTags();
  }

  @Post('admin/tags')
  @UseGuards(RootGuard)
  createTag(@Body() dto: TagDto) {
    return this.content.createTag(dto.name, dto.slug);
  }

  @Delete('admin/tags/:id')
  @UseGuards(RootGuard)
  deleteTag(@Param('id', ParseIntPipe) id: number) {
    return this.content.deleteTag(id);
  }

  @Get('admin/friends')
  @UseGuards(RootGuard)
  adminFriends() {
    return this.content.friends();
  }

  @Post('admin/friends')
  @UseGuards(RootGuard)
  createFriend(@Body() dto: FriendDto) {
    return this.content.createFriend(dto);
  }

  @Patch('admin/friends/:id')
  @UseGuards(RootGuard)
  updateFriend(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<FriendDto>) {
    return this.content.updateFriend(id, dto);
  }

  @Delete('admin/friends/:id')
  @UseGuards(RootGuard)
  deleteFriend(@Param('id', ParseIntPipe) id: number) {
    return this.content.deleteFriend(id);
  }

  @Get('admin/gallery')
  @UseGuards(RootGuard)
  adminGallery() {
    return this.content.gallery(true);
  }

  @Post('admin/gallery')
  @UseGuards(RootGuard)
  createGallery(@Body() dto: GalleryDto) {
    return this.content.createGallery(dto);
  }

  @Patch('admin/gallery/:id')
  @UseGuards(RootGuard)
  updateGallery(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<GalleryDto> & { hidden?: boolean }) {
    return this.content.updateGallery(id, dto);
  }

  @Delete('admin/gallery/:id')
  @UseGuards(RootGuard)
  deleteGallery(@Param('id', ParseIntPipe) id: number) {
    return this.content.deleteGallery(id);
  }

  @Patch('admin/about')
  @UseGuards(RootGuard)
  updateAbout(@Body() dto: AboutDto) {
    return this.content.updateAbout(dto.title, dto.content);
  }

  @Delete('admin/guestbook/:id')
  @UseGuards(RootGuard)
  deleteGuestbook(@Param('id', ParseIntPipe) id: number) {
    return this.content.deleteGuestbook(id);
  }

  @Delete('admin/comments/:id')
  @UseGuards(RootGuard)
  deleteComment(@Param('id', ParseIntPipe) id: number) {
    return this.content.deleteComment(id);
  }
}
