import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FaQrcode,
  FaCamera,
  FaSearch,
  FaCheckCircle,
  FaExclamationCircle,
  FaHistory,
  FaArrowLeft,
  FaVolumeUp,
  FaVolumeMute,
  FaLightbulb,
  FaStop,
  FaPlay,
  FaKeyboard,
} from 'react-icons/fa';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { scanQrAsistencia } from '../actions';
import { getConfiguracion } from '@/configuracion/actions';
import { ActiveDaySelector } from '@/configuracion/components/ActiveDaySelector';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { ScanQrResponse } from '../types/asistencia.interface';

// Generador de sonido con Web Audio API
const playBeep = (type: 'success' | 'warning' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Ignorar si el navegador bloquea audio antes de interacción
  }
};

export default function ScannerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);
  const mountedRef = useRef(true);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<ScanQrResponse | null>(null);
  const [recentScans, setRecentScans] = useState<ScanQrResponse[]>([]);

  const { data: config } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
  });

  const activeDay = config?.diaActivo || 1;
  const activeDayRef = useRef(activeDay);
  activeDayRef.current = activeDay;

  const handleQrDetectedRef = useRef<(code: string) => void>(() => {});

  const scanMutation = useMutation({
    mutationFn: scanQrAsistencia,
    onSuccess: (data) => {
      setLastScanResult(data);
      setRecentScans((prev) => [data, ...prev.filter((item) => item.kid.id !== data.kid.id)].slice(0, 10));

      if (soundEnabled) {
        playBeep(data.status === 'registrado' ? 'success' : 'warning');
      }

      if (data.status === 'registrado') {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }

      // Actualizar listas en segundo plano
      queryClient.invalidateQueries({ queryKey: ['asistencias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stats-by-day'] });
    },
    onError: (error: any) => {
      if (soundEnabled) playBeep('error');
      toast.error(error?.message || 'Error al procesar el código');
    },
  });

  const handleQrDetected = useCallback(
    (decodedText: string) => {
      const cleanCode = decodedText.trim();
      if (!cleanCode) return;

      const now = Date.now();

      // Evitar lecturas múltiples si ya se está procesando
      if (isProcessingRef.current || scanMutation.isPending) return;

      // Si es el mismo código escaneado hace menos de 4 segundos, ignorar
      if (lastScannedCodeRef.current === cleanCode && now - lastScannedTimeRef.current < 4000) {
        return;
      }

      // Cooldown general de 1.5s entre cualquier código
      if (now - lastScannedTimeRef.current < 1500) {
        return;
      }

      isProcessingRef.current = true;
      lastScannedCodeRef.current = cleanCode;
      lastScannedTimeRef.current = now;
      setIsScanningPaused(true);

      // Pausar decodificador temporalmente mientras se procesa
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.pause(true);
        }
      } catch (e) {
        // Ignorar si el navegador no soporta pause
      }

      const targetDay = activeDayRef.current || 1;

      scanMutation.mutate(
        {
          qrCode: cleanCode,
          dia: targetDay,
        },
        {
          onSettled: () => {
            // Reanudar después de 2.2 segundos para dar tiempo a retirar el carnet
            setTimeout(() => {
              isProcessingRef.current = false;
              if (mountedRef.current) {
                setIsScanningPaused(false);
              }
              try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                  scannerRef.current.resume();
                }
              } catch (e) {
                // Ignorar
              }
            }, 2200);
          },
        }
      );
    },
    [scanMutation]
  );

  handleQrDetectedRef.current = handleQrDetected;

  const stopCamera = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error al detener cámara:', err);
      }
    }

    if (mountedRef.current) {
      setCameraActive(false);
      setIsInitializing(false);
    }
    isTransitioningRef.current = false;
  };

  const startCamera = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setCameraError(null);
    setIsInitializing(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      // Si ya está escaneando, detener primero
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const qrConfig = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      // Intentar primero con cámara trasera (environment), si falla o no existe probar con la frontal o por defecto
      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => handleQrDetectedRef.current(decodedText),
          () => {}
        );
      } catch (rearErr) {
        console.warn('No se pudo acceder a cámara environment, intentando user/default...', rearErr);
        await scannerRef.current.start(
          { facingMode: 'user' },
          qrConfig,
          (decodedText) => handleQrDetectedRef.current(decodedText),
          () => {}
        );
      }

      if (mountedRef.current) {
        setCameraActive(true);
        setCameraError(null);
        setIsInitializing(false);
      }
    } catch (err: any) {
      console.error('Error definitivo al iniciar cámara:', err);
      if (mountedRef.current) {
        setCameraError(
          'No se pudo acceder a la cámara. Por favor concede permisos en tu navegador o utiliza el modo manual.'
        );
        setCameraActive(false);
        setIsInitializing(false);
      }
    } finally {
      isTransitioningRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (activeTab === 'camera') {
      startCamera();
    }
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || scanMutation.isPending) return;
    scanMutation.mutate({
      qrCode: manualCode.trim(),
      dia: activeDayRef.current || 1,
    });
    setManualCode('');
  };

  const handleCancelAndLeave = async () => {
    await stopCamera();
    navigate('/admin/asistencias');
  };

  const getKidFullName = (kid: any) => {
    return (
      [
        kid.primerNombre,
        kid.segundoNombre,
        kid.primerApellido,
        kid.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ') || `Niño #${kid.id}`
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelAndLeave}
            className="rounded-full w-9 h-9 p-0"
            title="Volver a lista de asistencias"
          >
            <FaArrowLeft className="w-4 h-4 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FaQrcode className="text-orange-500" />
              Toma de Asistencia
            </h1>
            <p className="text-sm text-gray-500">
              Escanea el carnet QR o ingresa el código del niño
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActiveDaySelector />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-full w-9 h-9 p-0 text-gray-600"
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? (
              <FaVolumeUp className="w-4 h-4 text-orange-500" />
            ) : (
              <FaVolumeMute className="w-4 h-4 text-gray-400" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelAndLeave}
            className="text-gray-700 hover:bg-gray-100"
          >
            Cancelar y Salir
          </Button>
        </div>
      </div>

      {/* Selector de Pestañas: Cámara vs Manual */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'camera'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaCamera className="w-4 h-4" />
          Escanear con Cámara
        </button>
        <button
          onClick={async () => {
            await stopCamera();
            setActiveTab('manual');
          }}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaKeyboard className="w-4 h-4" />
          Ingreso Manual por Código
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Visor de Cámara o Entrada Manual */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'camera' ? (
            <Card className="overflow-hidden border-orange-100 shadow-md">
              <CardHeader className="bg-orange-500 text-white py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FaCamera className="w-4 h-4" />
                  Cámara en Vivo • Marcando para Día {activeDay}
                </CardTitle>
                {cameraActive && (
                  <span className="flex items-center gap-1.5 text-xs bg-green-500/30 text-green-100 px-2.5 py-0.5 rounded-full font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    En vivo
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center">
                {/* Contenedor del video */}
                <div className="w-full max-w-sm aspect-square bg-gray-950 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
                  <div
                    id="qr-reader"
                    className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
                  />

                  {isScanningPaused && !cameraError && (
                    <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 pointer-events-none transition-all">
                      <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-2 text-white shadow-xl animate-bounce">
                        <FaCheckCircle className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-white tracking-wide">¡QR Procesado!</p>
                      <p className="text-[11px] text-emerald-200 mt-0.5">Listo para el siguiente carnet...</p>
                    </div>
                  )}

                  {isInitializing && !cameraActive && !cameraError && (
                    <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white gap-2 z-10">
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs">Iniciando cámara...</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-gray-900/95 p-6 flex flex-col items-center justify-center text-center text-white gap-3 z-20">
                      <FaExclamationCircle className="w-10 h-10 text-amber-400" />
                      <p className="text-sm text-gray-200">{cameraError}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={startCamera}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                        >
                          Reintentar Cámara
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab('manual')}
                          className="text-white border-white/40 hover:bg-white/10 text-xs"
                        >
                          Usar Modo Manual
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de control de cámara */}
                <div className="flex items-center gap-3 mt-4">
                  {cameraActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopCamera}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                    >
                      <FaStop className="w-3 h-3" />
                      Detener Cámara
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={startCamera}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs flex items-center gap-1.5"
                    >
                      <FaPlay className="w-3 h-3" />
                      Iniciar Cámara
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Formulario Manual de Respaldo */}
          <Card className="border-gray-200">
            <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <FaKeyboard className="w-3.5 h-3.5 text-orange-500" />
                Marcar por Código del Niño
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <p className="text-xs text-gray-500">
                  Escribe el código del carnet (ej: <span className="font-mono font-bold text-orange-600">NOV-0001</span>):
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Ej: NOV-0001..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="pl-9 text-sm"
                      autoFocus={activeTab === 'manual'}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={scanMutation.isPending || !manualCode.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                  >
                    {scanMutation.isPending ? 'Marcando...' : 'Marcar Asistencia'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Resultado del Escaneo Actual y Recientes */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tarjeta del último escaneado */}
          <Card
            className={`border-2 transition-all duration-300 ${
              lastScanResult
                ? lastScanResult.status === 'registrado'
                  ? 'border-green-400 bg-green-50/50 shadow-lg shadow-green-100'
                  : 'border-amber-300 bg-amber-50/40 shadow-lg shadow-amber-100'
                : 'border-dashed border-gray-300 bg-gray-50/50'
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Resultado del Escaneo</span>
                {lastScanResult && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      lastScanResult.status === 'registrado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {lastScanResult.status === 'registrado'
                      ? '¡Asistencia Registrada!'
                      : 'Ya Registrado'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastScanResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        lastScanResult.status === 'registrado'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {lastScanResult.status === 'registrado' ? (
                        <FaCheckCircle className="w-7 h-7" />
                      ) : (
                        <FaExclamationCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {getKidFullName(lastScanResult.kid)}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lastScanResult.kid.codigo && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700">
                            {lastScanResult.kid.codigo}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {lastScanResult.kid.edad} años •{' '}
                          {lastScanResult.kid.sexo === 'masculino' ? 'Niño' : 'Niña'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200/80 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-[11px] text-gray-500 block">Día Marcado</span>
                      <span className="text-base font-bold text-orange-600">
                        Día {lastScanResult.dia}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-500 block">Total Días</span>
                      <span className="text-base font-bold text-green-600">
                        {lastScanResult.diasAsistidos} / 9
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 text-center italic">
                    {lastScanResult.message}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <FaLightbulb className="w-8 h-8 mx-auto mb-2 text-amber-300" />
                  <p className="text-sm font-medium">Listo para registrar</p>
                  <p className="text-xs">Los datos del niño aparecerán aquí inmediatamente al escanear su código.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Escaneos Recientes de la sesión */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-gray-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                <FaHistory className="w-3.5 h-3.5 text-orange-500" />
                Escaneos Recientes ({recentScans.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-64 overflow-y-auto divide-y divide-gray-100">
              {recentScans.length === 0 ? (
                <p className="p-4 text-xs text-gray-400 text-center">
                  Aún no hay escaneos en esta sesión.
                </p>
              ) : (
                recentScans.map((scan, idx) => (
                  <div
                    key={`${scan.kid.id}-${idx}`}
                    className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getKidFullName(scan.kid)}
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        {scan.kid.codigo ? `${scan.kid.codigo} • ` : ''}{scan.kid.edad} años
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          scan.status === 'registrado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {scan.status === 'registrado' ? 'Día ' + scan.dia : 'Ya Marcado'}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {scan.diasAsistidos}/9 días
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
