"use client";

import { useOfflineSync } from "./sync-manager";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Badge visual accesible que informa al usuario y facilitador el estado de conectividad
 * y permite sincronizar manualmente los registros en cola de IndexedDB.
 */
export function OfflineStatusBadge() {
  const { isOnline, pendientesCount, sincronizando, sincronizarAhora } =
    useOfflineSync();

  // Si está conectado y no hay registros en cola, se mantiene discreto
  if (isOnline && pendientesCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs"
    >
      {!isOnline ? (
        <Badge
          variant="warning"
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium"
        >
          <WifiOff className="size-3 shrink-0" aria-hidden="true" />
          <span>Sin red — Zonas Rurales/Insulares</span>
        </Badge>
      ) : (
        <Badge
          variant="info"
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium"
        >
          <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
          <span>Conectado</span>
        </Badge>
      )}

      {pendientesCount > 0 && (
        <div className="flex items-center gap-1">
          <Badge
            variant="ember"
            className="px-2 py-0.5 text-[11px] font-mono font-bold"
          >
            {pendientesCount} {pendientesCount === 1 ? "pendiente" : "pendientes"}
          </Badge>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              loading={sincronizando}
              onClick={() => void sincronizarAhora()}
              className="h-6 gap-1 px-2 text-[11px] font-medium"
              title="Sincronizar datos pendientes con el servidor distrital"
            >
              <RefreshCw
                className={`size-3 ${sincronizando ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
