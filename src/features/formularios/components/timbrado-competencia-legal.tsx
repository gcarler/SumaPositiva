"use client";

import { useMemo } from "react";
import {
  Landmark,
  ShieldCheck,
  Building2,
  Users,
  FileText,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export interface InfoCompetenciaLegal {
  secretariaLider: string;
  siglaLider: string;
  entidadesAliadas: string;
  marcoIntervencion: string;
  fundamentoLegal: string;
  dimensionTexto: string;
  misionResumen: string;
  canalContacto: {
    direccion: string;
    telefono: string;
    email: string;
  };
}

export function calcularCompetenciaLegalReporte(
  respuestas: Record<string, unknown>
): InfoCompetenciaLegal | null {
  const p1 = String(respuestas["P1"] ?? "");
  const p2d1 = String(respuestas["P2-D1"] ?? "");
  const p2d2 = String(respuestas["P2-D2"] ?? "");
  const p2d3 = String(respuestas["P2-D3"] ?? "");
  const p2d4 = String(respuestas["P2-D4"] ?? "");
  const p2d5 = String(respuestas["P2-D5"] ?? "");
  const p2d6 = String(respuestas["P2-D6"] ?? "");
  const p2d7 = String(respuestas["P2-D7"] ?? "");

  const casoEspecifico = p2d1 || p2d2 || p2d3 || p2d4 || p2d5 || p2d6 || p2d7 || "";

  if (!p1 && !casoEspecifico) {
    return null;
  }

  // Dimension 1: Personal
  if (p1 === "d1" || p2d1) {
    if (casoEspecifico.includes("ESCNNA") || casoEspecifico.includes("Trata") || casoEspecifico.includes("menores")) {
      return {
        secretariaLider: "Secretaría de Turismo Distrital",
        siglaLider: "STUR",
        entidadesAliadas: "SICC, ICBF, Policía de Turismo, Fiscalía General de la Nación",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 'Cartagena Ciudad de Derechos' — Estrategia Cero Tolerancia ESCNNA",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 679 de 2001",
        dimensionTexto: "Dimensión 1 — Seguridad Personal y Protección a la Niñez",
        misionResumen: "Inspección a prestadores turísticos, operativos en playas y cordón amurallado, y restitución de derechos.",
        canalContacto: {
          direccion: "Centro Histórico, Calle de la Inquisición #3-53",
          telefono: "(605) 6411370 Ext. 1700",
          email: "turismo@cartagena.gov.co",
        },
      };
    }

    return {
      secretariaLider: "Secretaría del Interior y Convivencia Ciudadana",
      siglaLider: "SICC",
      entidadesAliadas: "Policía Metropolitana de Cartagena (MECAR), Distriseguridad, Fiscalía Seccional Bolívar",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 'Cartagena Ciudad de Derechos' — Eje de Seguridad y Justicia",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Código Nacional de Seguridad y Convivencia Ciudadana (Ley 1801)",
      dimensionTexto: "Dimensión 1 — Seguridad Personal y Ciudadana",
      misionResumen: "Orden público, desarticulación de expendios barriales de drogas, desarme y fortalecimiento de cuadrantes policiales.",
      canalContacto: {
        direccion: "Plaza de la Aduana, Palacio de la Aduana, Piso 2",
        telefono: "(605) 6411370 Ext. 1201",
        email: "interior@cartagena.gov.co",
      },
    };
  }

  // Dimension 2: Comunitaria
  if (p1 === "d2" || p2d2) {
    if (casoEspecifico.includes("intrafamiliar") || casoEspecifico.includes("LGBTIQ+") || casoEspecifico.includes("Acoso sexual")) {
      return {
        secretariaLider: "Secretaría de Participación y Desarrollo Social",
        siglaLider: "PARTICIPACION",
        entidadesAliadas: "Comisarías de Familia, DADIS (Salud Mental), SICC, Casa de Justicia",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Política Pública de Mujeres, Género y Diversidad",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 1257 de 2008",
        dimensionTexto: "Dimensión 2 — Convivencia y Seguridad de Género / Familiar",
        misionResumen: "Ruta de atención integral, Casas de la Mujer Empoderada y medidas de protección inmediata para víctimas.",
        canalContacto: {
          direccion: "Manga, 3ra Avenida Calle 28 #21-62",
          telefono: "(605) 6601442",
          email: "participacion@cartagena.gov.co",
        },
      };
    }

    if (casoEspecifico.includes("comunales") || casoEspecifico.includes("JAC")) {
      return {
        secretariaLider: "Instituto Distrital de Acción Comunal y Ciudadana (IDACCC)",
        siglaLider: "IDACCC",
        entidadesAliadas: "SICC, Personería Distrital, Defensoría del Pueblo, Escuela de Gobierno",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Fortalecimiento y Garantías para Dignatarios Barriales",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 2166 de 2021",
        dimensionTexto: "Dimensión 2 — Seguridad Comunitaria y Liderazgo Social",
        misionResumen: "Ruta de protección y alerta temprana para dignatarios comunales y resolución de disputas vecinales.",
        canalContacto: {
          direccion: "Centro Histórico, Calle Cuartel #36-24",
          telefono: "(605) 6411370 Ext. 1950",
          email: "idaccc@cartagena.gov.co",
        },
      };
    }

    if (casoEspecifico.includes("Bullying") || casoEspecifico.includes("escolar")) {
      return {
        secretariaLider: "Secretaría de Educación Distrital",
        siglaLider: "SED",
        entidadesAliadas: "Policía de Infancia y Adolescencia, DADIS, SICC",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Programa Entornos Escolares en Paz",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 1620 de 2013",
        dimensionTexto: "Dimensión 2 — Convivencia Escolar y Comunitaria",
        misionResumen: "Comités de convivencia escolar, mediación de conflictos y prevención de la deserción juvenil.",
        canalContacto: {
          direccion: "Calle Larga #10B-89, Plazoleta Telecom",
          telefono: "(605) 6649850",
          email: "sed@cartagena.gov.co",
        },
      };
    }

    return {
      secretariaLider: "Secretaría del Interior en articulación con IDER",
      siglaLider: "SICC / IDER",
      entidadesAliadas: "Alcaldías Locales 1, 2 y 3, Escuela de Gobierno y Liderazgo",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Pactos Barriales de Paz y Barrismo Social",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
      dimensionTexto: "Dimensión 2 — Convivencia y Seguridad Comunitaria",
      misionResumen: "Mediación de conflictos entre pandillas barriales, frentes de seguridad y escuelas deportivas por la paz.",
      canalContacto: {
        direccion: "Plaza de la Aduana, Palacio de la Aduana, Piso 2",
        telefono: "(605) 6411370",
        email: "interior@cartagena.gov.co",
      },
    };
  }

  // Dimension 3: Ambiental
  if (p1 === "d3" || p2d3) {
    if (casoEspecifico.includes("alumbrado") || casoEspecifico.includes("oscuridad")) {
      return {
        secretariaLider: "Secretaría de Infraestructura Distrital",
        siglaLider: "INFRAESTRUCTURA",
        entidadesAliadas: "Distriseguridad, Concesión Alumbrado Público, SICC",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Modernización de Alumbrado Público LED",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
        dimensionTexto: "Dimensión 3 — Entorno Seguro e Infraestructura",
        misionResumen: "Expansión e iluminación de puntos oscuros y zonas de riesgo para prevenir hechos delictivos.",
        canalContacto: {
          direccion: "Centro Histórico, Edificio Ronda Real, Torre B, Piso 3",
          telefono: "(605) 6411370 Ext. 1600",
          email: "infraestructura@cartagena.gov.co",
        },
      };
    }

    if (casoEspecifico.includes("inundación") || casoEspecifico.includes("deslizamiento") || casoEspecifico.includes("arroyos")) {
      return {
        secretariaLider: "Oficina Asesora para la Gestión del Riesgo de Desastres (OAGRD)",
        siglaLider: "OAGRD",
        entidadesAliadas: "Cuerpo Oficial de Bomberos, Corvivienda, Secretaría de Infraestructura",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Sistema Distrital de Gestión del Riesgo y Adaptación Climática",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 1523 de 2012",
        dimensionTexto: "Dimensión 3 — Seguridad Ambiental y Mitigación del Riesgo",
        misionResumen: "Monitoreo hidrometeorológico de arroyos, censos de afectación y reubicación preventiva de familias.",
        canalContacto: {
          direccion: "Manga, 4ta Avenida Calle 29 #23-45",
          telefono: "(605) 6608515",
          email: "gestiondelriesgo@cartagena.gov.co",
        },
      };
    }

    return {
      secretariaLider: "Establecimiento Público Ambiental (EPA Cartagena)",
      siglaLider: "EPA",
      entidadesAliadas: "Cardique, Secretaría de Infraestructura, Policía Ambiental, Veolia / Pacaribe",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Recuperación de la Ciénaga de la Virgen y Cuerpos de Agua",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 99 de 1993",
      dimensionTexto: "Dimensión 3 — Seguridad Ambiental y Ecosistémica",
      misionResumen: "Inspección, control y sanción a vertimientos ilegales, recuperación de manglares y saneamiento hídrico.",
      canalContacto: {
        direccion: "Manga, Calle Real #22-54",
        telefono: "(605) 6608511",
        email: "contacto@epacartagena.gov.co",
      },
    };
  }

  // Dimension 4: Económica
  if (p1 === "d4" || p2d4) {
    if (casoEspecifico.includes("turistas") || casoEspecifico.includes("cobro abusivo") || casoEspecifico.includes("estafa")) {
      return {
        secretariaLider: "Secretaría de Turismo Distrital",
        siglaLider: "STUR",
        entidadesAliadas: "SICC, DATT, Policía de Turismo, Gerencia Centro Histórico",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Turismo Justo, Seguro y Sostenible",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
        dimensionTexto: "Dimensión 4 — Seguridad Económica y Defensa al Consumidor",
        misionResumen: "Operativos permanentes contra cobros abusivos, regulación de tarifas de lanchas y playas, y sanciones.",
        canalContacto: {
          direccion: "Centro Histórico, Calle de la Inquisición #3-53",
          telefono: "(605) 6411370 Ext. 1700",
          email: "turismo@cartagena.gov.co",
        },
      };
    }

    return {
      secretariaLider: "Plan de Emergencia Social - Pedro Romero (PES-PR)",
      siglaLider: "PES-PR",
      entidadesAliadas: "Secretaría de Participación, SICC, Banco de las Oportunidades",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Inclusión Financiera y Combate a la Usura",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
      dimensionTexto: "Dimensión 4 — Seguridad Económica y Medios de Vida",
      misionResumen: "Microcréditos productivos barriales para liberar a comerciantes informales de las redes del 'gota a gota'.",
      canalContacto: {
        direccion: "Centro Histórico, Edificio Portobelo, Piso 3",
        telefono: "(605) 6411370 Ext. 1850",
        email: "pes@cartagena.gov.co",
      },
    };
  }

  // Dimension 5: Alimentaria y Sanitaria
  if (p1 === "d5" || p2d5) {
    if (casoEspecifico.includes("insalubridad") || casoEspecifico.includes("dengue") || casoEspecifico.includes("plagas")) {
      return {
        secretariaLider: "Departamento Administrativo Distrital de Salud (DADIS)",
        siglaLider: "DADIS",
        entidadesAliadas: "EPA Cartagena, Secretaría de Infraestructura, ESE Cartagena de Indias",
        marcoIntervencion: "Plan de Desarrollo 2024–2027 — Vigilancia Epidemiológica y Control Vectorial",
        fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 715 de 2001",
        dimensionTexto: "Dimensión 5 — Seguridad Sanitaria y Salud Pública",
        misionResumen: "Jornadas de fumigación barrial, erradicación de criaderos de mosquitos y atención primaria en salud.",
        canalContacto: {
          direccion: "Getsemaní, Calle Larga #9A-47, Casa Fátima",
          telefono: "(605) 6649770",
          email: "dadis@cartagena.gov.co",
        },
      };
    }

    return {
      secretariaLider: "PES-PR en articulación con Secretaría de Educación",
      siglaLider: "PES / SED",
      entidadesAliadas: "DADIS, ICBF, Secretaría de Participación",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Soberanía y Seguridad Alimentaria Distrital",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
      dimensionTexto: "Dimensión 5 — Seguridad Alimentaria y Nutricional",
      misionResumen: "Comedores comunitarios en zonas de pobreza extrema y auditoría nutricional al PAE escolar.",
      canalContacto: {
        direccion: "Centro Histórico, Edificio Portobelo, Piso 3",
        telefono: "(605) 6411370 Ext. 1850",
        email: "pes@cartagena.gov.co",
      },
    };
  }

  // Dimension 6: Política e Institucional
  if (p1 === "d6" || p2d6) {
    return {
      secretariaLider: "Secretaría General en articulación con Personería Distrital",
      siglaLider: "GENERAL",
      entidadesAliadas: "Escuela de Gobierno y Liderazgo, Oficina de Transparencia, OTIC",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Gobierno Abierto y Cero Corrupción",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior y Ley 1712 de 2014",
      dimensionTexto: "Dimensión 6 — Seguridad Política e Institucional",
      misionResumen: "Canales de denuncia contra sobornos o abuso de autoridad, veedurías ciudadanas y garantías de participación.",
      canalContacto: {
        direccion: "Plaza de la Aduana, Palacio de la Aduana, Piso 1",
        telefono: "(605) 6411370 Ext. 1100",
        email: "general@cartagena.gov.co",
      },
    };
  }

  // Dimension 7: Crisis / Alertas
  if (p1 === "d7" || p2d7) {
    return {
      secretariaLider: "SICC en articulación con OAGRD y Bomberos",
      siglaLider: "SICC / OAGRD",
      entidadesAliadas: "Armada Nacional, MECAR, Unidad para las Víctimas, Cruz Roja",
      marcoIntervencion: "Plan de Desarrollo 2024–2027 — Sistema de Alertas Tempranas y Respuesta Humanitaria",
      fundamentoLegal: "Decreto 037 de 2026 del Ministerio del Interior",
      dimensionTexto: "Dimensión 7 — Alertas Tempranas y Gestión de Crisis",
      misionResumen: "Atención inmediata ante amenazas de actores armados, confinamiento barrial o desastres naturales graves.",
      canalContacto: {
        direccion: "Plaza de la Aduana, Palacio de la Aduana, Piso 2",
        telefono: "123 / (605) 6411370",
        email: "interior@cartagena.gov.co",
      },
    };
  }

  return null;
}

export function TimbradoCompetenciaLegal({
  respuestas,
  slug,
}: {
  respuestas: Record<string, unknown>;
  slug?: string;
}) {
  const info = useMemo(() => {
    if (slug !== "reporte-inseguridad") return null;
    return calcularCompetenciaLegalReporte(respuestas);
  }, [respuestas, slug]);

  if (!info) return null;

  return (
    <div className="rounded-2xl border-2 border-[var(--ember)]/60 bg-[var(--surface-2)] p-4 sm:p-5 shadow-sm space-y-3 animate-fadeIn">
      {/* Header Institucional */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--ember)]/15 text-[var(--ember)] shrink-0">
            <Landmark className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ember)] block">
              Competencia Legal Asignada (Decreto 037 de 2026 MinInterior)
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
              {info.dimensionTexto}
            </span>
          </div>
        </div>

        <Badge variant="outline" className="border-[var(--ember)]/40 text-[10px] font-semibold text-[var(--ember)]">
          Trazabilidad Vinculante
        </Badge>
      </div>

      {/* Dictamen de Responsabilidad */}
      <div className="space-y-2 text-xs">
        <p className="text-[var(--text-primary)] leading-relaxed">
          Este caso corresponde legalmente a:{" "}
          <strong className="text-[var(--ember)] font-bold">{info.secretariaLider}</strong>
          {" "}en articulación con{" "}
          <span className="font-semibold text-[var(--text-primary)]">{info.entidadesAliadas}</span>.
        </p>

        <p className="text-[var(--text-secondary)] italic">
          &ldquo;{info.misionResumen}&rdquo;
        </p>

        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-tertiary)]">
          <span>🏛️ {info.marcoIntervencion}</span>
          <span>⚖️ {info.fundamentoLegal}</span>
        </div>

        {/* Canales Oficiales */}
        <div className="mt-2 flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="size-3 text-[var(--ember)]" />
            {info.canalContacto.direccion}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Phone className="size-3 text-[var(--ember)]" />
            {info.canalContacto.telefono}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Mail className="size-3 text-[var(--ember)]" />
            {info.canalContacto.email}
          </span>
        </div>
      </div>
    </div>
  );
}
