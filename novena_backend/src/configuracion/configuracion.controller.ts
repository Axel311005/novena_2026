import {
  Controller,
  Get,
  Patch,
  Body,
} from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces/valid-roles';

@ApiTags('Configuración')
@Controller('configuracion')
@ApiBearerAuth('JWT-auth')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.apuntador)
  @ApiOperation({ summary: 'Obtener configuración actual de la novena' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actual recuperada exitosamente',
  })
  getConfiguracion() {
    return this.configuracionService.getConfiguracion();
  }

  @Patch()
  @Auth(ValidRoles.admin, ValidRoles.apuntador)
  @ApiOperation({ summary: 'Actualizar configuración o día activo de la novena' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
  })
  updateConfiguracion(
    @Body() updateConfiguracionDto: UpdateConfiguracionDto,
    @GetUser() user: User,
  ) {
    return this.configuracionService.updateConfiguracion(updateConfiguracionDto, user);
  }
}
