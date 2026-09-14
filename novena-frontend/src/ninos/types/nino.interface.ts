export type Sexo = 'masculino' | 'femenino';

export interface Nino {
  id: number;
  codigo?: string | null;
  qrCodeToken?: string | null;
  primerNombre: string | null;
  segundoNombre?: string | null;
  primerApellido: string | null;
  segundoApellido?: string | null;
  edad: number;
  sexo: Sexo;
  createdAt?: string;
  updatedAt?: string;
  createdByUserId?: string;
  updatedByUserId?: string | null;
}

export interface CreateNinoDto {
  primerNombre?: string | null;
  segundoNombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  edad: number;
  sexo: Sexo;
}

export interface UpdateNinoDto extends Partial<CreateNinoDto> {}

