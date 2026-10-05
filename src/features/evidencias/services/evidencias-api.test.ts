import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  subirEvidenciaFotografica,
  type EvidenciaSubidaRespuesta,
} from "./evidencias-api";
import * as aportesApi from "@/features/aportes/services/aportes-api";

describe("Servicio de Evidencias Sanitizadas (H-08)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let sesionSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    sesionSpy = vi.spyOn(aportesApi, "asegurarSesionActiva").mockResolvedValue("mock-jwt-token");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    sesionSpy.mockRestore();
  });

  test("subirEvidenciaFotografica despacha POST a /evidencias/subir y genera archivo_url sanitizada", async () => {
    const mockRespuestaBackend = {
      id: "01a0f817-b3f0-7922-a373-fb1fa2dfa839",
      propuesta_id: null,
      autor_sujeto_id: "01a0f817-b3ed-746b-b813-742a734177f7",
      nombre_archivo_original: "denuncia_comunitaria.jpg",
      nombre_archivo_seguro: "01a0f817b3f07922a373fb1fa2dfa839.jpg",
      tamano_bytes: 45020,
      tipo_mime: "image/jpeg",
      hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      exif_despojado: true,
      despojo_exif_exitoso: true,
      ancho: 800,
      alto: 600,
      creado_en: "2026-10-05T04:40:00.000Z",
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockRespuestaBackend), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const archivoMock = new File(["dummy image content"], "denuncia_comunitaria.jpg", {
      type: "image/jpeg",
    });

    const resultado: EvidenciaSubidaRespuesta = await subirEvidenciaFotografica(archivoMock);

    expect(sesionSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/evidencias/subir"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    expect(resultado.id).toBe("01a0f817-b3f0-7922-a373-fb1fa2dfa839");
    expect(resultado.exif_despojado).toBe(true);
    expect(resultado.despojo_exif_exitoso).toBe(true);
    expect(resultado.archivo_url).toBe("/api/v1/evidencias/01a0f817-b3f0-7922-a373-fb1fa2dfa839/archivo");
  });

  test("incluye propuesta_id en el payload cuando se suministra", async () => {
    const mockRespuestaBackend = {
      id: "01a0f817-b3f0-7922-a373-fb1fa2dfa839",
      propuesta_id: "01a0f61b-6252-73d5-b035-7671ed9cf089",
      autor_sujeto_id: null,
      nombre_archivo_original: "foto.png",
      nombre_archivo_seguro: "seguro.png",
      tamano_bytes: 1200,
      tipo_mime: "image/png",
      hash_sha256: "abc",
      exif_despojado: true,
      despojo_exif_exitoso: true,
      ancho: 100,
      alto: 100,
      creado_en: "2026-10-05T04:40:00.000Z",
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockRespuestaBackend), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const archivoMock = new File(["dummy"], "foto.png", { type: "image/png" });
    const propuestaUuid = "01a0f61b-6252-73d5-b035-7671ed9cf089";

    const resultado = await subirEvidenciaFotografica(archivoMock, propuestaUuid);
    expect(resultado.propuesta_id).toBe(propuestaUuid);
  });

  test("anti-silent-fallback: propaga error y NO simula retornos si el backend rechaza la subida (401/422/500)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Formato de imagen peligroso o corrupto" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    const archivoMock = new File(["corrupt"], "virus.exe", { type: "application/x-msdownload" });

    await expect(subirEvidenciaFotografica(archivoMock)).rejects.toThrow(
      "Formato de imagen peligroso o corrupto"
    );
  });
});
