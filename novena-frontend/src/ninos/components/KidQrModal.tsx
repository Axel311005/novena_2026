import { useRef } from 'react';
import {
  FaTimes,
  FaPrint,
  FaDownload,
  FaQrcode,
} from 'react-icons/fa';
import type { Nino } from '../types/nino.interface';
import { KidBadgeCard } from './KidBadgeCard';
import { Button } from '@/shared/components/ui/button';

interface KidQrModalProps {
  nino: Nino;
  onClose: () => void;
}

export function KidQrModal({ nino, onClose }: KidQrModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const nombreCompleto =
    [
      nino.primerNombre,
      nino.segundoNombre,
      nino.primerApellido,
      nino.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ') || 'Sin Nombre';

  const handlePrint = () => {
    const canvas = printRef.current?.querySelector('canvas');
    const qrImgSrc = canvas ? canvas.toDataURL('image/png') : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carnet QR - ${nombreCompleto}</title>
          <style>
            @page {
              size: 92mm 124mm;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              width: 92mm;
              height: 124mm;
              border: 1px dashed #666;
              border-radius: 12px;
              padding: 12px 10px;
              text-align: center;
              background: #fff;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
            }
            .header-title {
              font-size: 13px;
              font-weight: 800;
              color: #ea580c;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header-sub {
              font-size: 10px;
              color: #6b7280;
              margin: 0;
              font-weight: 500;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 6px;
              border-radius: 10px;
              display: inline-block;
              border: 1px solid #fed7aa;
              margin: 4px 0;
            }
            .qr-img {
              display: block;
              margin: 0 auto;
              width: 135px;
              height: 135px;
            }
            .code-badge {
              font-size: 12px;
              font-weight: 800;
              background: #ffedd5;
              color: #7c2d12;
              padding: 2px 12px;
              border-radius: 12px;
              display: inline-block;
              border: 1px solid #fdba74;
              font-family: monospace;
              letter-spacing: 0.5px;
            }
            .kid-name {
              font-size: 13px;
              font-weight: bold;
              color: #111827;
              margin: 3px 0 2px 0;
              text-transform: uppercase;
            }
            .kid-info {
              font-size: 11px;
              color: #4b5563;
              margin: 0 0 4px 0;
              font-weight: 500;
            }
            .footer-tag {
              font-size: 8.5px;
              color: #9ca3af;
              border-top: 1px solid #f3f4f6;
              padding-top: 4px;
              width: 100%;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="width: 100%; border-bottom: 1px solid #ffedd5; padding-bottom: 4px;">
              <h1 class="header-title">Novena del Niño Dios</h1>
              <p class="header-sub">Carnet Oficial de Asistencia</p>
            </div>
            <div>
              <div class="qr-wrapper">
                <img class="qr-img" src="${qrImgSrc}" alt="Código QR" />
              </div>
              <div>
                ${nino.codigo ? `<span class="code-badge">${nino.codigo}</span>` : ''}
              </div>
            </div>
            <div style="width: 100%;">
              <div class="kid-name">${nombreCompleto}</div>
              <div class="kid-info">${nino.edad} ${nino.edad === 1 ? 'año' : 'años'} • ${nino.sexo === 'masculino' ? 'Niño' : 'Niña'}</div>
              <div class="footer-tag">
                <span>Parroquia / Comunidad</span>
                <span>Peregrinos de Esperanza</span>
              </div>
            </div>
          </div>
          <script>
            const img = document.querySelector('.qr-img');
            const doPrint = () => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 500);
            };
            if (img && img.complete) {
              doPrint();
            } else if (img) {
              img.onload = doPrint;
            } else {
              doPrint();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    const canvas = printRef.current?.querySelector('canvas');
    if (!canvas) return;

    const pngFile = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `QR_${nino.codigo || nino.primerNombre || 'nino'}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-100">
        {/* Header */}
        <div className="bg-orange-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaQrcode className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Carnet & Código QR</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Card Preview */}
        <div className="p-6 flex flex-col items-center">
          <div ref={printRef} className="flex justify-center">
            <KidBadgeCard nino={nino} />
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center max-w-xs">
            Este carnet tiene el tamaño estandarizado (4 por hoja) para registrar su asistencia en la novena.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <Button
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2"
            >
              <FaPrint className="w-4 h-4" />
              Imprimir Carnet
            </Button>
            <Button
              onClick={handleDownloadQr}
              variant="outline"
              className="border-gray-300 hover:bg-orange-50 text-gray-700 flex items-center justify-center gap-2"
            >
              <FaDownload className="w-4 h-4" />
              Descargar QR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
