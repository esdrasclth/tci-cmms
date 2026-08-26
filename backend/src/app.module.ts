import { AuthModule } from '@thallesp/nestjs-better-auth';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdjuntosModule } from './adjuntos/adjuntos.module';
import { createAuth } from './auth/auth.config';
import { RolesGuard } from './auth/roles.guard';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ClientesModule } from './clientes/clientes.module';
import { CorreoModule } from './correo/correo.module';
import { CorreoService } from './correo/correo.service';
import { EquiposModule } from './equipos/equipos.module';
import { InventarioModule } from './inventario/inventario.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PreventivoModule } from './preventivo/preventivo.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportesModule } from './reportes/reportes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TCI-50: registra los @Cron. La generacion preventiva es el unico que hay.
    ScheduleModule.forRoot(),
    PrismaModule,
    // Monta Better Auth en /api/auth/* y registra un AuthGuard global:
    // toda ruta exige sesion salvo que se marque con @Public() (TCI-33).
    AuthModule.forRootAsync({
      // CorreoModule entra aqui explicitamente aunque sea @Global: los modulos
      // globales no estan disponibles para un `useFactory` que se resuelve
      // durante el arranque del propio AuthModule.
      imports: [PrismaModule, CorreoModule],
      inject: [PrismaService, CorreoService],
      useFactory: (prisma: PrismaService, correo: CorreoService) => ({
        auth: createAuth(prisma, correo),
        // El CORS lo monta main.ts: el que trae el modulo fija los metodos en
        // GET, POST, PUT y DELETE, y deja fuera PATCH.
        disableTrustedOriginsCors: true,
      }),
    }),
    AdjuntosModule,
    CatalogosModule,
    ClientesModule,
    CorreoModule,
    EquiposModule,
    InventarioModule,
    OrdenesModule,
    PreventivoModule,
    ReportesModule,
    UsuariosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Corre despues del AuthGuard de la libreria: corta usuarios desactivados
    // y aplica @Roles() (TCI-33).
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
