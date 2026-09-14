import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Kid } from './entities/kid.entity';
import { CreateKidDto, UpdateKidDto } from './dto';
import { User } from '../auth/entities/user.entity';
import { Asistencia } from '../asistencia/entities/asistencia.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class KidService {
  private readonly logger = new Logger(KidService.name);

  constructor(
    @InjectRepository(Kid)
    private readonly kidRepository: Repository<Kid>,
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async create(createKidDto: CreateKidDto, user: User): Promise<Kid> {
    try {
      const qrCodeToken = crypto.randomUUID();

      const kid = this.kidRepository.create({
        primerNombre: createKidDto.primerNombre ?? null,
        segundoNombre: createKidDto.segundoNombre ?? null,
        primerApellido: createKidDto.primerApellido ?? null,
        segundoApellido: createKidDto.segundoApellido ?? null,
        edad: createKidDto.edad,
        sexo: createKidDto.sexo,
        qrCodeToken,
        createdBy: user,
      });

      const savedKid = await this.kidRepository.save(kid);

      // Generar código amigable único tipo NOV-0001
      savedKid.codigo = `NOV-${savedKid.id.toString().padStart(4, '0')}`;
      await this.kidRepository.save(savedKid);

      // Obtener configuración para determinar asistencia inicial
      const config = await this.configuracionService.getConfiguracion();

      const initialDays: Record<string, boolean> = {
        day1: false,
        day2: false,
        day3: false,
        day4: false,
        day5: false,
        day6: false,
        day7: false,
        day8: false,
        day9: false,
      };

      if (config.estaActiva && config.autoMarcarAsistenciaCreacion) {
        const dayProp = `day${config.diaActivo}`;
        initialDays[dayProp] = true;
      }

      // Buscar si existe asistencia (por si acaso) o crear nueva
      let asistencia = await this.asistenciaRepository.findOne({
        where: { kid: { id: savedKid.id } },
      });

      if (!asistencia) {
        asistencia = this.asistenciaRepository.create({
          kid: savedKid,
          createdBy: user,
          ...initialDays,
        });
      } else {
        Object.assign(asistencia, initialDays);
        asistencia.updatedBy = user;
      }

      await this.asistenciaRepository.save(asistencia);

      return await this.findOne(savedKid.id);
    } catch (error) {
      this.logger.error('Error al crear niño:', error);
      throw new BadRequestException('Error al crear el registro del niño');
    }
  }

  async findAll(
    paginationDto: PaginationQueryDto = {},
  ): Promise<{ data: Kid[]; total: number; limit: number; offset: number }> {
    const { limit = 10, offset = 0, q } = paginationDto;

    // QueryBuilder para obtener los datos con relaciones
    const queryBuilder = this.kidRepository
      .createQueryBuilder('kid')
      .leftJoinAndSelect('kid.createdBy', 'createdBy')
      .leftJoinAndSelect('kid.updatedBy', 'updatedBy')
      .leftJoinAndSelect('kid.asistencia', 'asistencia');

    // QueryBuilder para contar (sin relaciones ni ordenamiento)
    const countQueryBuilder = this.kidRepository
      .createQueryBuilder('kid');

    // Aplicar búsqueda si se proporciona el parámetro q
    if (q) {
      const searchCondition =
        '(COALESCE(kid.primerNombre, \'\') ILIKE :q OR COALESCE(kid.segundoNombre, \'\') ILIKE :q OR COALESCE(kid.primerApellido, \'\') ILIKE :q OR COALESCE(kid.segundoApellido, \'\') ILIKE :q OR COALESCE(kid.codigo, \'\') ILIKE :q)';
      queryBuilder.where(searchCondition, { q: `%${q}%` });
      countQueryBuilder.where(searchCondition, { q: `%${q}%` });
    }

    // Ordenar por el último registro creado (más reciente primero)
    queryBuilder.orderBy('kid.createdAt', 'DESC');

    // Obtener el total antes de aplicar paginación
    const total = await countQueryBuilder.getCount();

    // Aplicar paginación y obtener los datos
    const data = await queryBuilder
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: number): Promise<Kid> {
    const kid = await this.kidRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy', 'asistencia'],
    });

    if (!kid) {
      throw new NotFoundException(`Niño con id ${id} no encontrado`);
    }

    return kid;
  }

  async findByQrToken(qrCodeToken: string): Promise<Kid | null> {
    return await this.kidRepository.findOne({
      where: { qrCodeToken },
      relations: ['asistencia', 'createdBy'],
    });
  }

  async findByCodigo(codigo: string): Promise<Kid | null> {
    return await this.kidRepository.findOne({
      where: { codigo },
      relations: ['asistencia', 'createdBy'],
    });
  }

  async update(id: number, updateKidDto: UpdateKidDto, user: User): Promise<Kid> {
    const kid = await this.findOne(id);

    Object.assign(kid, updateKidDto);
    kid.updatedBy = user;

    return await this.kidRepository.save(kid);
  }

  async findForCarnets(options: { soloNuevos?: boolean; q?: string }): Promise<any[]> {
    const { soloNuevos = false, q } = options;

    const queryBuilder = this.kidRepository
      .createQueryBuilder('kid')
      .leftJoinAndSelect('kid.asistencia', 'asistencia');

    if (q) {
      const searchCondition =
        '(COALESCE(kid.primerNombre, \'\') ILIKE :q OR COALESCE(kid.segundoNombre, \'\') ILIKE :q OR COALESCE(kid.primerApellido, \'\') ILIKE :q OR COALESCE(kid.segundoApellido, \'\') ILIKE :q OR COALESCE(kid.codigo, \'\') ILIKE :q)';
      queryBuilder.andWhere(searchCondition, { q: `%${q}%` });
    }

    const attendanceSumSql = `(
      (CASE WHEN asistencia.day1 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day2 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day3 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day4 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day5 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day6 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day7 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day8 = true THEN 1 ELSE 0 END) +
      (CASE WHEN asistencia.day9 = true THEN 1 ELSE 0 END)
    )`;

    if (String(soloNuevos) === 'true' || soloNuevos === true) {
      queryBuilder.andWhere(`${attendanceSumSql} = 1`);
    }

    queryBuilder.orderBy('kid.id', 'DESC');

    const kids = await queryBuilder.getMany();

    return kids.map((k) => {
      const a = k.asistencia;
      const totalAsistencias = a
        ? [a.day1, a.day2, a.day3, a.day4, a.day5, a.day6, a.day7, a.day8, a.day9].filter(Boolean).length
        : 0;
      return {
        id: k.id,
        codigo: k.codigo,
        qrCodeToken: k.qrCodeToken,
        primerNombre: k.primerNombre,
        segundoNombre: k.segundoNombre,
        primerApellido: k.primerApellido,
        segundoApellido: k.segundoApellido,
        edad: k.edad,
        sexo: k.sexo,
        totalAsistencias,
        createdAt: k.createdAt,
      };
    });
  }

  async remove(id: number): Promise<void> {
    const kid = await this.findOne(id);
    await this.kidRepository.remove(kid);
  }
}

