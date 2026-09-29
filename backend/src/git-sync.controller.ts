import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RootGuard } from './root.guard';
import { GitSyncService } from './git-sync.service';

class SourceDto {
  @IsString()
  @IsNotEmpty()
  kind: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

class NavPatchDto {
  @IsOptional() @IsBoolean() showInNav?: boolean;
  @IsOptional() @IsInt() navOrder?: number;
  @IsOptional() @IsString() @MaxLength(20000) customHtml?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

class ManualProjectDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() techStack?: string;
  @IsOptional() @IsString() cover?: string;
  @IsOptional() @IsString() @MaxLength(20000) customHtml?: string;
  @IsOptional() @IsBoolean() showInNav?: boolean;
  @IsOptional() @IsInt() navOrder?: number;
  @IsOptional() @IsInt() sort?: number;
}

@Controller()
export class GitSyncController {
  constructor(private readonly sync: GitSyncService) {}

  // 公开：项目索�?列表/导航项目
  @Get('projects/search')
  search(@Query('q') q?: string, @Query('source') source?: string) {
    return this.sync.searchProjects(q, source);
  }

  @Get('projects/nav')
  navProjects() {
    return this.sync.listNavProjects();
  }

  // 管理：监控源与同步
  @Get('admin/git/sources')
  @UseGuards(RootGuard)
  sources() {
    return this.sync.listSources();
  }

  @Post('admin/git/sources')
  @UseGuards(RootGuard)
  addSource(@Body() dto: SourceDto) {
    return this.sync.addSource(dto.kind, dto.name);
  }

  @Delete('admin/git/sources/:id')
  @UseGuards(RootGuard)
  removeSource(@Param('id', ParseIntPipe) id: number) {
    return this.sync.removeSource(id);
  }

  @Post('admin/git/sources/:id/sync')
  @UseGuards(RootGuard)
  syncOne(@Param('id', ParseIntPipe) id: number) {
    return this.sync.syncSource(id);
  }

  @Post('admin/git/sync-all')
  @UseGuards(RootGuard)
  syncAll() {
    return this.sync.syncAll();
  }

  @Post('admin/projects')
  @UseGuards(RootGuard)
  createManual(@Body() dto: ManualProjectDto) {
    return this.sync.createManualProject(dto);
  }

  @Post('admin/projects/:id/nav')
  @UseGuards(RootGuard)
  patchNav(@Param('id', ParseIntPipe) id: number, @Body() dto: NavPatchDto) {
    return this.sync.setProjectNav(id, dto);
  }

  @Delete('admin/projects/:id')
  @UseGuards(RootGuard)
  removeProject(@Param('id', ParseIntPipe) id: number) {
    return this.sync.deleteProject(id);
  }
}
