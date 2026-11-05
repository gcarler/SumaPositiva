import React from "react";

export interface IsotipoPolisProps extends React.SVGProps<SVGSVGElement> {
  /** Tamaño explícito en píxeles o clases de Tailwind (ej. size-7) */
  size?: number | string;
  /** Si debe incluir el contenedor squircle institucional de alto contraste */
  withBackground?: boolean;
}

/**
 * Isotipo oficial de POLIS: Ágora Concéntrica de Cartagena de Indias.
 * Utiliza variables CSS semánticas (--brand-polis-*) para garantizar fidelidad,
 * contraste estricto y total cumplimiento de las directrices UI.
 */
export function IsotipoPolis({
  size,
  className = "size-full",
  withBackground = false,
  style,
  ...props
}: IsotipoPolisProps) {
  const inlineStyle: React.CSSProperties = {
    ...style,
    ...(size ? { width: size, height: size } : {}),
  };

  if (withBackground) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 128 128"
        fill="none"
        aria-hidden="true"
        className={className}
        style={inlineStyle}
        {...props}
      >
        {/* Contenedor institucional con borde sutil para contraste universal */}
        <rect width="128" height="128" rx="28" fill="var(--surface-2)" />
        <rect
          x="1"
          y="1"
          width="126"
          height="126"
          rx="27"
          stroke="var(--border-strong)"
          strokeWidth="2"
        />

        {/* Isotipo P centrado con precisión */}
        <g transform="translate(64, 64) scale(0.52) translate(-112, -99)">
          <path
            d="M44 176 V90"
            stroke="var(--brand-polis-blue)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M44 90 C44 52.4446 74.4446 22 112 22 C149.555 22 180 52.4446 180 90 C180 127.555 149.555 158 112 158 H78"
            stroke="var(--brand-polis-sky)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M68 90 C68 65.6995 87.6995 46 112 46 C136.301 46 156 65.6995 156 90 C156 114.301 136.301 134 112 134"
            stroke="var(--brand-polis-cyan)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <circle cx="112" cy="90" r="22" fill="var(--brand-polis-light)" />
          <circle cx="112" cy="90" r="9" fill="var(--brand-polis-core)" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="26 4 172 190"
      fill="none"
      aria-hidden="true"
      className={className}
      style={inlineStyle}
      {...props}
    >
      <path
        d="M44 176 V90"
        stroke="var(--brand-polis-blue)"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M44 90 C44 52.4446 74.4446 22 112 22 C149.555 22 180 52.4446 180 90 C180 127.555 149.555 158 112 158 H78"
        stroke="var(--brand-polis-sky)"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M68 90 C68 65.6995 87.6995 46 112 46 C136.301 46 156 65.6995 156 90 C156 114.301 136.301 134 112 134"
        stroke="var(--brand-polis-cyan)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="112" cy="90" r="22" fill="var(--brand-polis-light)" />
      <circle cx="112" cy="90" r="9" fill="var(--brand-polis-core)" />
    </svg>
  );
}

export interface LogoPolisProps extends React.SVGProps<SVGSVGElement> {
  /** Altura o ancho personalizado */
  size?: number | string;
}

/**
 * Logotipo completo vectorial de POLIS: Isotipo P + tipografía Ples SAS.
 * Las letras 'OLIS' utilizan stroke='currentColor' adaptándose con máxima legibilidad
 * a modo claro (texto oscuro) y modo oscuro (texto claro).
 */
export function LogoPolis({
  className = "h-8 w-auto text-[var(--text-primary)]",
  style,
  ...props
}: LogoPolisProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 445 165"
      fill="none"
      aria-label="POLIS — Plataforma de Participación Ciudadana"
      className={className}
      style={style}
      {...props}
    >
      {/* Isotipo P: Ágora Concéntrica */}
      <g transform="translate(0, 2) scale(0.88)">
        <path
          d="M44 176 V90"
          stroke="var(--brand-polis-blue)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M44 90 C44 52.4446 74.4446 22 112 22 C149.555 22 180 52.4446 180 90 C180 127.555 149.555 158 112 158 H78"
          stroke="var(--brand-polis-sky)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M68 90 C68 65.6995 87.6995 46 112 46 C136.301 46 156 65.6995 156 90 C156 114.301 136.301 134 112 134"
          stroke="var(--brand-polis-cyan)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx="112" cy="90" r="22" fill="var(--brand-polis-light)" />
        <circle cx="112" cy="90" r="9" fill="var(--brand-polis-core)" />
      </g>
      {/* Letra O con el núcleo azul de Ples */}
      <circle cx="215" cy="96" r="40" stroke="currentColor" strokeWidth="16" />
      <circle cx="215" cy="96" r="19" fill="var(--brand-ples-blue)" />
      {/* Letras L, I, S con la geometría de Ples */}
      <path
        d="M283 22 V118 C283 131 292 138 305 138"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M335 62 V138"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <circle cx="335" cy="32" r="10" fill="var(--brand-polis-sky)" />
      <path
        d="M425 66 C417 58 406 54 394 54 C376 54 364 63 364 76 C364 102 426 90 426 117 C426 130 412 138 393 138 C378 138 367 133 361 125"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface MarcaPolisHeaderProps {
  /** Clase personalizada para el contenedor */
  className?: string;
  /** Subtítulo institucional (por defecto 'Cartagena 2026–2036') */
  subtitulo?: string;
  /** Iniciativa distrital asociada (por defecto 'Seguridad Humana') */
  iniciativa?: string;
}

/**
 * Bloque unificado de cabecera institucional POLIS.
 * Combina el isotipo de Ágora Concéntrica con tipografía fluida y la iniciativa distrital.
 */
export function MarcaPolisHeader({
  className = "",
  subtitulo = "Cartagena 2026–2036",
  iniciativa = "Seguridad Humana",
}: MarcaPolisHeaderProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--border-strong)] p-1 transition-all duration-200 group-hover:scale-105 group-hover:border-[var(--ember)] shadow-xs">
        <IsotipoPolis className="size-full" />
      </div>
      <div className="flex flex-col text-left leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-extrabold tracking-tight text-[var(--text-primary)]">
            POLIS
          </span>
          {iniciativa && (
            <>
              <span
                className="hidden text-[11px] font-medium text-[var(--text-tertiary)] sm:inline"
                aria-hidden="true"
              >
                •
              </span>
              <span className="hidden text-[12px] font-semibold text-[var(--text-secondary)] sm:inline">
                {iniciativa}
              </span>
            </>
          )}
          <span
            className="size-1.5 rounded-full bg-[var(--ember)] animate-pulse"
            aria-hidden="true"
          />
        </div>
        {subtitulo && (
          <span className="text-[11px] font-medium text-[var(--text-secondary)] sm:text-[var(--text-tertiary)]">
            {subtitulo}
          </span>
        )}
      </div>
    </div>
  );
}
