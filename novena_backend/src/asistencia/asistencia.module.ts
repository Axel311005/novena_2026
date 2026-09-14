import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaService } from './asistencia.service';
import { AsistenciaController } from './asistencia.controller';
import { Asistencia } from './entities/asistencia.entity';
import { Kid } from '../kid/entities/kid.entity';
import { AuthModule } from '../auth/auth.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
  imports: [
    TypeOrmModule.forFeature([Asistencia, Kid]),
    AuthModule,
    ConfiguracionModule,
  ],
  exports: [AsistenciaService, TypeOrmModule],
})
export class AsistenciaModule {}

