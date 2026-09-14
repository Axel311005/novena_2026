import { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Nino } from '../types/nino.interface';

interface KidBadgeCardProps {
  nino: Nino;
}

export function KidBadgeCard({ nino }: KidBadgeCardProps) {
  const nombreCompleto = useMemo(() => {
    return [
      nino.primerNombre,
      nino.segundoNombre,
      nino.primerApellido,
      nino.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }, [nino]);

  const qrValue = useMemo(() => {
    return nino.qrCodeToken || nino.codigo || String(nino.id);
  }, [nino]);

  return (
    <div className="kid-badge-card relative bg-white border border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-between text-center overflow-hidden shadow-xs select-none w-[92mm] h-[124mm] max-w-full box-border break-inside-avoid print:break-inside-avoid print:border-gray-400 print:shadow-none">
      {/* Encabezado del Carnet con Logo SMA en la parte superior izquierda y texto centrado */}
      <div className="w-full pb-2 border-b border-orange-100 relative flex items-center justify-center min-h-[48px]">
        <img
          src="/SMA.png"
          alt="Parroquia Santa María de los Ángeles"
          className="absolute left-0 top-0 bottom-0 my-auto h-11 max-h-[46px] w-auto object-contain"
        />
        <div className="flex flex-col items-center justify-center text-center px-8">
          <span className="text-orange-600 font-black uppercase tracking-wide text-[12px] leading-tight">
            Novena del Niño Dios
          </span>
          <span className="text-[9.5px] text-gray-800 font-bold leading-tight mt-0.5">
            Parroquia Santa María de los Ángeles
          </span>
          <span className="text-[8px] text-gray-400 font-medium tracking-tight mt-0.5">
            Carnet Oficial de Asistencia
          </span>
        </div>
      </div>

      {/* QR Code Canvas (Más Grande) */}
      <div className="my-auto py-1 flex flex-col items-center justify-center">
        <div className="bg-white p-2 rounded-xl border border-orange-100 shadow-xs inline-block">
          <QRCodeCanvas
            value={qrValue}
            size={168}
            level="H"
            marginSize={1}
            className="rounded"
          />
        </div>

        {/* Código Único Badge */}
        {nino.codigo && (
          <div className="mt-1.5">
            <span className="inline-block px-3.5 py-0.5 bg-orange-100 text-orange-950 text-[12px] font-black rounded-full border border-orange-200 tracking-wider font-mono">
              {nino.codigo}
            </span>
          </div>
        )}
      </div>

      {/* Información del Niño */}
      <div className="w-full pb-0.5">
        <h3
          className="font-black text-gray-900 text-[13.5px] leading-tight line-clamp-2 uppercase tracking-tight"
          title={nombreCompleto}
        >
          {nombreCompleto || 'Sin nombre'}
        </h3>
        <p className="text-[11px] text-gray-600 mt-0.5 font-semibold">
          {nino.edad} {nino.edad === 1 ? 'año' : 'años'} •{' '}
          {nino.sexo === 'masculino' ? 'Niño' : 'Niña'}
        </p>

        {/* Pie de página sutil */}
        <div className="mt-1.5 pt-1 border-t border-gray-100 flex items-center justify-between text-[8px] text-gray-400">
          <span>Carnet Oficial de Asistencia</span>
          <span>Peregrinos de Esperanza</span>
        </div>
      </div>
    </div>
  );
}
