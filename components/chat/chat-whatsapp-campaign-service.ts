"use client";

import { chatApi } from "./chat-api";

export type WhatsAppCampaignRecipient = {
  _id?: string;
  phoneNumber: string;
  name: string;
  status: "pending" | "accepted" | "sent" | "delivered" | "read" | "failed" | string;
  whatsAppMessageId?: string | null;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  lastStatusAt?: string;
  error?: string;
};

export type WhatsAppCampaign = {
  _id: string;
  name: string;
  template:
    | string
    | {
        _id: string;
        name: string;
        status: string;
        category: string;
        language: string;
      };
  templateName: string;
  templateLanguage: string;
  templateCategory: "MARKETING" | "UTILITY" | "AUTHENTICATION" | string;
  bodyPreview: string;
  parameters: string[];
  recipients?: WhatsAppCampaignRecipient[];
  status: "draft" | "sending" | "completed" | "partial" | "failed" | string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdBy: string;
  clientId: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppCampaignInput = {
  name: string;
  templateId: string;
  parameters?: string[];
  recipients?: Array<Pick<WhatsAppCampaignRecipient, "phoneNumber" | "name">>;
};

export type WhatsAppCampaignStats = {
  totalCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
};

export const chatWhatsAppCampaignService = {
  async list(params?: { status?: string; page?: number; limit?: number }) {
    const response = await chatApi.get("/whatsapp-campaigns", { params });
    return response.data as { campaigns?: WhatsAppCampaign[] };
  },

  async getById(id: string) {
    const response = await chatApi.get(`/whatsapp-campaigns/${id}`);
    return response.data as { campaign?: WhatsAppCampaign };
  },

  async create(data: WhatsAppCampaignInput) {
    const response = await chatApi.post("/whatsapp-campaigns", data);
    return response.data as { campaign: WhatsAppCampaign };
  },

  async update(id: string, data: Partial<WhatsAppCampaignInput>) {
    const response = await chatApi.put(`/whatsapp-campaigns/${id}`, data);
    return response.data as { campaign: WhatsAppCampaign };
  },

  async addRecipients(id: string, recipients: Array<Pick<WhatsAppCampaignRecipient, "phoneNumber" | "name">>) {
    const response = await chatApi.post(`/whatsapp-campaigns/${id}/recipients`, { recipients });
    return response.data as { totalRecipients?: number };
  },

  async parseCSV(csvContent: string) {
    const response = await chatApi.post("/whatsapp-campaigns/parse-csv", { csvContent });
    return response.data as {
      recipients?: Array<Pick<WhatsAppCampaignRecipient, "phoneNumber" | "name">>;
      count?: number;
    };
  },

  async send(id: string) {
    const response = await chatApi.post(`/whatsapp-campaigns/${id}/send`);
    return response.data;
  },

  async remove(id: string) {
    const response = await chatApi.delete(`/whatsapp-campaigns/${id}`);
    return response.data;
  },

  async stats() {
    const response = await chatApi.get("/whatsapp-campaigns/stats");
    return response.data as { stats?: WhatsAppCampaignStats };
  }
};
