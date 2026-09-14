export interface Configuracion {
  id: number;
  diaActivo: number;
  estaActiva: boolean;
  nombreNovena: string;
  anio: number;
  autoMarcarAsistenciaCreacion: boolean;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConfiguracionDto {
  diaActivo?: number;
  estaActiva?: boolean;
  nombreNovena?: string;
  anio?: number;
  autoMarcarAsistenciaCreacion?: boolean;
}
