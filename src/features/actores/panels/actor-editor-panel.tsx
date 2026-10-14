"use client";

import {useState, type FormEvent} from "react";
import {toast} from "sonner";
import {
  Users,
  Building2,
  Lock,
  ShieldCheck,
  Target
} from "lucide-react";
import {PanelShell} from "@/core/panels/panel-shell";
import {usePanels} from "@/core/panels/panel-store";
import type {PanelComponentProps} from "@/core/panels/panel-store";
import {Button} from "@/shared/ui/button";
import {FormField} from "@/shared/ui/form-field";
import {Input} from "@/shared/ui/input";
import {Textarea} from "@/shared/ui/textarea";
import {Badge} from "@/shared/ui/badge";
import {Label} from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shared/ui/select";
import {useSesionStore} from "@/features/sesion/state/session-store";
import {puedeEditar} from "@/features/plataforma/models/acceso";
import type {
  NivelInteres,
  NivelPoder,
  PosturaActor,
  TerritorioActor,
  TipoActor
} from "../models/actor";
import {calcularCuadrante, useActoresStore} from "../state/actores-store";

const DIMENSIONES_OPCIONES = [
  { id: "personal", label: "Seguridad Personal / Convivencia" },
  { id: "comunitaria", label: "Seguridad Comunitaria / Étnica" },
  { id: "ambiental", label: "Seguridad Ambiental / Ecoterritorial" },
  { id: "economica", label: "Seguridad Económica / Empleo" },
  { id: "alimentaria", label: "Seguridad Alimentaria" },
  { id: "salud", label: "Seguridad en Salud Pública" },
  { id: "politica", label: "Seguridad Política / Gobernanza" },
  { id: "crisis", label: "Crisis / Alertas Tempranas" },
];

export function ActorEditorPanel({ entryKey, props }: PanelComponentProps<"actor-editor">) {
  const { closeTop } = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const actorId = props.actorId;

  const actor = useActoresStore((s) => (actorId ? s.getById(actorId) : undefined));
  const actualizarActor = useActoresStore((s) => s.actualizarActor);
  const agregarActor = useActoresStore((s) => s.agregarActor);

  const tienePermisoEscritura = puedeEditar(sesion, "actores") && !props.soloLectura;

  // Estados del formulario
  const [nombre, setNombre] = useState(actor?.nombre ?? "");
  const [codigo, setCodigo] = useState(actor?.codigo ?? `ACT-${Date.now().toString().slice(-4)}`);
  const [tipo, setTipo] = useState<TipoActor>(actor?.tipo ?? "comunitario");
  const [territorio, setTerritorio] = useState<TerritorioActor>(
    actor?.territorio ?? "distrital"
  );
  const [barrioVereda, setBarrioVereda] = useState(actor?.barrioVereda ?? "");
  const [nivelPoder, setNivelPoder] = useState<NivelPoder>(actor?.nivelPoder ?? "medio");
  const [nivelInteres, setNivelInteres] = useState<NivelInteres>(
    actor?.nivelInteres ?? "alto"
  );
  const [postura, setPostura] = useState<PosturaActor>(
    actor?.postura ?? "promotor_aliado"
  );

  const [dimensiones, setDimensiones] = useState<string[]>(
    actor?.dimensionesPrincipales ?? ["personal", "comunitaria"]
  );

  // Contacto
  const [nombreLider, setNombreLider] = useState(actor?.contacto.nombreLider ?? "");
  const [cargo, setCargo] = useState(actor?.contacto.cargo ?? "");
  const [organizacion, setOrganizacion] = useState(actor?.contacto.organizacion ?? "");
  const [telefono, setTelefono] = useState(actor?.contacto.telefono ?? "");
  const [email, setEmail] = useState(actor?.contacto.email ?? "");
  const [direccion, setDireccion] = useState(actor?.contacto.direccion ?? "");

  // Análisis
  const [expectativas, setExpectativas] = useState(actor?.expectativasPrincipales ?? "");
  const [acciones, setAcciones] = useState(actor?.accionesInvolucramiento ?? "");

  const cuadranteCalculado = calcularCuadrante(nivelPoder, nivelInteres);

  const toggleDimension = (dimId: string) => {
    if (!tienePermisoEscritura) return;
    setDimensiones((prev) =>
      prev.includes(dimId) ? prev.filter((d) => d !== dimId) : [...prev, dimId]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tienePermisoEscritura) {
      toast.error("No tienes permisos para modificar actores");
      return;
    }

    if (!nombre.trim()) {
      toast.error("El nombre del actor u organización es obligatorio");
      return;
    }

    if (actor) {
      const ok = await actualizarActor(actor.id, {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        tipo,
        territorio,
        barrioVereda: barrioVereda.trim() || undefined,
        nivelPoder,
        nivelInteres,
        postura,
        dimensionesPrincipales: dimensiones,
        contacto: {
          nombreLider: nombreLider.trim(),
          cargo: cargo.trim(),
          organizacion: organizacion.trim() || nombre.trim(),
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          direccion: direccion.trim() || undefined,
        },
        expectativasPrincipales: expectativas.trim(),
        accionesInvolucramiento: acciones.trim(),
      });
      if (ok) {
        toast.success("Actor estratégico actualizado");
        closeTop();
      } else {
        toast.error("Error al actualizar actor estratégico en el servidor");
      }
    } else {
      const ok = await agregarActor({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        tipo,
        territorio,
        barrioVereda: barrioVereda.trim() || undefined,
        nivelPoder,
        nivelInteres,
        postura,
        dimensionesPrincipales: dimensiones,
        contacto: {
          nombreLider: nombreLider.trim(),
          cargo: cargo.trim(),
          organizacion: organizacion.trim() || nombre.trim(),
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          direccion: direccion.trim() || undefined,
        },
        expectativasPrincipales: expectativas.trim(),
        accionesInvolucramiento: acciones.trim(),
      });
      if (ok) {
        toast.success("Nuevo actor registrado en el directorio");
        closeTop();
      } else {
        toast.error("Error al registrar actor estratégico en el servidor");
      }
    }
  };

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Directorio de Actores" }]}
      kicker="Gobernanza y Relacionamiento · Ley 1757/15"
      title={actor ? `${actor.codigo} · ${actor.nombre}` : "Nuevo Actor Estratégico"}
      subtitle={
        actor
          ? `Caracterización y matriz de involucramiento de ${actor.contacto.organizacion}`
          : "Registra y mapea un actor clave en la política pública de seguridad humana."
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
        {!tienePermisoEscritura && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning-soft p-4 text-xs text-warning">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            <div>
              <strong className="block font-semibold">Modo solo lectura</strong>
              <span>
                Tu rol actual ({sesion?.rol ?? "auditor"}) dispone de acceso de auditoría y
                consulta. Los controles de edición se encuentran deshabilitados.
              </span>
            </div>
          </div>
        )}

        {/* Ficha de Posicionamiento en Matriz */}
        <section className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Target className="size-3.5 text-ember" aria-hidden="true" />
              Posición Resultante en Matriz 2x2
            </span>
            <Badge
              variant={
                cuadranteCalculado === "aliados_clave"
                  ? "ember"
                  : cuadranteCalculado === "incidencia_estrategica"
                  ? "info"
                  : cuadranteCalculado === "base_social"
                  ? "success"
                  : "outline"
              }
              className="text-xs"
            >
              {cuadranteCalculado === "aliados_clave"
                ? "1. Aliados Clave (Gestionar de cerca)"
                : cuadranteCalculado === "incidencia_estrategica"
                ? "2. Incidencia Estratégica (Mantener satisfechos)"
                : cuadranteCalculado === "base_social"
                ? "3. Base Social (Mantener informados)"
                : "4. Monitoreo (Mínimo esfuerzo)"}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Determinada automáticamente según el cruce entre el <strong>Poder de decisión</strong> ({nivelPoder}) y el <strong>Interés manifestado</strong> ({nivelInteres}).
          </p>
        </section>

        {/* Identificación del Actor */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users className="size-4 text-ember" aria-hidden="true" />
            <span>Identificación y Tipología</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FormField label="Nombre del actor / colectivo / entidad" required>
                {(field) => (
                  <Input
                    {...field}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="ej. Consejo Comunitario de La Boquilla"
                    disabled={!tienePermisoEscritura}
                    maxLength={150}
                  />
                )}
              </FormField>
            </div>

            <div>
              <FormField label="Código de registro">
                {(field) => (
                  <Input
                    {...field}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    disabled={!tienePermisoEscritura}
                    maxLength={30}
                  />
                )}
              </FormField>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo de actor">
              {(field) => (
                <Select
                  value={tipo}
                  onValueChange={(val) => setTipo(val as TipoActor)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="institucional">Institucional / Público</SelectItem>
                    <SelectItem value="comunitario">Comunitario / Vecinal</SelectItem>
                    <SelectItem value="sociedad_civil">Sociedad Civil / ONG</SelectItem>
                    <SelectItem value="gremial_privado">Gremial / Sector Privado</SelectItem>
                    <SelectItem value="academia">Academia / Centro de Estudio</SelectItem>
                    <SelectItem value="poblacional_diferencial">
                      Poblacional / Protección Diferencial
                    </SelectItem>
                    <SelectItem value="cooperacion_internacional">
                      Cooperación Internacional
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="Ámbito territorial">
              {(field) => (
                <Select
                  value={territorio}
                  onValueChange={(val) => setTerritorio(val as TerritorioActor)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distrital">Distrital (Todo Cartagena)</SelectItem>
                    <SelectItem value="localidad_1">Localidad 1 (Histórica y del Caribe Norte)</SelectItem>
                    <SelectItem value="localidad_2">Localidad 2 (De la Virgen y Turística)</SelectItem>
                    <SelectItem value="localidad_3">Localidad 3 (Industrial y de la Bahía)</SelectItem>
                    <SelectItem value="rural_insular">Zona Corregimental e Insular</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <FormField label="Barrio, vereda o sector específico">
            {(field) => (
              <Input
                {...field}
                value={barrioVereda}
                onChange={(e) => setBarrioVereda(e.target.value)}
                placeholder="ej. Olaya Herrera, Tierrabomba, Nelson Mandela, etc."
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>
        </div>

        {/* Clasificación Estratégica (Poder vs Interés y Postura) */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <ShieldCheck className="size-4 text-ember" aria-hidden="true" />
            <span>Clasificación Política y Metodológica</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Nivel de poder de decisión">
              {(field) => (
                <Select
                  value={nivelPoder}
                  onValueChange={(val) => setNivelPoder(val as NivelPoder)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alto">Alto (Capacidad de veto o presupuesto)</SelectItem>
                    <SelectItem value="medio">Medio (Capacidad de movilización)</SelectItem>
                    <SelectItem value="bajo">Bajo (Sin capacidad formal decisoria)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="Nivel de interés en la política">
              {(field) => (
                <Select
                  value={nivelInteres}
                  onValueChange={(val) => setNivelInteres(val as NivelInteres)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alto">Alto (Afectación directa o rol líder)</SelectItem>
                    <SelectItem value="medio">Medio (Impacto secundario)</SelectItem>
                    <SelectItem value="bajo">Bajo (Observador / Expectante)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label="Postura inicial identificada">
              {(field) => (
                <Select
                  value={postura}
                  onValueChange={(val) => setPostura(val as PosturaActor)}
                  disabled={!tienePermisoEscritura}
                >
                  <SelectTrigger {...field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotor_aliado">Promotor / Aliado</SelectItem>
                    <SelectItem value="neutral_expectante">Neutral / Expectante</SelectItem>
                    <SelectItem value="critico_opositor">Crítico / Opositor</SelectItem>
                    <SelectItem value="vulnerable_reclamante">Vulnerable / Reclamante</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          <div>
            <Label className="text-xs font-semibold text-text-primary block mb-2">
              Dimensiones de Seguridad Humana de Mayor Interés:
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIMENSIONES_OPCIONES.map((dim) => {
                const seleccionada = dimensiones.includes(dim.id);
                return (
                  <Button
                    key={dim.id}
                    type="button"
                    variant={seleccionada ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleDimension(dim.id)}
                    disabled={!tienePermisoEscritura}
                    className={`justify-start text-xs h-auto py-2 px-3 text-left whitespace-normal ${
                      seleccionada ? "border-ember/40 font-semibold" : ""
                    }`}
                  >
                    <span>{dim.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contacto del Actor */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Building2 className="size-4 text-ember" aria-hidden="true" />
            <span>Contacto Institucional y Enlace</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre del líder o representante" required>
              {(field) => (
                <Input
                  {...field}
                  value={nombreLider}
                  onChange={(e) => setNombreLider(e.target.value)}
                  placeholder="ej. Dra. Eliana Salas"
                  disabled={!tienePermisoEscritura}
                  maxLength={120}
                />
              )}
            </FormField>

            <FormField label="Cargo o rol en la organización">
              {(field) => (
                <Input
                  {...field}
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="ej. Directora Ejecutiva, Presidente JAC"
                  disabled={!tienePermisoEscritura}
                  maxLength={120}
                />
              )}
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Organización / Colectivo">
              {(field) => (
                <Input
                  {...field}
                  value={organizacion}
                  onChange={(e) => setOrganizacion(e.target.value)}
                  placeholder="Nombre de la entidad u ONG"
                  disabled={!tienePermisoEscritura}
                  maxLength={150}
                />
              )}
            </FormField>

            <FormField label="Dirección física / Sede comunal">
              {(field) => (
                <Input
                  {...field}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Barrio, calle, sede"
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Teléfono / Celular">
              {(field) => (
                <Input
                  {...field}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>

            <FormField label="Correo electrónico">
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@organizacion.org"
                  disabled={!tienePermisoEscritura}
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Expectativas y Estrategia */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Target className="size-4 text-ember" aria-hidden="true" />
            <span>Expectativas y Estrategia de Relacionamiento</span>
          </h3>

          <FormField
            label="Expectativas principales frente a la política pública"
            description="Demandas clave, problemáticas señaladas o propuestas de impacto."
          >
            {(field) => (
              <Textarea
                {...field}
                value={expectativas}
                onChange={(e) => setExpectativas(e.target.value)}
                placeholder="Indica qué espera este actor de la Política de Seguridad Humana..."
                rows={3}
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>

          <FormField
            label="Acciones de involucramiento y diálogo acordadas"
            description="Estrategia institucional para gestionar su participación vinculante (mesas, acuerdos, veedurías)."
          >
            {(field) => (
              <Textarea
                {...field}
                value={acciones}
                onChange={(e) => setAcciones(e.target.value)}
                placeholder="ej. Convocatoria a mesa temática de juventud, concertación de salvaguarda étnica..."
                rows={3}
                disabled={!tienePermisoEscritura}
              />
            )}
          </FormField>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" type="button" onClick={closeTop}>
            {tienePermisoEscritura ? "Cancelar" : "Cerrar"}
          </Button>
          {tienePermisoEscritura && (
            <Button variant="default" type="submit">
              {actor ? "Guardar Cambios" : "Registrar Actor"}
            </Button>
          )}
        </div>
      </form>
    </PanelShell>
  );
}
