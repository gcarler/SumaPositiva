"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { usePanels } from "@/core/panels/panel-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import {
  useSesionStore,
  tienePermiso,
} from "@/features/sesion/state/session-store";
import { EstadoConsulta } from "../components/estado-consulta";
export function UsuariosGestionView() {
  const sesion = useSesionStore((s) => s.sesion);
  const { openPanel } = usePanels();
  const permitido =
    sesion?.rol === "administrador_identidades" &&
    tienePermiso(sesion, "usuarios:leer");
  const usuarios = useQuery({
    queryKey: ["identidad", "usuarios", "", 0],
    queryFn: () => identidadApi.usuarios(),
    enabled: permitido,
  });
  return (
    <>
      <PageHeader
        title="Usuarios y Roles"
        description="Administración de cuentas, permisos y trazabilidad."
        action={
          permitido && (
            <Button onClick={() => openPanel("usuarios", {})}>
              Gestionar usuarios y roles
            </Button>
          )
        }
      />
      {!permitido ? (
        <Notice tone="warning" title="Permiso requerido">
          Se requiere administración de identidades y permiso de lectura de
          usuarios.
        </Notice>
      ) : (
        <>
          <EstadoConsulta
            cargando={usuarios.isPending}
            error={usuarios.error}
            reintentar={usuarios.refetch}
          />
          {usuarios.data && (
            <>
              <p className="text-sm text-text-secondary">
                {usuarios.data.total} usuarios registrados.
              </p>
              <ul className="space-y-3">
                {usuarios.data.elementos.map((u) => (
                  <li
                    key={u.id}
                    className="space-y-1 rounded-xl border border-border p-4"
                  >
                    <h2 className="break-words font-medium text-text-primary">
                      {u.nombres} {u.apellidos}
                    </h2>
                    <p className="break-words text-sm text-text-secondary">
                      {u.correo} · {u.codigo_rol} ·{" "}
                      {u.activo ? "Activo" : "Inactivo"}
                    </p>
                  </li>
                ))}
              </ul>
              {usuarios.data.total === 0 && <p>No hay usuarios.</p>}
            </>
          )}
        </>
      )}
    </>
  );
}
