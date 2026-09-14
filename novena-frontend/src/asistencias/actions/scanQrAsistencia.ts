import { asistenciaApi } from '../api/asistenciaApi';
import type {
  ScanQrDto,
  ScanQrResponse,
} from '../types/asistencia.interface';

export const scanQrAsistencia = async (
  scanDto: ScanQrDto
): Promise<ScanQrResponse> => {
  return await asistenciaApi.scanQr(scanDto);
};
