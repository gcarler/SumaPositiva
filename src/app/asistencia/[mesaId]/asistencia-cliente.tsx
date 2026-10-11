"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  Building2,
  ArrowRight,
  RotateCcw,
  CloudOff,
  RefreshCw,
  Users,
  Compass,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { guardarPendiente, sincronizarTodo } from "@/shared/offline";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { AGENDA_MESAS } from "@/features/mesas/data/agenda.data";
import {
  MAPA_CODIGO_OFICIAL_A_AGENDA,
  MAPA_UUID_A_AGENDA,
  COORDENADAS_AGENDA_MESAS,
} from "@/features/geovisor/data/mesas-geovisor.data";
import { useAgendaStore } from "@/features/mesas/state/agenda-store";
import { CONTENIDO_MESAS } from "@/features/mesas/data/agenda-contenido.data";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import { listarMesas } from "@/features/mesas/services/mesas-api";
import { estandarizarDireccion } from "@/features/geovisor/services/geovisor-api";
import {
  useAsistenciaStore,
  useRegistrosMesa,
  type NuevoAsistenteInput,
} from "@/features/mesas/state/asistencia-store";
import {
  type EnfoqueDiferencial,
  type TipoDocumento,
  type Genero,
  type RegistroAsistencia,
  ENFOQUES_DIFERENCIALES_LABELS,
  TIPOS_DOCUMENTO_LABELS,
  GENEROS_LABELS,
} from "@/features/mesas/models/asistencia";

export function AsistenciaCliente({ mesaId }: { mesaId: string }) {
  const registrarAsistente = useAsistenciaStore((s) => s.registrarAsistente);
  const sincronizarPendientes = useAsistenciaStore((s) => s.sincronizarPendientes);
  const cargarAsistentesDesdeBackend = useAsistenciaStore((s) => s.cargarAsistentesDesdeBackend);
  const registrosMesa = useRegistrosMesa(mesaId);
  const pendientesSincronizacion = registrosMesa.filter((r) => r.pendienteSincronizacion);

  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSincronizacion, setMensajeSincronizacion] = useState<string | null>(null);
  const [estaOnline, setEstaOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEstaOnline(navigator.onLine);
      const handleOnline = () => setEstaOnline(true);
      const handleOffline = () => setEstaOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    useAgendaStore.getState().cargarAgendas();
    listarMesas()
      .then((mesas) => {
        if (mesas && mesas.length > 0) {
          useMesasStore.getState().setMesas(mesas);
        }
      })
      .catch(() => {});
    cargarAsistentesDesdeBackend(mesaId);
  }, [mesaId, cargarAsistentesDesdeBackend]);

  const codigoOficialUpper = mesaId.toUpperCase();
  const idAgendaMapeado =
    MAPA_CODIGO_OFICIAL_A_AGENDA[codigoOficialUpper] ||
    MAPA_UUID_A_AGENDA[mesaId.toLowerCase()] ||
    mesaId.toLowerCase();

  const mesaStore = useMesasStore((s) =>
    s.mesas.find(
      (m) =>
        m.id.toLowerCase() === mesaId.toLowerCase() ||
        m.codigoOficial?.toLowerCase() === mesaId.toLowerCase() ||
        m.codigoOficial?.toUpperCase() === codigoOficialUpper ||
        m.shortcodeCiudadano?.toLowerCase() === mesaId.toLowerCase()
    )
  );

  const agendaDinamica = useAgendaStore((s) =>
    s.agendas.find(
      (a) =>
        a.id.toLowerCase() === mesaId.toLowerCase() ||
        a.id.toLowerCase() === idAgendaMapeado ||
        (a.mesa_id &&
          (a.mesa_id.toLowerCase() === mesaId.toLowerCase() ||
            (mesaStore && a.mesa_id.toLowerCase() === mesaStore.id.toLowerCase())))
    )
  );

  const mesaAgenda =
    agendaDinamica ||
    AGENDA_MESAS.find(
      (a) =>
        a.id.toLowerCase() === mesaId.toLowerCase() ||
        a.id.toLowerCase() === idAgendaMapeado ||
        (mesaStore &&
          ((mesaStore.codigoOficial &&
            a.id.toLowerCase() ===
              MAPA_CODIGO_OFICIAL_A_AGENDA[mesaStore.codigoOficial]?.toLowerCase()) ||
            a.id.toLowerCase() === MAPA_UUID_A_AGENDA[mesaStore.id.toLowerCase()]?.toLowerCase()))
    );

  const agendaKey =
    mesaAgenda?.id ||
    (mesaStore?.codigoOficial
      ? MAPA_CODIGO_OFICIAL_A_AGENDA[mesaStore.codigoOficial]
      : undefined) ||
    idAgendaMapeado;
  const contenido = CONTENIDO_MESAS[agendaKey];

  const codigoMesa =
    mesaStore?.codigoOficial ||
    (codigoOficialUpper.startsWith("MS-") ||
    codigoOficialUpper.startsWith("MT-") ||
    codigoOficialUpper.startsWith("MP-") ||
    codigoOficialUpper.startsWith("MR-")
      ? codigoOficialUpper
      : mesaAgenda?.id?.toUpperCase());

  const nombreMesa =
    mesaStore?.nombre || mesaAgenda?.nombre || `Mesa de Trabajo (${codigoMesa || mesaId})`;
  const lugarMesa = mesaStore?.lugar || mesaAgenda?.lugar || "Cartagena de Indias";
  const fechaMesa = mesaStore?.fecha || mesaAgenda?.fecha || "2026-10-15";
  const horarioMesa =
    mesaStore?.horario ||
    (mesaAgenda ? `${mesaAgenda.horaInicio} – ${mesaAgenda.horaFin}` : "08:30 – 12:00");
  const territorioMesa =
    mesaAgenda?.territorio ||
    "Distrito Turístico y Cultural de Cartagena de Indias";
  const dimensionesMesa = mesaAgenda?.dimensionesONU || [];
  const aforoEstimado = mesaAgenda?.id ? COORDENADAS_AGENDA_MESAS[mesaAgenda.id]?.aforo : undefined;

  // Submesas disponibles para elegir
  const listaSubmesas =
    mesaStore?.submesas.map((s) => s.nombre) ||
    contenido?.submesasSugeridas?.map((s) => s.nombre) ||
    [];

  // Estados del formulario
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("CC");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [genero, setGenero] = useState<Genero>("mujer");
  const [enfoqueDiferencial, setEnfoqueDiferencial] = useState<EnfoqueDiferencial>("ninguno");
  const [organizacionOBarrio, setOrganizacionOBarrio] = useState("");
  const [sugerenciaBarrio, setSugerenciaBarrio] = useState<string | null>(null);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState("");
  const [correo, setCorreo] = useState("");
  const [subMesaAsignada, setSubMesaAsignada] = useState<string>("Plenaria General");
  const [aceptaHabeasData, setAceptaHabeasData] = useState(true);

  const [enviando, setEnviando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState<RegistroAsistencia | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!nombreCompleto.trim()) {
      setErrorValidacion("Por favor escribe tus nombres y apellidos completos.");
      return;
    }
    if (!numeroDocumento.trim()) {
      setErrorValidacion("El número de documento de identidad es obligatorio.");
      return;
    }
    if (!organizacionOBarrio.trim()) {
      setErrorValidacion("Por favor indica el barrio de residencia o la organización a la que perteneces.");
      return;
    }
    if (!aceptaHabeasData) {
      setErrorValidacion("Debes autorizar el tratamiento institucional de datos (Ley 1581 de 2012).");
      return;
    }

    setEnviando(true);
    try {
      const input: NuevoAsistenteInput = {
        mesaId,
        nombreCompleto: nombreCompleto.trim(),
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        genero,
        enfoqueDiferencial,
        organizacionOBarrio: organizacionOBarrio.trim(),
        telefonoWhatsApp: telefonoWhatsApp.trim() || undefined,
        correo: correo.trim() || undefined,
        subMesaAsignada: subMesaAsignada === "Plenaria General" ? undefined : subMesaAsignada,
      };

      const creado = await registrarAsistente(input);
      if (creado.pendienteSincronizacion || (typeof navigator !== "undefined" && !navigator.onLine)) {
        await guardarPendiente("asistencias_pendientes", {
          id: creado.id,
          mesaId,
          datos: input as unknown as Record<string, unknown>,
          creadoEn: new Date().toISOString(),
          intentos: 0,
          estado: "pendiente",
        });
      }
      setRegistroExitoso(creado);
    } catch {
      setErrorValidacion("Ocurrió un error al guardar el registro. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const handleSincronizarPendientes = async () => {
    setSincronizando(true);
    setMensajeSincronizacion(null);
    try {
      await sincronizarTodo();
      const res = await sincronizarPendientes(mesaId);
      if (res.exitosos > 0) {
        setMensajeSincronizacion(`Se sincronizaron exitosamente ${res.exitosos} registro(s) con PostgreSQL.`);
      } else if (res.fallidos > 0) {
        setMensajeSincronizacion(
          "No fue posible conectar con el servidor central. Los datos continúan protegidos localmente en IndexedDB."
        );
      }
    } catch {
      setMensajeSincronizacion("Fallo temporal de conexión al sincronizar.");
    } finally {
      setSincronizando(false);
    }
  };

  const handleReiniciar = () => {
    setNombreCompleto("");
    setNumeroDocumento("");
    setOrganizacionOBarrio("");
    setSugerenciaBarrio(null);
    setTelefonoWhatsApp("");
    setCorreo("");
    setRegistroExitoso(null);
    setErrorValidacion(null);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] overflow-x-hidden">
      {/* Barra institucional adaptable */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)] py-3.5 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ember)] text-[var(--surface-0)] font-bold text-sm shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Alcaldía Mayor de Cartagena de Indias
              </p>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                Secretaría del Interior y Convivencia • POLIS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-semibold tracking-wider border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
            >
              Ley Estatutaria 1757 de 2015
            </Badge>
            {codigoMesa && (
              <Badge
                variant="ember"
                className="text-[11px] font-mono font-bold"
              >
                {codigoMesa}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor Principal Adaptativo */}
      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20 py-6 md:py-10">
        {/* Banner de Sincronización Offline si existen registros pendientes */}
        {pendientesSincronizacion.length > 0 && !registroExitoso && (
          <div className="mb-6 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-[var(--warning)]">
              <CloudOff className="size-5 shrink-0" />
              <span>
                <strong>{pendientesSincronizacion.length} asistente(s)</strong> registrados en modo contingencia local pendientes de subir a PostgreSQL.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 border-[var(--warning)]/40 text-[var(--warning)] hover:bg-[var(--warning)]/20 shrink-0"
              disabled={sincronizando}
              onClick={handleSincronizarPendientes}
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${sincronizando ? "animate-spin" : ""}`} />
              {sincronizando ? "Subiendo…" : "Sincronizar Ahora"}
            </Button>
          </div>
        )}

        {mensajeSincronizacion && !registroExitoso && (
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)] flex justify-between items-center gap-3">
            <span>{mensajeSincronizacion}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setMensajeSincronizacion(null)}
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Layout Adaptativo Responsivo */}
        {registroExitoso ? (
          /* Vista de Éxito Amplia y Centrada */
          <div className="w-full max-w-3xl mx-auto py-6">
            <div
              className={`space-y-6 rounded-2xl border p-6 sm:p-10 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200 bg-[var(--surface-1)] ${
                registroExitoso.pendienteSincronizacion
                  ? "border-[var(--warning)]/40"
                  : "border-[var(--success)]/40"
              }`}
            >
              <div
                className={`mx-auto flex size-16 items-center justify-center rounded-full ${
                  registroExitoso.pendienteSincronizacion
                    ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                    : "bg-[var(--success)]/15 text-[var(--success)]"
                }`}
              >
                <CheckCircle2 className="size-9" />
              </div>

              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className={`font-medium ${
                    registroExitoso.pendienteSincronizacion
                      ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30"
                      : "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30"
                  }`}
                >
                  {registroExitoso.pendienteSincronizacion
                    ? "Modo Contingencia Local — Radicado en Dispositivo"
                    : "Registro Oficial Confirmado (PostgreSQL)"}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  {registroExitoso.pendienteSincronizacion
                    ? "¡Asistencia radicada localmente!"
                    : "¡Registro de Asistencia Confirmado!"}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
                  {registroExitoso.pendienteSincronizacion
                    ? "Tu registro quedó asegurado en la memoria del dispositivo. Se sincronizará automáticamente con PostgreSQL al detectar conexión al servidor distrital."
                    : "Gracias por participar y construir la Seguridad Humana Integral de Cartagena de Indias."}
                </p>
              </div>

              {/* Comprobante digital */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-5 sm:p-6 text-left text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between items-center pb-2.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-tertiary)] font-mono text-xs">
                    {registroExitoso.pendienteSincronizacion ? "Radicado Local:" : "ID PostgreSQL:"}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {registroExitoso.pendienteSincronizacion
                      ? `LOCAL-${registroExitoso.id.toUpperCase().slice(-8)}`
                      : `PG-${registroExitoso.id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Asistente:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {registroExitoso.nombreCompleto}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Documento:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {registroExitoso.tipoDocumento} {registroExitoso.numeroDocumento}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Enfoque:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {ENFOQUES_DIFERENCIALES_LABELS[registroExitoso.enfoqueDiferencial]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Barrio / JAC:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {registroExitoso.organizacionOBarrio}
                  </span>
                </div>
                {registroExitoso.subMesaAsignada && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Submesa:</span>
                    <span className="font-medium text-[var(--ember)]">
                      {registroExitoso.subMesaAsignada}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)]">
                  <span>Hora de ingreso:</span>
                  <span>{new Date(registroExitoso.horaRegistro).toLocaleTimeString("es-CO")}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleReiniciar}
                >
                  <RotateCcw className="size-4 mr-2" />
                  Registrar a otro participante
                </Button>
                <Link href="/" className="w-full">
                  <Button variant="ghost" className="w-full h-11 text-xs text-[var(--text-tertiary)]">
                    Explorar plataforma POLIS
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Layout Adaptativo Responsivo a 2 Columnas */
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10 items-start">
            {/* Columna Izquierda: Información de la Mesa (Sticky en desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 mb-6 lg:mb-0 space-y-5 lg:sticky lg:top-8">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ember)] uppercase tracking-wider">
                    <ShieldCheck className="size-4" />
                    <span>Planilla Oficial en Puerta</span>
                  </div>
                  {codigoMesa && (
                    <Badge
                      variant="ember"
                      className="font-mono text-[11px] font-bold"
                    >
                      {codigoMesa}
                    </Badge>
                  )}
                </div>

                <h1 className="mt-2 text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)]">
                  {nombreMesa}
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  {territorioMesa}
                </p>

                {/* Ficha de Detalles de la Mesa */}
                <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-4 text-[var(--ember)] shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {(() => {
                        try {
                          return format(new Date(`${fechaMesa}T12:00:00`), "d 'de' MMMM, yyyy", { locale: es });
                        } catch {
                          return fechaMesa;
                        }
                      })()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock className="size-4 text-[var(--text-tertiary)] shrink-0" />
                    <span>{horarioMesa}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="size-4 text-[var(--text-tertiary)] shrink-0 mt-0.5" />
                    <span className="leading-snug">{lugarMesa}</span>
                  </div>

                  {dimensionesMesa.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {dimensionesMesa.map((dim, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)]"
                        >
                          {dim}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Estado de Conectividad y Asistentes Registrados */}
                <div className="mt-5 border-t border-[var(--border)] pt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      <span
                        className={`size-2 rounded-full ${
                          estaOnline ? "bg-[var(--success)]" : "bg-[var(--warning)]"
                        }`}
                      />
                      <span>Conectividad:</span>
                    </span>
                    <span
                      className={`font-semibold ${
                        estaOnline ? "text-[var(--success)]" : "text-[var(--warning)]"
                      }`}
                    >
                      {estaOnline ? "En Línea (PostgreSQL)" : "Contingencia Offline"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      <Users className="size-3.5" />
                      <span>Asistentes registrados:</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {registrosMesa.length} {aforoEstimado ? `/ ${aforoEstimado} aforo estimado` : "participante(s)"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Aviso de Garantía y Validez Legal */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 text-xs text-[var(--text-secondary)] space-y-2">
                <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Compass className="size-3.5 text-[var(--ember)]" />
                  Participación Ciudadana Vinculante
                </p>
                <p className="leading-relaxed">
                  Este registro digital consolida la asistencia formal a las mesas de diagnóstico y co-creación de la Política Pública de Seguridad Humana Integral de Cartagena. Diligenciarlo toma menos de 30 segundos.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Formulario de Registro */}
            <div className="lg:col-span-7 xl:col-span-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-8 xl:p-10 shadow-sm"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-5 text-[var(--ember)]" />
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                        Planilla de Ingreso
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Ingrese los datos del participante
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-2)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                    ~30 segundos
                  </span>
                </div>

                {errorValidacion && (
                  <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3.5 text-xs text-[var(--danger)] font-medium">
                    {errorValidacion}
                  </div>
                )}

                {/* Nombres y Apellidos + Documento de Identidad */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
                  <div className="xl:col-span-6 space-y-1.5">
                    <Label htmlFor="nombreCompleto" className="text-xs font-semibold">
                      Nombres y Apellidos *
                    </Label>
                    <Input
                      id="nombreCompleto"
                      type="text"
                      placeholder="Ej. María Josefa Díaz Pérez"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      required
                      autoComplete="name"
                      className="h-11 text-sm"
                    />
                  </div>

                  <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label htmlFor="tipoDoc" className="text-xs font-semibold">
                        Tipo Doc. *
                      </Label>
                      <Select
                        value={tipoDocumento}
                        onValueChange={(val) => setTipoDocumento(val as TipoDocumento)}
                      >
                        <SelectTrigger id="tipoDoc" className="h-11 text-sm">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TIPOS_DOCUMENTO_LABELS) as TipoDocumento[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-8 space-y-1.5">
                      <Label htmlFor="numDoc" className="text-xs font-semibold">
                        Número de Documento *
                      </Label>
                      <Input
                        id="numDoc"
                        type="text"
                        placeholder="Número de cédula o identificación"
                        value={numeroDocumento}
                        onChange={(e) => setNumeroDocumento(e.target.value)}
                        required
                        className="h-11 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Género, Enfoque Diferencial y Barrio en Grid Armónico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
                  {/* Género */}
                  <div className="xl:col-span-3 space-y-1.5">
                    <Label htmlFor="genero" className="text-xs font-semibold">
                      Identidad de Género *
                    </Label>
                    <Select
                      value={genero}
                      onValueChange={(val) => setGenero(val as Genero)}
                    >
                      <SelectTrigger id="genero" className="h-11 text-sm">
                        <SelectValue placeholder="Selecciona género" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(GENEROS_LABELS) as Genero[]).map((g) => (
                          <SelectItem key={g} value={g}>
                            {GENEROS_LABELS[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enfoque Diferencial */}
                  <div className="xl:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enfoque" className="text-xs font-semibold">
                        Enfoque Poblacional / Étnico *
                      </Label>
                    </div>
                    <Select
                      value={enfoqueDiferencial}
                      onValueChange={(val) => setEnfoqueDiferencial(val as EnfoqueDiferencial)}
                    >
                      <SelectTrigger id="enfoque" className="h-11 text-sm">
                        <SelectValue placeholder="Selecciona enfoque" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {(Object.keys(ENFOQUES_DIFERENCIALES_LABELS) as EnfoqueDiferencial[]).map((ef) => (
                          <SelectItem key={ef} value={ef}>
                            {ENFOQUES_DIFERENCIALES_LABELS[ef]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Barrio u Organización */}
                  <div className="sm:col-span-2 xl:col-span-5 space-y-1.5">
                    <Label htmlFor="barrio" className="text-xs font-semibold">
                      Barrio, Corregimiento o JAC / Organización Comunitaria *
                    </Label>
                    <Input
                      id="barrio"
                      type="text"
                      placeholder="Ej. Getsemaní, Olaya Herrera, JAC Sector Central, Consejo Comunitario..."
                      value={organizacionOBarrio}
                      onChange={(e) => {
                        setOrganizacionOBarrio(e.target.value);
                        if (sugerenciaBarrio) setSugerenciaBarrio(null);
                      }}
                      onBlur={async () => {
                        const q = organizacionOBarrio.trim();
                        if (q.length >= 3 && !q.toLowerCase().startsWith("jac") && !q.toLowerCase().startsWith("consejo")) {
                          const est = await estandarizarDireccion(q);
                          if (est && est.sector_o_barrio && est.sector_o_barrio.toLowerCase() !== q.toLowerCase()) {
                            setSugerenciaBarrio(est.sector_o_barrio);
                          }
                        }
                      }}
                      required
                      className="h-11 text-sm"
                    />
                    {sugerenciaBarrio && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOrganizacionOBarrio(sugerenciaBarrio);
                          setSugerenciaBarrio(null);
                        }}
                        className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 mt-1 p-0 h-auto font-medium justify-start"
                      >
                        <MapPin className="size-3 shrink-0" />
                        <span>Sugerencia territorial: <strong>{sugerenciaBarrio}</strong> (Clic para aplicar)</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Teléfono / WhatsApp, Correo y Submesa en Grid Adaptativo */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${listaSubmesas.length > 0 ? "xl:grid-cols-3" : "xl:grid-cols-2"} gap-4 sm:gap-5`}>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono" className="text-xs font-semibold">
                      Teléfono / WhatsApp (Opcional)
                    </Label>
                    <Input
                      id="telefono"
                      type="tel"
                      placeholder="300 000 0000"
                      value={telefonoWhatsApp}
                      onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                      autoComplete="tel"
                      className="h-11 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="correo" className="text-xs font-semibold">
                      Correo Electrónico (Opcional)
                    </Label>
                    <Input
                      id="correo"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      autoComplete="email"
                      className="h-11 text-sm"
                    />
                  </div>

                  {listaSubmesas.length > 0 && (
                    <div className="sm:col-span-2 xl:col-span-1 space-y-1.5">
                      <Label htmlFor="submesa" className="text-xs font-semibold">
                        Submesa Temática de Interés
                      </Label>
                      <Select
                        value={subMesaAsignada}
                        onValueChange={setSubMesaAsignada}
                      >
                        <SelectTrigger id="submesa" className="h-11 text-sm">
                          <SelectValue placeholder="Elige la submesa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Plenaria General">Plenaria General (Sin submesa)</SelectItem>
                          {listaSubmesas.map((sm) => (
                            <SelectItem key={sm} value={sm}>
                              {sm}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Habeas Data */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="habeasData"
                      checked={aceptaHabeasData}
                      onCheckedChange={(checked) => setAceptaHabeasData(checked === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="habeasData"
                      className="text-xs leading-relaxed text-[var(--text-secondary)] font-normal cursor-pointer"
                    >
                      Autorizo el tratamiento de mis datos personales a la Alcaldía de Cartagena para los fines exclusivos del proceso de formulación y rendición de cuentas de la Política Pública de Seguridad Humana Integral (Ley 1581 de 2012 y Ley Estatutaria 1757 de 2015).
                    </Label>
                  </div>
                </div>

                {/* Botón de Enviar Adaptativo */}
                <Button
                  type="submit"
                  variant="ember"
                  size="lg"
                  className="w-full h-12 text-sm sm:text-base font-semibold shadow-md transition-all hover:scale-[1.01]"
                  disabled={enviando}
                >
                  {enviando ? "Registrando ingreso…" : "Confirmar Asistencia a la Mesa"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Pie de página oficial adaptable */}
      <footer className="mt-12 border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-tertiary)] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <div className="w-full text-center">
          <p className="font-medium text-[var(--text-secondary)]">
            POLIS • Sistema Distrital de Participación Ciudadana y Seguridad Humana
          </p>
          <p className="mt-1 text-[11px]">
            Cartagena de Indias — Distrito Turístico y Cultural • Alcaldía Mayor
          </p>
        </div>
      </footer>
    </div>
  );
}
