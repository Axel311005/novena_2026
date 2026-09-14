import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';

export class ScanQrDto {
  @ApiProperty({
    description: 'Token del código QR o código único del niño (ej. NOV-0001)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsString()
  qrCode: string;

  @ApiPropertyOptional({
    description: 'Día de la novena (1-9). Si se omite, se usa el día activo configurado en el sistema.',
    example: 1,
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  dia?: number;
}
