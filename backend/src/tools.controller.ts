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
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @IsOptional()
  @IsInt()
  proxyProfileId?: number;
}

class DnsQueryDto {
  @IsOptional()
  @IsInt()
  dnsProfileId?: number;
}

class DnsProfileDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() servers: string;
}

class ProxyProfileDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() host: string;
  @IsInt() port: number;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() protocol?: string;
}

class ProxyProfilePatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() host?: string;
  @IsOptional() @IsInt() port?: number;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() protocol?: string;
  @IsOptional() enabled?: boolean;
}

@Controller('admin/tools')
@UseGuards(RootGuard)
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get('dns')
  dns(
    @Query('domain') domain: string,
    @Query('dnsProfileId') dnsProfileId?: string,
    @Req() req: { user?: { username?: string } } = {},
  ) {
    return this.tools.resolveDns(
      domain ?? '',
      req.user?.username,
      dnsProfileId ? Number(dnsProfileId) : undefined,
    );
  }

  @Get('dns/profiles')
  listDns() {
    return this.tools.listDnsProfiles();
  }

  @Post('dns/profiles')
  createDns(@Body() dto: DnsProfileDto) {
    return this.tools.createDnsProfile(dto.name, dto.servers);
  }

  @Post('dns/profiles/:id')
  patchDns(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<DnsProfileDto & { enabled: boolean }>,
  ) {
    return this.tools.updateDnsProfile(id, dto);
  }

  @Delete('dns/profiles/:id')
  deleteDns(@Param('id', ParseIntPipe) id: number) {
    return this.tools.deleteDnsProfile(id);
  }

  @Post('proxy')
  proxy(@Body() dto: ProxyDto, @Req() req: { user?: { username?: string } } = {}) {
    return this.tools.restrictedFetch(
      dto.url,
      req.user?.username,
      dto.proxyProfileId,
    );
  }

  @Get('proxy/profiles')
  listProxyProfiles() {
    return this.tools.listProxyProfiles();
  }

  @Post('proxy/profiles')
  createProxyProfile(@Body() dto: ProxyProfileDto) {
    return this.tools.createProxyProfile(dto);
  }

  @Post('proxy/profiles/:id')
  patchProxyProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProxyProfilePatchDto,
  ) {
    return this.tools.updateProxyProfile(id, dto);
  }

  @Delete('proxy/profiles/:id')
  deleteProxyProfile(@Param('id', ParseIntPipe) id: number) {
    return this.tools.deleteProxyProfile(id);
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
