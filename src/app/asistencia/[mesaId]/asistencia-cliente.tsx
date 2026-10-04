"use client";

import {useState, useEffect} from "react";
import Link from "next/link";
import {format} from "date-fns";
import {es} from "date-fns/locale";
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
} from "lucide-react";
import {Button} from "@/shared/ui/button";
import {Input} from "@/shared/ui/input";
import {Label} from "@/shared/ui/label";
import {Checkbox} from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {Badge} from "@/shared/ui/badge";
import {AGENDA_MESAS} from "@/features/mesas/data/agenda.data";
import {useAgendaStore} from "@/features/mesas/state/agenda-store";
import {CONTENIDO_MESAS} from "@/features/mesas/data/agenda-contenido.data";
import {useMesasStore} from "@/features/mesas/state/mesas-store";
import {
  useAsistenciaStore,
  useRegistrosMesa,
  type NuevoAsistenteInput
} from "@/features/mesas/state/asistencia-store";
import {
  type EnfoqueDiferencial,
  type TipoDocumento,
  type Genero,
  type RegistroAsistencia,
  ENFOQUES_DIFERENCIALES_LABELS,
  TIPOS_DOCUMENTO_LABELS,
  GENEROS_LABELS
} from "@/features/mesas/models/asistencia";

export function AsistenciaCliente({ mesaId }: { mesaId: string }) {
  const registrarAsistente = useAsistenciaStore((s) => s.registrarAsistente);
  const sincronizarPendientes = useAsistenciaStore((s) => s.sincronizarPendientes);
  const cargarAsistentesDesdeBackend = useAsistenciaStore((s) => s.cargarAsistentesDesdeBackend);
  const registrosMesa = useRegistrosMesa(mesaId);
  const pendientesSincronizacion = registrosMesa.filter((r) => r.pendienteSincronizacion);

  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSincronizacion, setMensajeSincronizacion] = useState<string | null>(null);

  useEffect(() => {
    useAgendaStore.getState().cargarAgendas();
    cargarAsistentesDesdeBackend(mesaId);
  }, [mesaId, cargarAsistentesDesdeBackend]);
  const mesaStore = useMesasStore((s) => s.mesas.find((m) => m.id === mesaId));
  const agendaDinamica = useAgendaStore((s) => s.agendas.find((m) => m.id === mesaId));
  const mesaAgenda = agendaDinamica || AGENDA_MESAS.find((m) => m.id === mesaId);
  const contenido = CONTENIDO_MESAS[mesaId];

  const nombreMesa =
    mesaStore?.nombre || mesaAgenda?.nombre || `Mesa de Trabajo (${mesaId})`;
  const lugarMesa =
    mesaStore?.lugar || mesaAgenda?.lugar || "Cartagena de Indias";
  const fechaMesa = mesaStore?.fecha || mesaAgenda?.fecha || "2026-10-15";
  const horarioMesa =
    mesaStore?.horario ||
    (mesaAgenda ? `${mesaAgenda.horaInicio} – ${mesaAgenda.horaFin}` : "08:30 – 12:00");
  const territorioMesa =
    mesaAgenda?.territorio || "Distrito Turístico y Cultural de Cartagena de Indias";

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
      const res = await sincronizarPendientes(mesaId);
      if (res.exitosos > 0) {
        setMensajeSincronizacion(`Se sincronizaron exitosamente ${res.exitosos} registro(s) con PostgreSQL.`);
      } else if (res.fallidos > 0) {
        setMensajeSincronizacion("No fue posible conectar con el servidor central. Los datos continúan protegidos localmente.");
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
    setTelefonoWhatsApp("");
    setCorreo("");
    setRegistroExitoso(null);
    setErrorValidacion(null);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Barra institucional de la Alcaldía */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)] py-3 px-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--ember)] text-[var(--surface-0)] font-bold text-sm shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Alcaldía Mayor de Cartagena
              </p>
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Secretaría de Planeación Distrital
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Decreto 037 / 2026
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Tarjeta de la Mesa */}
        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ember)] uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Registro Digital en Puerta</span>
          </div>

          <h1 className="mt-1.5 text-lg font-bold leading-snug text-[var(--text-primary)]">
            {nombreMesa}
          </h1>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {territorioMesa}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
              <span>
                {(() => {
                  try {
                    return format(new Date(`${fechaMesa}T12:00:00`), "d 'de' MMMM, yyyy", { locale: es });
                  } catch {
                    return fechaMesa;
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-[var(--text-tertiary)] shrink-0" />
              <span>{horarioMesa}</span>
            </div>
            <div className="col-span-2 flex items-start gap-1.5">
              <MapPin className="size-3.5 text-[var(--text-tertiary)] shrink-0 mt-0.5" />
              <span className="truncate">{lugarMesa}</span>
            </div>
          </div>
        </section>

        {/* Banner de Sincronización Offline si existen registros pendientes en el dispositivo */}
        {pendientesSincronizacion.length > 0 && !registroExitoso && (
          <div className="mb-6 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3.5 flex items-center justify-between text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-[var(--warning)]">
              <CloudOff className="size-4 shrink-0" />
              <span>
                <strong>{pendientesSincronizacion.length} asistente(s)</strong> en modo contingencia local pendientes de subir a PostgreSQL.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 border-[var(--warning)]/40 text-[var(--warning)] hover:bg-[var(--warning)]/20"
              disabled={sincronizando}
              onClick={handleSincronizarPendientes}
            >
              <RefreshCw className={`size-3 mr-1.5 ${sincronizando ? "animate-spin" : ""}`} />
              {sincronizando ? "Subiendo…" : "Sincronizar"}
            </Button>
          </div>
        )}

        {mensajeSincronizacion && !registroExitoso && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-xs text-[var(--text-secondary)] flex justify-between items-center">
            <span>{mensajeSincronizacion}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[11px] h-6 px-1.5"
              onClick={() => setMensajeSincronizacion(null)}
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Vista de éxito tras registro */}
        {registroExitoso ? (
          <div className={`space-y-6 rounded-2xl border p-6 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200 bg-[var(--surface-1)] ${
            registroExitoso.pendienteSincronizacion ? "border-[var(--warning)]/40" : "border-[var(--success)]/40"
          }`}>
            <div className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              registroExitoso.pendienteSincronizacion
                ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                : "bg-[var(--success)]/15 text-[var(--success)]"
            }`}>
              <CheckCircle2 className="size-8" />
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
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {registroExitoso.pendienteSincronizacion
                  ? "¡Asistencia radicada localmente!"
                  : "¡Registro exitoso!"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {registroExitoso.pendienteSincronizacion
                  ? "Tu registro quedó asegurado en la memoria del dispositivo. Se sincronizará automáticamente con PostgreSQL al detectar conexión al servidor distrital."
                  : "Gracias por construir la Seguridad Humana Integral de Cartagena de Indias (2026–2036)."}
              </p>
            </div>

            {/* Comprobante digital */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-tertiary)] font-mono">
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
              <div className="flex justify-between pt-1 border-t border-[var(--border)] text-[10px] text-[var(--text-tertiary)]">
                <span>Hora de ingreso:</span>
                <span>{new Date(registroExitoso.horaRegistro).toLocaleTimeString("es-CO")}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReiniciar}
              >
                <RotateCcw className="size-4 mr-2" />
                Registrar a otro participante
              </Button>
              <Link href="/" className="w-full">
                <Button variant="ghost" className="w-full text-xs text-[var(--text-tertiary)]">
                  Explorar plataforma POLIS
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Formulario de Registro rápido (<30 segundos) */
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-[var(--ember)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Planilla de Ingreso
                </h2>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Paso rápido en 30s
              </span>
            </div>

            {errorValidacion && (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
                {errorValidacion}
              </div>
            )}

            {/* Nombres y Apellidos */}
            <div className="space-y-1.5">
              <Label htmlFor="nombreCompleto">Nombres y Apellidos *</Label>
              <Input
                id="nombreCompleto"
                type="text"
                placeholder="Ej. María Josefa Díaz Pérez"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            {/* Documento de Identidad */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="tipoDoc">Tipo Doc. *</Label>
                <Select
                  value={tipoDocumento}
                  onValueChange={(val) => setTipoDocumento(val as TipoDocumento)}
                >
                  <SelectTrigger id="tipoDoc">
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
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="numDoc">Número de Documento *</Label>
                <Input
                  id="numDoc"
                  type="text"
                  placeholder="Número de cédula o ID"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Género */}
            <div className="space-y-1.5">
              <Label htmlFor="genero">Identidad de Género *</Label>
              <Select
                value={genero}
                onValueChange={(val) => setGenero(val as Genero)}
              >
                <SelectTrigger id="genero">
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="enfoque">Enfoque Poblacional / Étnico *</Label>
                <Badge variant="outline" className="text-[10px]">
                  Ley 1757
                </Badge>
              </div>
              <Select
                value={enfoqueDiferencial}
                onValueChange={(val) => setEnfoqueDiferencial(val as EnfoqueDiferencial)}
              >
                <SelectTrigger id="enfoque">
                  <SelectValue placeholder="Selecciona enfoque diferencial" />
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
            <div className="space-y-1.5">
              <Label htmlFor="barrio">Barrio, Corregimiento o JAC / Organización *</Label>
              <Input
                id="barrio"
                type="text"
                placeholder="Ej. Getsemaní, Olaya Herrera, JAC Sector Central..."
                value={organizacionOBarrio}
                onChange={(e) => setOrganizacionOBarrio(e.target.value)}
                required
              />
            </div>

            {/* Teléfono / WhatsApp y Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono / WhatsApp (Opcional)</Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="300 000 0000"
                  value={telefonoWhatsApp}
                  onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correo">Correo Electrónico (Opcional)</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submesa Asignada (si existen submesas) */}
            {listaSubmesas.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="submesa">Submesa Temática de Interés</Label>
                <Select
                  value={subMesaAsignada}
                  onValueChange={setSubMesaAsignada}
                >
                  <SelectTrigger id="submesa">
                    <SelectValue placeholder="Elige la submesa a participar" />
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

            {/* Habeas Data */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
              <div className="flex items-start gap-2.5">
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
                  Autorizo el tratamiento de mis datos personales a la Alcaldía de Cartagena para los fines del proceso de formulación de la Política Pública de Seguridad Humana Integral (Ley 1581 de 2012 y Ley 1757 de 2015).
                </Label>
              </div>
            </div>

            {/* Botón de Enviar */}
            <Button
              type="submit"
              variant="ember"
              size="lg"
              className="w-full text-base font-semibold shadow-md"
              disabled={enviando}
            >
              {enviando ? "Registrando ingreso…" : "Confirmar Asistencia a la Mesa"}
            </Button>
          </form>
        )}
      </main>

      {/* Pie de página oficial */}
      <footer className="mt-8 border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-tertiary)]">
        <p>POLIS • Sistema Distrital de Participación Ciudadana y Seguridad Humana</p>
        <p className="mt-1 text-[11px]">Cartagena de Indias — Distrito Turístico y Cultural</p>
      </footer>
    </div>
  );
}
