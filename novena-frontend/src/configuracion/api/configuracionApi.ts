import { novenaApi } from '@/shared/api/novenaApi';
import type {
  Configuracion,
  UpdateConfiguracionDto,
} from '../types/configuracion.interface';

export const configuracionApi = {
  get: async (): Promise<Configuracion> => {
    const { data } = await novenaApi.get<Configuracion>('/configuracion');
    return data;
  },

  update: async (
    configDto: UpdateConfiguracionDto
  ): Promise<Configuracion> => {
    const { data } = await novenaApi.patch<Configuracion>(
      '/configuracion',
      configDto
    );
    return data;
  },
};
