/**
 * Modelos y contratos tipados del subsistema transaccional multicanal SM Core.
 * Alineados con backend FastAPI en `app.modules.sm.contracts`.
 */

export type SMCanal = "correo" | "whatsapp" | "telegram" | "sms" | "webhook";

export type SMEstadoMensaje =
  | "pendiente"
  | "encolado"
  | "enviado"
  | "simulado"
  | "entregado"
  | "fallido"
  | "agotado"
  | "cancelado";

export type SMEstadoSalud = "saludable" | "degradado" | "critico";

export interface SMMensaje {
  id: string;
  tenant: string;
  evento_id: string;
  canal: SMCanal;
  actor: string;
  contacto_hash: string;
  plantilla?: string | null;
  asunto?: string | null;
  cuerpo?: string | null;
  estado: SMEstadoMensaje;
  idempotencia: string;
  metadatos?: Record<string, string>;
  creado_en: string;
  actualizado_en: string;
}

export interface SMSalud {
  tenant: string;
  estado: SMEstadoSalud;
  pendientes: number;
  enviados: number;
  fallidos: number;
  simulados?: number;
  canales_vivos: SMCanal[];
  canales_degradados?: SMCanal[];
  worker_ultimo_latido?: string | null;
  antiguedad_pendiente_segundos?: number | null;
  motivos: string[];
  actualizado_en: string;
}

export interface SMResumenProcesamiento {
  procesados: number;
  enviados: number;
  fallidos: number;
  agotados: number;
  simulados?: number;
  cancelados?: number;
  sin_contacto?: number;
}

export interface SMEventoIn {
  tipo_evento: string;
  actor: string;
  canal: SMCanal;
  contacto: string;
  idempotencia: string;
  entidad?: string | null;
  entidad_id?: string | null;
  plantilla?: string | null;
  asunto?: string | null;
  cuerpo?: string | null;
  payload?: Record<string, string>;
  origen?: string;
}

export interface SMConsentimientoIn {
  actor: string;
  canal: SMCanal;
  contacto: string;
  consentido: boolean;
  origen?: string;
}

export interface SMFiltrosMensajes {
  canal?: SMCanal | "todos";
  estado?: SMEstadoMensaje | "todos";
  limite?: number;
}

export const SM_CANALES_META: Record<
  SMCanal,
  {
    label: string;
    descripcion: string;
    badgeVariant: "default" | "secondary" | "outline" | "ember" | "success" | "warning";
  }
> = {
  correo: {
    label: "Correo Electrónico",
    descripcion: "Despacho vía SMTP / Postfix con DKIM",
    badgeVariant: "outline",
  },
  whatsapp: {
    label: "WhatsApp Oficial",
    descripcion: "Mensajería instantánea transaccional",
    badgeVariant: "success",
  },
  telegram: {
    label: "Telegram Bot",
    descripcion: "Notificaciones y alertas comunitarias",
    badgeVariant: "secondary",
  },
  sms: {
    label: "Mensaje de Texto (SMS)",
    descripcion: "Canal prioritario de cobertura básica",
    badgeVariant: "ember",
  },
  webhook: {
    label: "Webhook Seguro",
    descripcion: "Integración HTTP HMAC con sistemas distritales",
    badgeVariant: "default",
  },
};

export const SM_ESTADOS_META: Record<
  SMEstadoMensaje,
  {
    label: string;
    badgeVariant: "default" | "secondary" | "outline" | "ember" | "success" | "destructive" | "warning";
  }
> = {
  pendiente: { label: "Pendiente", badgeVariant: "warning" },
  encolado: { label: "Encolado", badgeVariant: "secondary" },
  enviado: { label: "Enviado", badgeVariant: "success" },
  simulado: { label: "Simulado (Pruebas)", badgeVariant: "outline" },
  entregado: { label: "Entregado", badgeVariant: "success" },
  fallido: { label: "Fallido", badgeVariant: "destructive" },
  agotado: { label: "Reintentos Agotados", badgeVariant: "destructive" },
  cancelado: { label: "Cancelado", badgeVariant: "outline" },
};
