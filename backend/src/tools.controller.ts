import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RootGuard } from './root.guard';
import { ToolsService } from './tools.service';

class AllowHostDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

class ProxyDto {
  @IsString()
  @IsNotEmpty()
  url: string;
}

@Controller('admin/tools')
@UseGuards(RootGuard)
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get('dns')
  dns(
    @Query('domain') domain: string,
    @Req() req: { user?: { username?: string } },
  ) {
    return this.tools.resolveDns(domain ?? '', req.user?.username);
  }

  @Post('proxy')
  proxy(
    @Body() dto: ProxyDto,
    @Req() req: { user?: { username?: string } },
  ) {
    return this.tools.restrictedFetch(dto.url, req.user?.username);
  }

  @Get('proxy/allowlist')
  allowlist() {
    return this.tools.listAllowHosts();
  }

  @Post('proxy/allowlist')
  addAllow(@Body() dto: AllowHostDto) {
    return this.tools.addAllowHost(dto.host, dto.note);
  }

  @Delete('proxy/allowlist/:id')
  removeAllow(@Param('id', ParseIntPipe) id: number) {
    return this.tools.removeAllowHost(id);
  }

  @Get('audit')
  audit(@Query('limit') limit?: string) {
    return this.tools.listAudit(limit ? Number(limit) : 50);
  }
}
