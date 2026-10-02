"use client";
import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { errorFotos, MAX_FOTO_BYTES } from "../services/fotos-respuesta";
// Las fotos son un borrador hasta enviar; la API persiste el contenido en PostgreSQL.
// Una integración futura con MinIO/S3 deberá subirlas y devolver referencias permanentes.
export function FotosPregunta({
  fotos,
  cambiar,
  maxFotos = 5,
  label = "Adjuntar fotos",
  ocupado,
  error: errorExterno,
  required = false,
}: {
  fotos: string[];
  cambiar: (fotos: string[]) => void;
  maxFotos?: number;
  label?: string;
  ocupado?: (valor: boolean) => void;
  error?: string;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const actual = useRef(fotos);
  const cambio = useRef(cambiar);
  const activo = useRef(true);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    actual.current = fotos;
    cambio.current = cambiar;
  }, [fotos, cambiar]);
  useEffect(() => {
    activo.current = true;
    return () => {
      activo.current = false;
    };
  }, []);
  const max = Math.min(5, Math.max(1, maxFotos));
  return (
    <section className="min-w-0 space-y-3">
      <FormField
        label={label}
        description={`Máximo ${max} fotos; 5 MB por foto. JPG, PNG o WebP.`}
        error={error ?? errorExterno}
        required={required}
      >
        {(control) => (
          <Input
            {...control}
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={leyendo || fotos.length >= max}
            onChange={async (e) => {
              const archivos = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (!archivos.length) return;
              if (actual.current.length + archivos.length > max) {
                setError(`Solo puedes adjuntar ${max} fotos.`);
                return;
              }
              if (
                archivos.some(
                  (f) =>
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      f.type,
                    ) ||
                    f.size === 0 ||
                    f.size > MAX_FOTO_BYTES,
                )
              ) {
                setError(
                  "Cada foto debe ser JPG, PNG o WebP y pesar hasta 5 MB.",
                );
                return;
              }
              setError(undefined);
              setLeyendo(true);
              ocupado?.(true);
              try {
                const nuevas = await Promise.all(
                  archivos.map(
                    (f) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onerror = () =>
                          reject(new Error("No se pudo leer una foto"));
                        reader.onload = () =>
                          typeof reader.result === "string"
                            ? resolve(reader.result)
                            : reject(new Error("Foto inválida"));
                        reader.readAsDataURL(f);
                      }),
                  ),
                );
                if (!activo.current) return;
                const siguientes = [...actual.current, ...nuevas];
                const mensaje = errorFotos(siguientes, max);
                if (mensaje) setError(mensaje);
                else {
                  actual.current = siguientes;
                  cambio.current(siguientes);
                }
              } catch {
                if (activo.current)
                  setError(
                    "No se pudieron leer las fotos. Intenta nuevamente.",
                  );
              } finally {
                ocupado?.(false);
                if (activo.current) setLeyendo(false);
              }
            }}
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-3">
        {fotos.map((foto, i) => (
          <div
            key={`${i}-${foto.slice(-16)}`}
            className="relative size-20 shrink-0 rounded-lg border border-border"
          >
            <img
              src={foto}
              alt={`Foto de evidencia ${i + 1}`}
              width={80}
              height={80}
              className="size-20 rounded-lg object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-0 top-0 size-8"
              aria-label={`Eliminar foto ${i + 1}`}
              disabled={leyendo}
              onClick={() => {
                const siguientes = fotos.filter((_, j) => j !== i);
                actual.current = siguientes;
                cambiar(siguientes);
                setError(undefined);
              }}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ))}
        {fotos.length < max && (
          <Button
            type="button"
            variant="outline"
            loading={leyendo}
            loadingLabel="Leyendo fotos…"
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden="true" className="size-4" />
            Agregar fotos
          </Button>
        )}
      </div>
      <p role="status" className="text-xs text-text-secondary">
        {fotos.length} de {max} fotos
        {fotos.length >= max
          ? ". Máximo alcanzado; elimina una foto para reemplazarla."
          : ""}
      </p>
    </section>
  );
}
