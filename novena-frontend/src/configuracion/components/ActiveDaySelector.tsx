import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCalendarDay, FaCog, FaCheck, FaChevronDown } from 'react-icons/fa';
import { toast } from 'sonner';
import { getConfiguracion, updateConfiguracion } from '../actions';
import { useAuthStore } from '@/auth/store/auth.store';

interface ActiveDaySelectorProps {
  compact?: boolean;
}

export function ActiveDaySelector({ compact = false }: ActiveDaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('admin') ?? false;

  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const updateMutation = useMutation({
    mutationFn: updateConfiguracion,
    onSuccess: (updated) => {
      queryClient.setQueryData(['configuracion'], updated);
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
      queryClient.invalidateQueries({ queryKey: ['asistencias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stats-by-day'] });
      toast.success(`Día activo actualizado a Día ${updated.diaActivo}`);
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al actualizar día de la novena');
    },
  });

  const handleSelectDay = (day: number) => {
    if (!isAdmin) {
      toast.info('Solo los administradores pueden cambiar el día activo');
      return;
    }
    if (day === config?.diaActivo) {
      setIsOpen(false);
      return;
    }
    updateMutation.mutate({ diaActivo: day });
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold animate-pulse">
        <FaCalendarDay className="w-3.5 h-3.5" />
        <span>Cargando día...</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-semibold transition-all shadow-xs ${
          config.estaActiva
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <FaCalendarDay className="w-3.5 h-3.5" />
        <span>Día {config.diaActivo} Activo</span>
        {isAdmin && <FaChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-80" />}
      </button>

      {isOpen && isAdmin && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 p-3 border border-orange-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 px-1">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FaCog className="w-3 h-3 text-orange-500" />
                Cambiar Día Activo
              </span>
              <span className="text-[10px] text-gray-400">1 al 9</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((dia) => {
                const isSelected = config.diaActivo === dia;
                return (
                  <button
                    key={dia}
                    onClick={() => handleSelectDay(dia)}
                    disabled={updateMutation.isPending}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    <span>Día {dia}</span>
                    {isSelected && <FaCheck className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-500 mt-2.5 text-center bg-orange-50/60 rounded-lg p-1.5">
              El día activo se usará automáticamente al escanear los códigos QR.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
