import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia } from './entities/asistencia.entity';
import { CreateAsistenciaDto, UpdateAsistenciaDto, ScanQrDto } from './dto';
import { User } from '../auth/entities/user.entity';
import { Kid } from '../kid/entities/kid.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class AsistenciaService {
  private readonly logger = new Logger(AsistenciaService.name);

  constructor(
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
    @InjectRepository(Kid)
    private readonly kidRepository: Repository<Kid>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  private calculateTotalDias(asistencia: Asistencia): number {
    return [
      asistencia.day1,
      asistencia.day2,
      asistencia.day3,
      asistencia.day4,
      asistencia.day5,
      asistencia.day6,
      asistencia.day7,
      asistencia.day8,
      asistencia.day9,
    ].filter(Boolean).length;
  }

  private getKidFullName(kid: Kid): string {
    return (
      [
        kid.primerNombre,
        kid.segundoNombre,
        kid.primerApellido,
        kid.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ') || `Niño #${kid.id}`
    );
  }

  async scanQr(
    scanQrDto: ScanQrDto,
    user: User,
  ): Promise<{
    status: 'registrado' | 'ya_registrado';
    message: string;
    kid: Kid;
    asistencia: Asistencia;
    dia: number;
    diasAsistidos: number;
  }> {
    const rawQr = scanQrDto.qrCode?.trim();
    if (!rawQr) {
      throw new BadRequestException('Código QR requerido');
    }

    // Determinar día
    let targetDay = scanQrDto.dia;
    if (!targetDay) {
      const config = await this.configuracionService.getConfiguracion();
      targetDay = config.diaActivo;
    }

    if (targetDay < 1 || targetDay > 9) {
      throw new BadRequestException('El día debe ser entre 1 y 9');
    }

    // Buscar niño por token de QR, por código o por ID
    let kid = await this.kidRepository.findOne({
      where: [{ qrCodeToken: rawQr }, { codigo: rawQr }],
      relations: ['asistencia', 'createdBy'],
    });

    if (!kid && !isNaN(Number(rawQr))) {
      kid = await this.kidRepository.findOne({
        where: { id: Number(rawQr) },
        relations: ['asistencia', 'createdBy'],
      });
    }

    if (!kid) {
      throw new NotFoundException(
        `No se encontró ningún niño con el código "${rawQr}"`,
      );
    }

    // Obtener o crear registro de asistencia
    let asistencia = kid.asistencia;
    if (!asistencia) {
      asistencia = this.asistenciaRepository.create({
        kid,
        createdBy: user,
      });
      asistencia = await this.asistenciaRepository.save(asistencia);
      kid.asistencia = asistencia;
    }

    const dayProp = `day${targetDay}` as keyof Asistencia;
    const yaEstabaRegistrado = Boolean(asistencia[dayProp]);

    if (yaEstabaRegistrado) {
      const diasAsistidos = this.calculateTotalDias(asistencia);
      const nombreCompleto = this.getKidFullName(kid);
      return {
        status: 'ya_registrado',
        message: `${nombreCompleto} ya tenía registrada la asistencia del Día ${targetDay}.`,
        kid,
        asistencia,
        dia: targetDay,
        diasAsistidos,
      };
    }

    // Marcar asistencia para el día seleccionado
    (asistencia as any)[dayProp] = true;
    asistencia.updatedBy = user;
    asistencia = await this.asistenciaRepository.save(asistencia);

    const diasAsistidos = this.calculateTotalDias(asistencia);
    const nombreCompleto = this.getKidFullName(kid);

    return {
      status: 'registrado',
      message: `¡Asistencia del Día ${targetDay} registrada con éxito para ${nombreCompleto}!`,
      kid,
      asistencia,
      dia: targetDay,
      diasAsistidos,
    };
  }

  async create(
    createAsistenciaDto: CreateAsistenciaDto,
    user: User,
  ): Promise<Asistencia> {
    try {
      // Verificar que el niño existe
      const kid = await this.kidRepository.findOne({
        where: { id: createAsistenciaDto.kidId },
        relations: ['asistencia'],
      });

      if (!kid) {
        throw new NotFoundException(
          `Niño con id ${createAsistenciaDto.kidId} no encontrado`,
        );
      }

      // Verificar que el niño no tenga ya un registro de asistencia
      if (kid.asistencia) {
        const nombreCompleto = [
          kid.primerNombre,
          kid.segundoNombre,
          kid.primerApellido,
          kid.segundoApellido,
        ]
          .filter(Boolean)
          .join(' ') || 'el niño';

        throw new BadRequestException({
          message: `El niño ya tiene un registro de asistencia registrado`,
          error: 'Asistencia ya existe',
          details: {
            kidId: kid.id,
            nombre: nombreCompleto,
            asistenciaId: kid.asistencia.id,
            message: 'Para modificar la asistencia, use el endpoint PATCH /api/asistencias/:id',
          },
        });
      }

      const asistencia = this.asistenciaRepository.create({
        ...createAsistenciaDto,
        kid,
        createdBy: user,
      });

      return await this.asistenciaRepository.save(asistencia);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error al crear asistencia:', error);
      throw new BadRequestException('Error al crear el registro de asistencia');
    }
  }

  async findAll(
    paginationDto: PaginationQueryDto = {},
  ): Promise<{
    data: Asistencia[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { limit = 10, offset = 0, q } = paginationDto;

    const queryBuilder = this.asistenciaRepository
      .createQueryBuilder('asistencia')
      .leftJoinAndSelect('asistencia.kid', 'kid')
      .leftJoinAndSelect('asistencia.createdBy', 'createdBy')
      .leftJoinAndSelect('asistencia.updatedBy', 'updatedBy');

    // Aplicar búsqueda si se proporciona el parámetro q (buscar por nombre o edad del niño)
    // Buscar en campos que pueden ser null y en la edad
    if (q) {
      const searchTerm = `%${q.trim()}%`;
      queryBuilder.where(
        '(COALESCE(kid.primerNombre, \'\') ILIKE :q OR COALESCE(kid.segundoNombre, \'\') ILIKE :q OR COALESCE(kid.primerApellido, \'\') ILIKE :q OR COALESCE(kid.segundoApellido, \'\') ILIKE :q OR CAST(kid.edad AS TEXT) LIKE :q)',
        { q: searchTerm },
      );
    }

    // Obtener el total antes de aplicar paginación
    const total = await queryBuilder.getCount();

    // Aplicar paginación
    const data = await queryBuilder
      .orderBy('asistencia.createdAt', 'DESC')
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

  async findOne(id: number): Promise<Asistencia> {
    const asistencia = await this.asistenciaRepository.findOne({
      where: { id },
      relations: ['kid', 'createdBy', 'updatedBy'],
    });

    if (!asistencia) {
      throw new NotFoundException(`Asistencia con id ${id} no encontrada`);
    }

    return asistencia;
  }

  async findByKidId(kidId: number): Promise<Asistencia | null> {
    return await this.asistenciaRepository.findOne({
      where: { kidId },
      relations: ['kid', 'createdBy', 'updatedBy'],
    });
  }

  async update(
    id: number,
    updateAsistenciaDto: UpdateAsistenciaDto,
    user: User,
  ): Promise<Asistencia> {
    const asistencia = await this.findOne(id);

    // Si se actualiza el kidId, verificar que el nuevo niño existe
    if (updateAsistenciaDto.kidId && updateAsistenciaDto.kidId !== asistencia.kidId) {
      const kid = await this.kidRepository.findOne({
        where: { id: updateAsistenciaDto.kidId },
      });

      if (!kid) {
        throw new NotFoundException(
          `Niño con id ${updateAsistenciaDto.kidId} no encontrado`,
        );
      }

      asistencia.kid = kid;
    }

    Object.assign(asistencia, updateAsistenciaDto);
    asistencia.updatedBy = user;

    return await this.asistenciaRepository.save(asistencia);
  }

  async remove(id: number): Promise<void> {
    const asistencia = await this.findOne(id);
    await this.asistenciaRepository.remove(asistencia);
  }
}

