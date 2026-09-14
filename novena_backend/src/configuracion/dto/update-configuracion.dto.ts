import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateConfiguracionDto {
  @ApiPropertyOptional({
    description: 'Día activo de la novena (1 al 9)',
    example: 1,
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  diaActivo?: number;

  @ApiPropertyOptional({
    description: 'Indica si la novena está activa actualmente',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;

  @ApiPropertyOptional({
    description: 'Nombre de la novena',
    example: 'Novena del Niño Dios',
  })
  @IsOptional()
  @IsString()
  nombreNovena?: string;

  @ApiPropertyOptional({
    description: 'Año de la novena',
    example: 2026,
  })
  @IsOptional()
  @IsInt()
  anio?: number;

  @ApiPropertyOptional({
    description: 'Marcar automáticamente la asistencia del día activo al registrar un niño',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoMarcarAsistenciaCreacion?: boolean;
}
