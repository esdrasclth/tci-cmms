import { AuthModule } from '@thallesp/nestjs-better-auth';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdjuntosModule } from './adjuntos/adjuntos.module';
import { createAuth } from './auth/auth.config';
import { RolesGuard } from './auth/roles.guard';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ClientesModule } from './clientes/clientes.module';
import { EquiposModule } from './equipos/equipos.module';
import { InventarioModule } from './inventario/inventario.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    // Monta Better Auth en /api/auth/* y registra un AuthGuard global:
    // toda ruta exige sesion salvo que se marque con @Public() (TCI-33).
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: createAuth(prisma),
      }),
    }),
    AdjuntosModule,
    CatalogosModule,
    ClientesModule,
    EquiposModule,
    InventarioModule,
    OrdenesModule,
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
