import type { ChatClientFeatureFlags, ChatClientFeatureKey } from "./chat-feature-flags";

export type ChatModuleKey = ChatClientFeatureKey | string;

export type ChatModuleDefinition = {
  key: ChatModuleKey;
  featureKey: ChatClientFeatureKey;
  label: string;
  description: string;
  href: string;
  standalone: boolean;
};

const CHAT_MODULES: ChatModuleDefinition[] = [
  {
    key: "campaigns",
    featureKey: "campaigns",
    label: "Campañas email",
    description: "Gestiona campañas y envíos masivos por email.",
    href: "/chat/modulos/campaigns",
    standalone: true
  },
  {
    key: "whatsappCampaigns",
    featureKey: "whatsappCampaigns",
    label: "Campañas WhatsApp",
    description: "Gestiona envíos masivos por WhatsApp con plantillas aprobadas.",
    href: "/chat/modulos/whatsappCampaigns",
    standalone: true
  },
  {
    key: "advisors",
    featureKey: "advisors",
    label: "Asesores",
    description: "Administra asesores y asignación operativa de conversaciones.",
    href: "/chat/modulos/advisors",
    standalone: true
  },
  {
    key: "advisorMetrics",
    featureKey: "advisorMetrics",
    label: "Métricas de asesores",
    description: "Consulta rendimiento y seguimiento por asesor.",
    href: "/chat/modulos/advisorMetrics",
    standalone: true
  },
  {
    key: "templates",
    featureKey: "templates",
    label: "Plantillas",
    description: "Consulta plantillas aprobadas para WhatsApp.",
    href: "/chat/modulos/templates",
    standalone: true
  },
  {
    key: "assistant",
    featureKey: "assistant",
    label: "Asistente IA",
    description: "Configura y revisa el asistente conectado al chat.",
    href: "/chat/modulos/assistant",
    standalone: true
  },
  {
    key: "metaEventos",
    featureKey: "metaEventos",
    label: "Eventos de Meta",
    description: "Revisa eventos y trazabilidad de Meta.",
    href: "/chat/modulos/metaEventos",
    standalone: true
  },
  {
    key: "inscripciones",
    featureKey: "inscripciones",
    label: "Inscripciones",
    description: "Gestiona inscripciones del módulo de WhatsApp.",
    href: "/chat/modulos/inscripciones",
    standalone: true
  }
];

const INTERNAL_FEATURES = new Set<ChatClientFeatureKey>(["conversationSummary", "sendTemplates"]);

function formatUnknownModuleLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

export function getChatModuleDefinition(moduleKey: string): ChatModuleDefinition {
  const known = CHAT_MODULES.find((module) => module.key === moduleKey);
  if (known) return known;

  return {
    key: moduleKey,
    featureKey: moduleKey as ChatClientFeatureKey,
    label: formatUnknownModuleLabel(moduleKey),
    description: "Módulo habilitado desde chat.pupuia.com pendiente de adaptar en Foodie.",
    href: `/chat/modulos/${moduleKey}`,
    standalone: true
  };
}

export function getEnabledChatModules(user?: {
  role?: "admin" | "client" | "advisor" | string;
  featureFlags?: Partial<ChatClientFeatureFlags> | null;
} | null) {
  if (!user) return [];

  const knownModules = CHAT_MODULES.filter((module) => user.featureFlags?.[module.featureKey] === true);

  const dynamicModules = Object.entries(user.featureFlags || {})
    .filter(([key, enabled]) => {
      if (!enabled) return false;
      if (CHAT_MODULES.some((module) => module.key === key)) return false;
      if (INTERNAL_FEATURES.has(key as ChatClientFeatureKey)) return false;
      return true;
    })
    .map(([key]) => getChatModuleDefinition(key));

  return [...knownModules, ...dynamicModules].filter((module) => module.standalone);
}

export function isChatModuleAllowed(
  moduleKey: string,
  user?: {
    role?: "admin" | "client" | "advisor" | string;
    featureFlags?: Partial<ChatClientFeatureFlags> | null;
  } | null
) {
  if (!user) return false;
  const module = getChatModuleDefinition(moduleKey);
  return user.featureFlags?.[module.featureKey] === true;
}
