export interface ChatClientFeatureFlags {
  data: boolean;
  campaigns: boolean;
  whatsappCampaigns: boolean;
  templates: boolean;
  advisors: boolean;
  advisorMetrics: boolean;
  inscripciones: boolean;
  metaEventos: boolean;
  assistant: boolean;
  conversationSummary: boolean;
  sendTemplates: boolean;
}

export type ChatClientFeatureKey = keyof ChatClientFeatureFlags;

export const DEFAULT_CHAT_FEATURE_FLAGS: ChatClientFeatureFlags = {
  data: true,
  campaigns: true,
  whatsappCampaigns: true,
  templates: true,
  advisors: true,
  advisorMetrics: true,
  inscripciones: true,
  metaEventos: true,
  assistant: true,
  conversationSummary: true,
  sendTemplates: true
};

export function isChatFeatureEnabled(
  role: "admin" | "client" | "advisor" | undefined,
  feature: ChatClientFeatureKey,
  featureFlags?: Partial<ChatClientFeatureFlags> | null
) {
  if (role === "admin") return true;
  return {
    ...DEFAULT_CHAT_FEATURE_FLAGS,
    ...(featureFlags || {})
  }[feature];
}
