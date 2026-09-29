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
import { SsoService } from './sso.service';
import { RootGuard } from './root.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'yueyuedao-dev-secret',
      signOptions: { expiresIn: '7d' },
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
