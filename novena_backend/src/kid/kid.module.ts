import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KidService } from './kid.service';
import { KidController } from './kid.controller';
import { Kid } from './entities/kid.entity';
import { Asistencia } from '../asistencia/entities/asistencia.entity';
import { AuthModule } from '../auth/auth.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  controllers: [KidController],
  providers: [KidService],
  imports: [
    TypeOrmModule.forFeature([Kid, Asistencia]),
    AuthModule,
    ConfiguracionModule,
  ],
  exports: [KidService, TypeOrmModule],
})
export class KidModule {}

