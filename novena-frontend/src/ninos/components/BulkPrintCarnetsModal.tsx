import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FaTimes,
  FaPrint,
  FaSearch,
  FaCheckSquare,
  FaSquare,
  FaUsers,
  FaFileAlt,
  FaStar,
  FaSpinner,
} from 'react-icons/fa';
import { ninoApi } from '../api/ninoApi';
import { KidBadgeCard } from './KidBadgeCard';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { Nino } from '../types/nino.interface';

interface BulkPrintCarnetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkPrintCarnetsModal({ isOpen, onClose }: BulkPrintCarnetsModalProps) {
  const [activeTab, setActiveTab] = useState<'nuevos' | 'todos'>('nuevos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Consulta de niños según el filtro de nuevos o todos
  const { data: kids = [], isLoading, isFetching } = useQuery<Nino[]>({
    queryKey: ['kids-carnets', activeTab],
    queryFn: () =>
      ninoApi.getCarnets({
        soloNuevos: activeTab === 'nuevos',
      }),
    enabled: isOpen,
    staleTime: 1000 * 30, // 30s
  });

  // Filtrado por búsqueda en memoria
  const filteredKids = useMemo(() => {
    if (!searchTerm.trim()) return kids;
    const term = searchTerm.toLowerCase();
    return kids.filter((k) => {
      const nombre = `${k.primerNombre || ''} ${k.segundoNombre || ''} ${k.primerApellido || ''} ${k.segundoApellido || ''}`.toLowerCase();
      const codigo = (k.codigo || '').toLowerCase();
      return nombre.includes(term) || codigo.includes(term);
    });
  }, [kids, searchTerm]);

  // Inicializar selección con todos los encontrados al cargar o cambiar pestaña
  useEffect(() => {
    if (kids && kids.length > 0) {
      setSelectedIds(new Set(kids.map((k) => k.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [kids]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredKids.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredKids.map((k) => k.id)));
    }
  };

  const toggleKid = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedKidsList = useMemo(() => {
    return filteredKids.filter((k) => selectedIds.has(k.id));
  }, [filteredKids, selectedIds]);

  // Agrupar en páginas de 4 para la impresión exacta 2x2
  const pagesOfKids = useMemo(() => {
    const pages: Nino[][] = [];
    for (let i = 0; i < selectedKidsList.length; i += 4) {
      pages.push(selectedKidsList.slice(i, i + 4));
    }
    return pages;
  }, [selectedKidsList]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Interactivo (en pantalla) */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 print:hidden animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-orange-100">
          {/* Header */}
          <div className="bg-orange-500 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <FaPrint className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  Impresión Masiva de Carnets QR
                </h2>
                <p className="text-xs text-orange-100">
                  Formato optimizado para 4 carnets por hoja (Carta / A4)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              title="Cerrar"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Filtros y Estadísticas */}
          <div className="bg-orange-50/60 p-4 border-b border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            {/* Pestañas de Modo */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-orange-200 shadow-xs">
              <button
                onClick={() => {
                  setActiveTab('nuevos');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'nuevos'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <FaStar className="w-3 h-3" />
                <span>Nuevos (1 Asistencia)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('todos');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'todos'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <FaUsers className="w-3 h-3" />
                <span>Todos los Niños</span>
              </button>
            </div>

            {/* Buscador */}
            <div className="relative flex-1 max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-orange-200 rounded-xl focus:border-orange-500"
              />
            </div>

            {/* Resumen de Hojas */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-orange-200">
                <FaFileAlt className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  <strong className="text-orange-600">{selectedKidsList.length}</strong> carnets •{' '}
                  <strong className="text-gray-900">{pagesOfKids.length}</strong> {pagesOfKids.length === 1 ? 'hoja' : 'hojas'}
                </span>
              </div>

              <Button
                onClick={handlePrint}
                disabled={selectedKidsList.length === 0}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm flex items-center gap-2"
              >
                <FaPrint className="w-3.5 h-3.5" />
                <span>Imprimir ({selectedKidsList.length})</span>
              </Button>
            </div>
          </div>

          {/* Subheader con botón de seleccionar todos */}
          <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600 shrink-0">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {selectedIds.size === filteredKids.length && filteredKids.length > 0 ? (
                <FaCheckSquare className="w-4 h-4 text-orange-500" />
              ) : (
                <FaSquare className="w-4 h-4 text-gray-400" />
              )}
              <span>
                {selectedIds.size === filteredKids.length && filteredKids.length > 0
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos los de la lista'}
              </span>
            </button>
            <span className="text-[11px] text-gray-400">
              Mostrando {filteredKids.length} niños • Haz clic en la casilla para incluir o excluir
            </span>
          </div>

          {/* Contenido / Vista Previa de Carnets */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-100/70">
            {isLoading || isFetching ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                <FaSpinner className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-sm font-medium">Cargando carnets...</p>
              </div>
            ) : filteredKids.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                  <FaUsers className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="font-bold text-gray-800 text-base">
                  {activeTab === 'nuevos'
                    ? 'No hay niños recién agregados (con 1 sola asistencia)'
                    : 'No se encontraron niños'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  {activeTab === 'nuevos'
                    ? 'Los niños agregados por primera vez aparecerán aquí para imprimir sus carnets. Puedes cambiar a la pestaña "Todos los Niños" para imprimir cualquier carnet.'
                    : 'Prueba cambiando los términos de búsqueda.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pagesOfKids.map((pageKids, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100 text-xs text-gray-500">
                      <span className="font-bold text-gray-700 flex items-center gap-1.5">
                        <FaFileAlt className="w-3 h-3 text-orange-500" />
                        Hoja {pageIndex + 1} de {pagesOfKids.length}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {pageKids.length} {pageKids.length === 1 ? 'carnet' : 'carnets'} en esta página (máx. 4)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
                      {pageKids.map((nino) => {
                        const isSelected = selectedIds.has(nino.id);
                        return (
                          <div
                            key={nino.id}
                            onClick={() => toggleKid(nino.id)}
                            className={`relative cursor-pointer transition-all duration-150 rounded-2xl p-1.5 ${
                              isSelected
                                ? 'ring-2 ring-orange-500 bg-orange-50/30'
                                : 'opacity-40 grayscale hover:opacity-75'
                            }`}
                          >
                            <div className="absolute top-3 right-3 z-20 bg-white rounded-md shadow-xs p-0.5">
                              {isSelected ? (
                                <FaCheckSquare className="w-4 h-4 text-orange-500" />
                              ) : (
                                <FaSquare className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <KidBadgeCard nino={nino} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenedor Oculto exclusivamente para Impresión (@media print) */}
      <div id="printable-carnets-container" className="hidden print:block">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 6mm;
              }
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Ocultar toda la interfaz web */
              body * {
                visibility: hidden;
              }
              #printable-carnets-container, #printable-carnets-container * {
                visibility: visible;
              }
              #printable-carnets-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
              .print-sheet-page {
                width: 100%;
                min-height: 260mm;
                page-break-after: always;
                break-after: page;
                page-break-inside: avoid;
                break-inside: avoid;
                display: grid !important;
                grid-template-columns: repeat(2, 92mm) !important;
                grid-template-rows: repeat(2, 124mm) !important;
                gap: 5mm 8mm !important;
                justify-content: center !important;
                align-content: center !important;
                padding-top: 4mm !important;
              }
              .print-sheet-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
              .kid-badge-card {
                width: 92mm !important;
                height: 124mm !important;
                border: 1px dashed #666 !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                background-color: white !important;
              }
            }
          `
        }} />

        {pagesOfKids.map((pageKids, pageIndex) => (
          <div key={`print-page-${pageIndex}`} className="print-sheet-page">
            {pageKids.map((nino) => (
              <KidBadgeCard key={`print-${nino.id}`} nino={nino} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
