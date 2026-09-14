import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './entities/configuracion.entity';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  constructor(
    @InjectRepository(Configuracion)
    private readonly configuracionRepository: Repository<Configuracion>,
  ) {}

  async getConfiguracion(): Promise<Configuracion> {
    let config = await this.configuracionRepository.findOne({
      where: {},
      order: { id: 'ASC' },
      relations: ['updatedBy'],
    });

    if (!config) {
      this.logger.log('Creando configuración inicial por defecto...');
      config = this.configuracionRepository.create({
        diaActivo: 1,
        estaActiva: true,
        nombreNovena: 'Novena del Niño Dios',
        anio: 2026,
        autoMarcarAsistenciaCreacion: true,
      });
      config = await this.configuracionRepository.save(config);
    }

    return config;
  }

  async updateConfiguracion(
    updateDto: UpdateConfiguracionDto,
    user: User,
  ): Promise<Configuracion> {
    const config = await this.getConfiguracion();

    Object.assign(config, updateDto);
    config.updatedBy = user;

    return await this.configuracionRepository.save(config);
  }
}
