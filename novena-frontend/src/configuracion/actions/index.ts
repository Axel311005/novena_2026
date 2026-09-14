import { configuracionApi } from '../api/configuracionApi';
import type {
  Configuracion,
  UpdateConfiguracionDto,
} from '../types/configuracion.interface';

export const getConfiguracion = async (): Promise<Configuracion> => {
  return await configuracionApi.get();
};

export const updateConfiguracion = async (
  configDto: UpdateConfiguracionDto
): Promise<Configuracion> => {
  return await configuracionApi.update(configDto);
};
