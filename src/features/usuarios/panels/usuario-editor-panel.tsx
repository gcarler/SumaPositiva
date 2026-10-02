"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { useUsuariosStore, type ModuloUsuario, type RolPlataforma } from "@/features/usuarios/state/usuarios-store";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";

const ROLES: { id: RolPlataforma; label: string }[] = [
  { id: "autoridad_distrital", label: "Autoridad distrital" },
  { id: "facilitador_mesa", label: "Facilitador de mesa" },
  { id: "auditor_forense", label: "Auditor forense" },
  { id: "administrador_identidades", label: "Administrador de identidades" },
];

const MODULOS: { id: ModuloUsuario; label: string }[] = [
  { id: "mesas", label: "Mesas" },
  { id: "formularios", label: "Formularios" },
  { id: "geovisor", label: "Geovisor" },
  { id: "noticias", label: "Noticias" },
  { id: "testimonios", label: "Testimonios" },
  { id: "usuarios", label: "Usuarios" },
  { id: "contenido", label: "Contenido" },
  { id: "configuracion", label: "Configuración" },
];

interface EditorProps extends PanelComponentProps {
  mode: "invite" | "edit";
}

export function UsuarioEditorPanel({ entryKey, props, mode }: EditorProps) {
  const usuarioId = mode === "edit" && "usuarioId" in props ? props.usuarioId : undefined;
  const usuario = useUsuariosStore((state) =>
    usuarioId ? state.getById(usuarioId) : undefined,
  );
  const guardar = useUsuariosStore((state) => state.guardar);
  const { closeTop } = usePanels();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [correo, setCorreo] = useState(usuario?.correo ?? "");
  const [rol, setRol] = useState<RolPlataforma>(usuario?.rol ?? "facilitador_mesa");
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [modulos, setModulos] = useState<ModuloUsuario[]>(
    (usuario?.modulos ?? ["mesas", "formularios"]) as ModuloUsuario[],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    guardar({ nombre: nombre.trim(), correo: correo.trim(), rol, activo, modulos }, usuarioId);
    toast.success(mode === "invite" ? "Invitación enviada" : "Usuario actualizado");
    closeTop();
  }

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Usuarios y roles" }]}
      kicker="Gestión de identidades · Demo"
      title={mode === "invite" ? "Invitar usuario" : "Editar usuario"}
      subtitle="Define el rol y los módulos disponibles para esta cuenta. Los cambios de esta vista son demostrativos."
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Nombre completo" required>
            {(field) => <Input {...field} value={nombre} onChange={(event) => setNombre(event.target.value)} autoComplete="name" maxLength={120} />}
          </FormField>
          <FormField label="Correo electrónico" required>
            {(field) => <Input {...field} type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} autoComplete="email" maxLength={255} />}
          </FormField>
        </div>

        <FormField label="Rol de plataforma" description="El rol define el alcance general de acceso.">
          {(field) => (
            <Select value={rol} onValueChange={(value) => setRol(value as RolPlataforma)}>
              <SelectTrigger {...field}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-text-primary">Módulos disponibles</legend>
          <p className="text-sm text-text-secondary">Selecciona las áreas visibles para esta persona.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULOS.map((modulo) => {
              const checked = modulos.includes(modulo.id);
              const id = `usuario-modulo-${modulo.id}`;
              return (
                <div key={modulo.id} className="flex items-center gap-3">
                  <Checkbox id={id} checked={checked} onCheckedChange={(value) =>
                    setModulos((current) => value === true
                      ? [...current, modulo.id]
                      : current.filter((item) => item !== modulo.id))} />
                  <Label htmlFor={id}>{modulo.label}</Label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="usuario-activo" className="font-semibold">Cuenta activa</Label>
            <p className="mt-1 text-sm text-text-secondary">Permite iniciar sesión en la plataforma.</p>
          </div>
          <Switch id="usuario-activo" checked={activo} onCheckedChange={setActivo} aria-label="Cuenta activa" />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={closeTop}>Cancelar</Button>
          <Button type="submit">{mode === "invite" ? "Enviar invitación" : "Guardar cambios"}</Button>
        </div>
      </form>
    </PanelShell>
  );
}
