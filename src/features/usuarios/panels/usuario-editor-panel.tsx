"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels } from "@/core/panels/panel-store";
import type { PanelComponentProps } from "@/app/_composition/panel-registry";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import { ApiError } from "@/core/http/api-client";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";

const ROLES_FALLBACK = [
  { id: "administrador_identidades", label: "Administrador de identidades" },
  { id: "autoridad_distrital", label: "Autoridad distrital" },
  { id: "facilitador_mesa", label: "Facilitador de mesa" },
  { id: "auditor_forense", label: "Auditor forense" },
  { id: "ciudadano", label: "Ciudadano" },
];

interface EditorProps extends PanelComponentProps {
  mode: "invite" | "edit";
}

export function UsuarioEditorPanel({ entryKey, props, mode }: EditorProps) {
  const usuarioId = mode === "edit" && "usuarioId" in props ? (props.usuarioId as string) : undefined;
  const { closeTop } = usePanels();
  const cache = useQueryClient();

  const usuariosQuery = useQuery({
    queryKey: ["identidad", "usuarios", "todos"],
    queryFn: () => identidadApi.usuarios("", 0, 100),
    enabled: Boolean(usuarioId),
  });

  const rolesQuery = useQuery({
    queryKey: ["identidad", "roles"],
    queryFn: () => identidadApi.roles(),
  });

  const usuario = useMemo(
    () => (usuarioId ? usuariosQuery.data?.elementos.find((u) => u.id === usuarioId) : undefined),
    [usuarioId, usuariosQuery.data],
  );

  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rol, setRol] = useState("facilitador_mesa");
  const [activo, setActivo] = useState(true);
  const [motivo, setMotivo] = useState(
    mode === "invite" ? "Alta administrativa de cuenta institucional" : "Actualización administrativa de cuenta institucional",
  );
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (usuario && !cargado) {
      setNombres(usuario.nombres);
      setApellidos(usuario.apellidos);
      setCorreo(usuario.correo);
      setRol(usuario.codigo_rol);
      setActivo(usuario.activo);
      setCargado(true);
    }
  }, [usuario, cargado]);

  const rolesDisponibles = useMemo(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      return rolesQuery.data.map((r) => ({ id: r.codigo, label: r.nombre }));
    }
    return ROLES_FALLBACK;
  }, [rolesQuery.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    try {
      if (mode === "invite") {
        await identidadApi.crearUsuario({
          correo: correo.trim(),
          contrasena: contrasena.trim() || "Cartagena2026*",
          nombres: nombres.trim(),
          apellidos: apellidos.trim() || "-",
          codigo_rol: rol,
          motivo: motivo.trim() || "Alta administrativa de cuenta institucional",
        });
        toast.success("Invitación enviada y usuario registrado en PostgreSQL");
      } else if (usuarioId) {
        await identidadApi.editarUsuario(usuarioId, {
          nombres: nombres.trim(),
          apellidos: apellidos.trim() || "-",
          codigo_rol: rol,
          activo,
          motivo: motivo.trim() || "Actualización administrativa de cuenta institucional",
        });
        toast.success("Usuario institucional actualizado exitosamente");
      }
      await cache.invalidateQueries({ queryKey: ["identidad"] });
      closeTop();
    } catch (err) {
      const mensaje =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo procesar la solicitud de usuario";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Usuarios y roles" }]}
      kicker="Gestión de identidades · Seguridad Humana"
      title={mode === "invite" ? "Invitar usuario" : "Editar usuario"}
      subtitle={
        mode === "invite"
          ? "Registra una nueva cuenta institucional en la base de datos de POLIS."
          : "Modifica los datos, rol institucional y estado de la cuenta en PostgreSQL."
      }
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <form onSubmit={submit} className="space-y-6 p-5 sm:p-6" aria-busy={guardando}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Nombres" required>
            {(field) => (
              <Input
                {...field}
                value={nombres}
                onChange={(event) => setNombres(event.target.value)}
                autoComplete="given-name"
                maxLength={100}
                required
              />
            )}
          </FormField>
          <FormField label="Apellidos" required>
            {(field) => (
              <Input
                {...field}
                value={apellidos}
                onChange={(event) => setApellidos(event.target.value)}
                autoComplete="family-name"
                maxLength={100}
                required
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Correo electrónico" required description={mode === "edit" ? "Identificador institucional único" : undefined}>
            {(field) => (
              <Input
                {...field}
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                autoComplete="email"
                maxLength={255}
                disabled={mode === "edit"}
                required
              />
            )}
          </FormField>

          {mode === "invite" ? (
            <FormField
              label="Contraseña inicial"
              description="Mínimo 8 caracteres (por defecto: Cartagena2026*)"
            >
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Cartagena2026*"
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                />
              )}
            </FormField>
          ) : (
            <FormField label="Estado de cuenta" description="Permite iniciar sesión en POLIS">
              {() => (
                <div className="flex h-10 items-center justify-between rounded-xl border border-border px-3">
                  <Label htmlFor="usuario-activo" className="text-sm font-medium">
                    {activo ? "Cuenta activa" : "Cuenta suspendida"}
                  </Label>
                  <Switch
                    id="usuario-activo"
                    checked={activo}
                    onCheckedChange={setActivo}
                    aria-label="Estado de cuenta activa"
                  />
                </div>
              )}
            </FormField>
          )}
        </div>

        <FormField label="Rol de plataforma" description="Define el alcance general de acceso y permisos RBAC.">
          {(field) => (
            <Select value={rol} onValueChange={(value) => setRol(value)}>
              <SelectTrigger {...field} aria-label="Seleccionar rol de plataforma">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rolesDisponibles.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField
          label="Motivo de la acción"
          required
          description="Trazabilidad forense obligatoria para el registro de auditoría (mínimo 10 caracteres)."
        >
          {(field) => (
            <Input
              {...field}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              minLength={10}
              maxLength={500}
              required
            />
          )}
        </FormField>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={closeTop} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="ember" disabled={guardando}>
            {guardando ? "Procesando…" : mode === "invite" ? "Enviar invitación" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}
