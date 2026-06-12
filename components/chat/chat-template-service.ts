"use client";

import { chatApi } from "./chat-api";

export interface WhatsAppTemplate {
  _id: string;
  clientId: string;
  wabaId: string;
  templateId?: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED" | "DELETED";
  components: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
    text?: string;
    example?: any;
    buttons?: Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

export const chatTemplateService = {
  async getTemplates(filters?: { status?: string; category?: string; language?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.language) params.append("language", filters.language);
    const response = await chatApi.get(params.toString() ? `/templates?${params.toString()}` : "/templates");
    return response.data.templates as WhatsAppTemplate[];
  },

  async sendTemplateToChat(templateId: string, sendData: { chatId: string; parameters?: string[] }) {
    const response = await chatApi.post(`/templates/${templateId}/send`, sendData);
    return response.data;
  },

  getTemplatePreview(template: WhatsAppTemplate) {
    return template.components.find((component) => component.type === "BODY")?.text || "";
  },

  getCategoryText(category: string) {
    return (
      {
        MARKETING: "Marketing",
        UTILITY: "Utilidad",
        AUTHENTICATION: "Autenticacion"
      }[category] || category
    );
  }
};
