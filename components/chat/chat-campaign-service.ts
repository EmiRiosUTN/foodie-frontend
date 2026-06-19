"use client";

import { chatApi } from "./chat-api";

export type ChatRecipient = {
  _id?: string;
  email: string;
  name: string;
  status: "pending" | "sent" | "failed";
  sentAt?: string;
  error?: string;
  opened?: boolean;
  openCount?: number;
  clicked?: boolean;
  clickCount?: number;
};

export type ChatCampaign = {
  _id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: "draft" | "sending" | "sent" | "failed" | "partial";
  recipients: ChatRecipient[];
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  openCount?: number;
  clickCount?: number;
  uniqueOpens?: number;
  uniqueClicks?: number;
  openRate?: number;
  clickRate?: number;
  trackOpens?: boolean;
  trackClicks?: boolean;
  callToActionUrl?: string;
  callToActionLabel?: string;
  emailCredential?: string | { _id: string };
  sentAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatCampaignStats = {
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  totalRecipients: number;
  totalOpens?: number;
  totalClicks?: number;
  averageOpenRate?: number;
  averageClickRate?: number;
};

export type ChatEmailCredential = {
  _id: string;
  name: string;
  fromEmail: string;
  fromName?: string;
  isActive: boolean;
};

export type ChatCampaignInput = {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  emailCredentialId: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  callToActionUrl?: string;
  callToActionLabel?: string;
};

export const chatCampaignService = {
  async getCampaigns(params?: { status?: string; page?: number; limit?: number }) {
    const response = await chatApi.get("/campaigns", { params });
    return response.data as { campaigns?: ChatCampaign[] };
  },

  async getStats() {
    const response = await chatApi.get("/campaigns/stats");
    return response.data as { stats?: ChatCampaignStats };
  },

  async getCampaignById(id: string) {
    const response = await chatApi.get(`/campaigns/${id}`);
    return response.data as { campaign: ChatCampaign };
  },

  async createCampaign(data: ChatCampaignInput) {
    const response = await chatApi.post("/campaigns", data);
    return response.data as { campaign: ChatCampaign };
  },

  async updateCampaign(id: string, data: Partial<ChatCampaignInput>) {
    const response = await chatApi.put(`/campaigns/${id}`, data);
    return response.data;
  },

  async deleteCampaign(id: string) {
    const response = await chatApi.delete(`/campaigns/${id}`);
    return response.data;
  },

  async addRecipients(id: string, recipients: ChatRecipient[]) {
    const response = await chatApi.post(`/campaigns/${id}/recipients`, { recipients });
    return response.data;
  },

  async parseCSV(csvContent: string) {
    const response = await chatApi.post("/campaigns/parse-csv", { csvContent });
    return response.data as { recipients: ChatRecipient[] };
  },

  async sendCampaign(id: string) {
    const response = await chatApi.post(`/campaigns/${id}/send`);
    return response.data;
  },

  async getEmailCredentials() {
    const response = await chatApi.get("/email-credentials");
    return response.data as { credentials?: ChatEmailCredential[] };
  }
};
