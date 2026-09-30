import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UploadController } from './upload.controller';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { GitSyncController } from './git-sync.controller';
import { GitSyncService } from './git-sync.service';
import { SsoController } from './sso.controller';
import { GroupController } from './group.controller';
import { SsoService } from './sso.service';
import { RootGuard } from './root.guard';
import { loadAppConfig } from './config';

const cfg = loadAppConfig();

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: cfg.auth.jwtSecret,
      signOptions: { expiresIn: cfg.auth.tokenExpiresIn || '7d' },
    }),
  ],
  controllers: [
    AuthController,
    ContentController,
    AdminController,
    UploadController,
    ToolsController,
    GitSyncController,
    SsoController,
    GroupController,
  ],
  providers: [
    PrismaService,
    AuthService,
    ContentService,
    AdminService,
    ToolsService,
    GitSyncService,
    SsoService,
    RootGuard,
  ],
})
export class AppModule {}
