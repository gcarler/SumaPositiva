import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
export function EstadoConsulta({
  cargando,
  error,
  reintentar,
}: {
  cargando: boolean;
  error: Error | null;
  reintentar: () => unknown;
}) {
  if (cargando) return <p role="status">Cargando datos…</p>;
  if (error)
    return (
      <Notice tone="danger" title="No se pudieron cargar los datos">
        <p>{error.message}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => void reintentar()}
        >
          Reintentar
        </Button>
      </Notice>
    );
  return null;
}
