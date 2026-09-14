import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
import { KidBadgeCard } from '../components/KidBadgeCard';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent } from '@/shared/components/ui/card';
import type { Nino } from '../types/nino.interface';

export default function PrintCarnetsPage() {
  const [activeTab, setActiveTab] = useState<'nuevos' | 'todos'>('nuevos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Consulta de niños para carnets (solo admin)
  const { data: kids = [], isLoading, isFetching } = useQuery<Nino[]>({
    queryKey: ['admin-kids-carnets', activeTab],
    queryFn: () =>
      ninoApi.getCarnets({
        soloNuevos: activeTab === 'nuevos',
      }),
    staleTime: 1000 * 30, // 30s
  });

  // Filtrado por búsqueda
  const filteredKids = useMemo(() => {
    if (!searchTerm.trim()) return kids;
    const term = searchTerm.toLowerCase();
    return kids.filter((k) => {
      const nombre = `${k.primerNombre || ''} ${k.segundoNombre || ''} ${k.primerApellido || ''} ${k.segundoApellido || ''}`.toLowerCase();
      const codigo = (k.codigo || '').toLowerCase();
      return nombre.includes(term) || codigo.includes(term);
    });
  }, [kids, searchTerm]);

  // Sincronizar selección con los niños cargados al cambiar pestaña o datos
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

  // Agrupar en páginas de 4 todos los niños mostrados para la vista en pantalla
  const allPagesOfKids = useMemo(() => {
    const pages: Nino[][] = [];
    for (let i = 0; i < filteredKids.length; i += 4) {
      pages.push(filteredKids.slice(i, i + 4));
    }
    return pages;
  }, [filteredKids]);

  // Agrupar en páginas de 4 únicamente los seleccionados para la impresión en papel
  const printPagesOfKids = useMemo(() => {
    const pages: Nino[][] = [];
    for (let i = 0; i < selectedKidsList.length; i += 4) {
      pages.push(selectedKidsList.slice(i, i + 4));
    }
    return pages;
  }, [selectedKidsList]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Principal de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Impresión de Carnets QR
          </h1>
          <p className="text-gray-600 mt-1">
            Impresión masiva optimizada de 4 carnets por página (Carta / A4)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-700 bg-orange-50/80 px-3.5 py-2 rounded-xl border border-orange-200">
            <FaFileAlt className="w-3.5 h-3.5 text-orange-500" />
            <span>
              <strong className="text-orange-600">{selectedKidsList.length}</strong> seleccionados •{' '}
              <strong className="text-gray-900">{printPagesOfKids.length}</strong> {printPagesOfKids.length === 1 ? 'hoja' : 'hojas'}
            </span>
          </div>

          <Button
            onClick={handlePrint}
            disabled={selectedKidsList.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm flex items-center gap-2 h-10 px-5"
          >
            <FaPrint className="w-4 h-4" />
            <span>Imprimir Carnets ({selectedKidsList.length})</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Control */}
      <Card className="border-orange-100 shadow-sm print:hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('nuevos');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'nuevos'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <FaStar className="w-3.5 h-3.5" />
                <span>Nuevos (1 Asistencia)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('todos');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'todos'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <FaUsers className="w-3.5 h-3.5" />
                <span>Todos los Niños</span>
              </button>
            </div>

            {/* Buscador */}
            <div className="relative flex-1 max-w-sm">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs bg-white border-orange-200 rounded-xl focus:border-orange-500"
              />
            </div>
          </div>

          {/* Subheader de selección */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600">
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
                  : 'Seleccionar todos los mostrados'}
              </span>
            </button>
            <span className="text-gray-400">
              Mostrando {filteredKids.length} niños • Haz clic en un carnet para seleccionarlo o excluirlo
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Contenedor en Pantalla */}
      <div className="print:hidden space-y-6">
        {isLoading || isFetching ? (
          <Card className="border-dashed border-2 border-orange-200 p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <FaSpinner className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm font-medium">Cargando carnets para impresión...</p>
          </Card>
        ) : filteredKids.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
              <FaUsers className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">
              {activeTab === 'nuevos'
                ? 'No hay niños con 1 sola asistencia registrada'
                : 'No se encontraron niños'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {activeTab === 'nuevos'
                ? 'Cuando agregues nuevos niños a la novena aparecerán automáticamente aquí para imprimir sus carnets. Puedes usar la pestaña "Todos los Niños" para imprimir cualquier carnet.'
                : 'Intenta con otro término de búsqueda.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {allPagesOfKids.map((pageKids, pageIndex) => (
              <Card key={pageIndex} className="border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <span className="font-bold text-gray-800 flex items-center gap-2">
                    <FaFileAlt className="w-3.5 h-3.5 text-orange-500" />
                    Página {pageIndex + 1} de {allPagesOfKids.length}
                  </span>
                  <span className="text-gray-400">
                    {pageKids.length} {pageKids.length === 1 ? 'carnet' : 'carnets'} en esta hoja (máx. 4)
                  </span>
                </div>

                <CardContent className="p-6 bg-gray-50/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
                    {pageKids.map((nino) => {
                      const isSelected = selectedIds.has(nino.id);
                      return (
                        <div
                          key={nino.id}
                          onClick={() => toggleKid(nino.id)}
                          className={`relative cursor-pointer transition-all duration-150 rounded-2xl p-1.5 ${
                            isSelected
                              ? 'ring-2 ring-orange-500 bg-orange-50/40 shadow-sm'
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contenedor Oculto exclusivamente para Impresión (@media print) */}
      <div id="printable-carnets-container" className="hidden print:block">
        <style
          dangerouslySetInnerHTML={{
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
            `,
          }}
        />

        {printPagesOfKids.map((pageKids, pageIndex) => (
          <div key={`print-page-${pageIndex}`} className="print-sheet-page">
            {pageKids.map((nino) => (
              <KidBadgeCard
                key={`print-${nino.id}`}
                nino={nino}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
