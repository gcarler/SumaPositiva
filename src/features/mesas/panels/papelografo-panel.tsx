"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CornerDownRight,
  Eraser,
  FileText,
  Trash2,
  Wand2,
} from "lucide-react";
import { PanelShell } from "@/components/panels/panel-shell";
import { usePanels, type ArbolPanel } from "@/stores/panel-store";
import { useMesa, useMesasStore, useSubMesa } from "@/stores/mesas-store";
import {
  RAMA_META,
  contarNodos,
  resumenProblemas,
  resumenSoluciones,
  solucionesExistentes,
  type NodoArbol,
  type RamaArbol,
} from "@/types/mesas";
import type { PanelPropsMap } from "@/stores/panel-store";

/**
 * Papelografo digital — el lienzo donde cada submesa diligencia su
 * árbol de problemas (problema central ← causas · efectos →) o su
 * árbol de soluciones (objetivo central ← medios · fines →).
 *
 * Estructura de jerarquía: nodos PRIMARIOS conectados al centro y
 * nodos SECUNDARIOS que derivan de un primario (pregunta encadenada
 * «¿y por qué eso ocurre?»).
 * Cero modales: toda edición es inline sobre el papel.
 */

type TabArbol = ArbolPanel;

const MAX_TEXTO_NODO = 180;
const MAX_TEXTO_CENTRAL = 220;

/* ================= tarjeta de nodo ================= */

interface NodoCardProps {
  nodo: NodoArbol;
  rama: RamaArbol;
  nivel: "primario" | "secundario";
  editando: boolean;
  onEditar: (id: string | null) => void;
  onGuardar: (id: string, texto: string) => void;
  onEliminar: (id: string) => void;
  onAgregarSecundaria: (parentId: string) => void;
}

function NodoCard({
  nodo,
  rama,
  nivel,
  editando,
  onEditar,
  onGuardar,
  onEliminar,
  onAgregarSecundaria,
}: NodoCardProps) {
  const meta = RAMA_META[rama];
  const [borrador, setBorrador] = useState("");

  const primario = nivel === "primario";
  const badge = meta.genero === "f" ? (primario ? "Primaria" : "Secundaria") : primario ? "Primario" : "Secundario";

  const comenzar = () => {
    setBorrador(nodo.texto);
    onEditar(nodo.id);
  };

  const confirmar = () => {
    const texto = borrador.trim();
    if (!texto) {
      // un sticker vacío no aporta: se elimina
      onEliminar(nodo.id);
      return;
    }
    if (texto !== nodo.texto) onGuardar(nodo.id, texto);
    onEditar(null);
  };

  return (
    <div
      className="rounded-lg border bg-[var(--surface-0)] p-3 transition-shadow"
      style={{
        borderColor: primario ? "var(--border)" : "var(--border)",
        borderLeft: `3px solid ${primario ? meta.colorVar : "var(--border-strong)"}`,
        boxShadow: primario ? "0 1px 2px oklch(0 0 0 / 0.04)" : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="label-micro"
          style={{ color: primario ? meta.colorVar : "var(--text-tertiary)" }}
        >
          {badge}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {primario && (
            <button
              type="button"
              onClick={() => onAgregarSecundaria(nodo.id)}
              title={`Añadir ${meta.singular} secundaria — pregunta «¿y por qué eso ocurre?»`}
              aria-label={`Añadir ${meta.singular} secundaria`}
              className="flex size-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            >
              <CornerDownRight className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEliminar(nodo.id)}
            title="Eliminar nodo"
            aria-label="Eliminar nodo"
            className="flex size-6 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {editando ? (
        <textarea
          autoFocus
          value={borrador}
          maxLength={MAX_TEXTO_NODO}
          rows={3}
          aria-label={`Texto de la ${meta.singular}`}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onEditar(null);
            }
          }}
          className="mt-1.5 w-full resize-none rounded-md border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-2 text-[13px] leading-snug text-[var(--text-primary)] focus:border-[var(--ember)] focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={comenzar}
          className={`mt-1 block w-full rounded-md px-1 py-0.5 text-left text-[13px] leading-snug transition-colors hover:bg-[var(--surface-2)] ${
            nodo.texto
              ? "text-[var(--text-primary)]"
              : "italic text-[var(--text-tertiary)]"
          }`}
        >
          {nodo.texto || "Clic para escribir…"}
        </button>
      )}
    </div>
  );
}

/* ================= columna de rama ================= */

interface ColumnaProps {
  rama: RamaArbol;
  nodos: NodoArbol[];
  editandoId: string | null;
  onEditar: (id: string | null) => void;
  onGuardar: (id: string, texto: string) => void;
  onEliminar: (id: string) => void;
  onAgregar: (parentId: string | null) => void;
}

function ColumnaArbol({
  rama,
  nodos,
  editandoId,
  onEditar,
  onGuardar,
  onEliminar,
  onAgregar,
}: ColumnaProps) {
  const meta = RAMA_META[rama];
  const total = contarNodos(nodos);

  return (
    <div className="min-w-0 space-y-3 lg:px-8">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-micro" style={{ color: meta.colorVar }}>
          {meta.label} — {meta.pregunta}
        </p>
        <span className="text-[10px] text-[var(--text-tertiary)] tabular">{total}</span>
      </div>

      {nodos.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-6 text-center">
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            Aún no hay {meta.label.toLowerCase()}. Piensen en grupo y agreguen la
            primera tarjeta: una idea por tarjeta, como en el papel.
          </p>
        </div>
      )}

      <ul className="space-y-2.5">
        {nodos.map((nodo) => (
          <li key={nodo.id}>
            <NodoCard
              nodo={nodo}
              rama={rama}
              nivel="primario"
              editando={editandoId === nodo.id}
              onEditar={onEditar}
              onGuardar={onGuardar}
              onEliminar={onEliminar}
              onAgregarSecundaria={(parentId) => onAgregar(parentId)}
            />

            {/* Secundarias colgando de la primaria */}
            {nodo.hijos.length > 0 && (
              <ul className="ml-5 mt-2 space-y-2 border-l border-[var(--border-strong)] pl-4">
                {nodo.hijos.map((hijo) => (
                  <li key={hijo.id} className="relative">
                    <span
                      className="absolute -left-4 top-7 h-px w-4 bg-[var(--border-strong)]"
                      aria-hidden
                    />
                    <NodoCard
                      nodo={hijo}
                      rama={rama}
                      nivel="secundario"
                      editando={editandoId === hijo.id}
                      onEditar={onEditar}
                      onGuardar={onGuardar}
                      onEliminar={onEliminar}
                      onAgregarSecundaria={onAgregarSecundariaNoAplica}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onAgregar(null)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] py-2.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
      >
        <span aria-hidden className="text-sm leading-none">+</span>
        Añadir {meta.singular} {meta.genero === "f" ? "primaria" : "primario"}
      </button>
    </div>
  );
}

function onAgregarSecundariaNoAplica(): void {
  /* las secundarias no admiten hijos: la jerarquía llega a 2 niveles */
}

/* ================= panel ================= */

export function PapelografoPanel({
  entryKey,
  props,
}: {
  entryKey: string;
  props: PanelPropsMap["papelografo"];
}) {
  const { closeTop, closeToKey } = usePanels();
  const mesa = useMesa(props.mesaId);
  const submesa = useSubMesa(props.mesaId, props.submesaId);

  const setTextoCentral = useMesasStore((s) => s.setTextoCentral);
  const setTextoNodo = useMesasStore((s) => s.setTextoNodo);
  const agregarNodo = useMesasStore((s) => s.agregarNodo);
  const eliminarNodo = useMesasStore((s) => s.eliminarNodo);
  const derivarSoluciones = useMesasStore((s) => s.derivarSoluciones);

  const [tab, setTab] = useState<TabArbol>(props.arbol);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoCentral, setEditandoCentral] = useState(false);
  const [borradorCentral, setBorradorCentral] = useState("");

  if (!mesa || !submesa) {
    return (
      <PanelShell
        entryKey={entryKey}
        crumbs={[{ label: "Mesas de trabajo" }]}
        title="Submesa no encontrada"
        onClose={closeTop}
        onCloseToKey={closeToKey}
      >
        <p className="p-6 text-sm text-[var(--text-secondary)]">
          Esta submesa ya no está disponible.
        </p>
      </PanelShell>
    );
  }

  const esProblemas = tab === "problemas";
  const arbolActivo = esProblemas ? submesa.arbolProblemas : submesa.arbolSoluciones;
  const ramaIzq: RamaArbol = esProblemas ? "causas" : "medios";
  const ramaDer: RamaArbol = esProblemas ? "efectos" : "fines";
  const nodosIzq = esProblemas ? arbolActivo.causas : arbolActivo.medios;
  const nodosDer = esProblemas ? arbolActivo.efectos : arbolActivo.fines;

  const centralActual = esProblemas
    ? submesa.arbolProblemas.problemaCentral
    : submesa.arbolSoluciones.objetivoCentral;

  const p = resumenProblemas(submesa);
  const s = resumenSoluciones(submesa);
  const haySoluciones = solucionesExistentes(submesa);

  const cambiarTab = (nuevo: TabArbol) => {
    setTab(nuevo);
    setEditandoId(null);
    setEditandoCentral(false);
  };

  /* ---------- acciones del papelografo ---------- */

  const agregar = (rama: RamaArbol, parentId: string | null) => {
    const id = agregarNodo(mesa.id, submesa.id, tab, rama, parentId);
    if (id) setEditandoId(id);
  };

  const guardarNodo = (rama: RamaArbol) => (nodoId: string, texto: string) =>
    setTextoNodo(mesa.id, submesa.id, tab, rama, nodoId, texto);

  const eliminarNodoEn = (rama: RamaArbol) => (nodoId: string) =>
    eliminarNodo(mesa.id, submesa.id, tab, rama, nodoId);

  const confirmarCentral = () => {
    setTextoCentral(mesa.id, submesa.id, tab, borradorCentral.trim());
    setEditandoCentral(false);
  };

  const derivar = () => {
    const ok = derivarSoluciones(mesa.id, submesa.id);
    if (ok) {
      toast.success("Árbol de soluciones derivado", {
        description:
          "Las causas se convirtieron en medios y los efectos en fines. Ajusta la redacción con la voz de la submesa.",
      });
      cambiarTab("soluciones");
    } else {
      toast.info("Ya existe un árbol de soluciones", {
        description: "Puedes seguirlo diligenciando en la pestaña correspondiente.",
      });
    }
  };

  const crumbs = [
    { label: "Mesas de trabajo" },
    { label: mesa.nombre, targetKey: props.fromKey },
  ];

  const resumenRamas = esProblemas
    ? `${p.ramaA} ${RAMA_META.causas.label.toLowerCase()} · ${p.ramaB} ${RAMA_META.efectos.label.toLowerCase()}`
    : `${s.ramaA} ${RAMA_META.medios.label.toLowerCase()} · ${s.ramaB} ${RAMA_META.fines.label.toLowerCase()}`;

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={crumbs}
      kicker={`Papelografo · Submesa: ${submesa.nombre}`}
      title={esProblemas ? "Árbol de problemas" : "Árbol de soluciones"}
      subtitle={submesa.tema || undefined}
      onClose={closeTop}
      onCloseToKey={closeToKey}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] leading-tight text-[var(--text-tertiary)] tabular">
            {resumenRamas} · {esProblemas ? p.total : s.total} nodos en el papel
          </p>
          {esProblemas && (
            <button
              type="button"
              onClick={derivar}
              disabled={!centralActual.trim() || haySoluciones}
              title={
                haySoluciones
                  ? "Esta submesa ya tiene árbol de soluciones"
                  : !centralActual.trim()
                    ? "Escribe primero el problema central"
                    : "Convierte causas en medios y efectos en fines"
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 className="size-3.5" strokeWidth={1.5} />
              Derivar árbol de soluciones
            </button>
          )}
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-10">
        {/* ---------- Pestañas ---------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1"
            role="tablist"
            aria-label="Elegir árbol a diligenciar"
          >
            {(
              [
                { id: "problemas", label: "Árbol de problemas" },
                { id: "soluciones", label: "Árbol de soluciones" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => cambiarTab(t.id)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs ${
                  tab === t.id
                    ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="hidden text-[11px] text-[var(--text-tertiary)] sm:block">
            {esProblemas
              ? "Causes a la izquierda, efectos a la derecha; cada tarjeta admite derivadas."
              : "Los medios atacan las causas; los fines materializan el objetivo."}
          </p>
        </div>

        {/* ---------- El papel ---------- */}
        <div className="bg-papel rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-0">
            {/* Centro (primero en móvil, centro en desktop) */}
            <div className="order-1 flex justify-center lg:order-2">
              <div className="relative w-full max-w-[300px] sm:max-w-[340px]">
                {/* conectores hacia las ramas */}
                <span
                  className="absolute right-full top-1/2 hidden h-px w-8 bg-[var(--border-strong)] lg:block"
                  aria-hidden
                />
                <span
                  className="absolute left-full top-1/2 hidden h-px w-8 bg-[var(--border-strong)] lg:block"
                  aria-hidden
                />
                <div
                  className="rounded-xl border-2 bg-[var(--surface-0)] p-5 shadow-sm"
                  style={{
                    borderColor: esProblemas ? "var(--danger)" : "var(--success)",
                  }}
                >
                  <p
                    className="label-micro text-center"
                    style={{ color: esProblemas ? "var(--danger)" : "var(--success)" }}
                  >
                    {esProblemas ? "Problema central" : "Objetivo central"}
                  </p>

                  {editandoCentral ? (
                    <textarea
                      autoFocus
                      value={borradorCentral}
                      maxLength={MAX_TEXTO_CENTRAL}
                      rows={4}
                      aria-label={`Texto del ${esProblemas ? "problema" : "objetivo"} central`}
                      onChange={(e) => setBorradorCentral(e.target.value)}
                      onBlur={confirmarCentral}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          confirmarCentral();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditandoCentral(false);
                        }
                      }}
                      className="mt-2 w-full resize-none rounded-md border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-center text-sm leading-snug text-[var(--text-primary)] focus:border-[var(--ember)] focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setBorradorCentral(centralActual);
                        setEditandoCentral(true);
                      }}
                      className={`mt-2 block w-full rounded-md px-1 py-0.5 text-center text-sm font-semibold leading-snug transition-colors hover:bg-[var(--surface-2)] ${
                        centralActual
                          ? "text-[var(--text-primary)]"
                          : "italic font-normal text-[var(--text-tertiary)]"
                      }`}
                    >
                      {centralActual ||
                        `Clic para escribir el ${esProblemas ? "problema" : "objetivo"}…`}
                    </button>
                  )}

                  <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--text-tertiary)]">
                    {esProblemas
                      ? "Una sola frase, acordada en plenaria."
                      : "La meta a la que contribuyen los medios."}
                  </p>
                </div>
              </div>
            </div>

            {/* Rama izquierda: causas / medios */}
            <div className="order-2 min-w-0 lg:order-1">
              <ColumnaArbol
                rama={ramaIzq}
                nodos={nodosIzq}
                editandoId={editandoId}
                onEditar={setEditandoId}
                onGuardar={guardarNodo(ramaIzq)}
                onEliminar={eliminarNodoEn(ramaIzq)}
                onAgregar={(parentId) => agregar(ramaIzq, parentId)}
              />
            </div>

            {/* Rama derecha: efectos / fines */}
            <div className="order-3 min-w-0">
              <ColumnaArbol
                rama={ramaDer}
                nodos={nodosDer}
                editandoId={editandoId}
                onEditar={setEditandoId}
                onGuardar={guardarNodo(ramaDer)}
                onEliminar={eliminarNodoEn(ramaDer)}
                onAgregar={(parentId) => agregar(ramaDer, parentId)}
              />
            </div>
          </div>
        </div>

        {/* ---------- Nota metodológica ---------- */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <FileText className="mt-0.5 size-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
            Cómo se diligencia: escriban primero el {esProblemas ? "problema" : "objetivo"}{" "}
            central; luego agreguen tarjetas {RAMA_META[ramaIzq].label.toLowerCase()} ({" "}
            {RAMA_META[ramaIzq].pregunta} ) y {RAMA_META[ramaDer].label.toLowerCase()} ({" "}
            {RAMA_META[ramaDer].pregunta} ). Las tarjetas primarias cuelgan del centro; para
            cada una pueden derivar tarjetas secundarias con el icono ↳ preguntando «¿y por
            qué eso ocurre?». Eraser: para borrar una tarjeta usa el icono de basura —{" "}
            {esProblemas
              ? "cuando el árbol esté listo, derívalo a soluciones desde el pie del panel."
              : "este árbol alimenta el acta final de la mesa."}
          </p>
        </div>
      </div>
    </PanelShell>
  );
}

/* Eraser import se usa como icono visual de la nota si se requiere */
void Eraser;
