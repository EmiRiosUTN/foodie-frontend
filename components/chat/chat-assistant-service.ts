"use client";

import { chatApi } from "./chat-api";

export type ChatFaqVariation = {
  question: string;
  count: number;
  lastSeen: string;
};

export type ChatFaq = {
  _id: string;
  clientId: string;
  canonicalQuestion: string;
  variations: ChatFaqVariation[];
  commonResponse: string | null;
  category: string;
  totalCount: number;
  lastSeen: string;
  status: "active" | "archived";
};

export type ChatFaqStats = {
  totalFAQs: number;
  totalQuestions: number;
  categories: Array<{
    category: string;
    faqCount: number;
    questionCount: number;
  }>;
};

export type ChatAnalyticsStats = {
  received: number;
  sent: number;
  total: number;
  dailyTrend: Array<{ _id: string; total: number; userCount: number }>;
  peakHours: string[];
  topCategories: Array<{ category: string; count: number }>;
  satisfactionRate: number | null;
};

export type ChatImprovementSuggestion = {
  _id: string;
  type: "knowledge_gap" | "escalation" | "sentiment";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  status: "pending" | "resolved";
  createdAt: string;
};

export const chatAssistantService = {
  async getFaqs(clientId?: string, options?: { category?: string; status?: "active" | "archived"; limit?: number }) {
    const response = await chatApi.get("/faqs", {
      params: {
        ...(clientId ? { clientId } : {}),
        ...(options || {})
      }
    });
    return response.data as { faqs: ChatFaq[]; categories: string[] };
  },

  async getFaqStats(clientId?: string) {
    const response = await chatApi.get("/faqs/stats", {
      params: clientId ? { clientId } : undefined
    });
    return response.data as { stats: ChatFaqStats };
  },

  async analyzeFaqs(clientId?: string) {
    const response = await chatApi.post(
      "/faqs/analyze",
      {},
      {
        params: clientId ? { clientId } : undefined
      }
    );
    return response.data as { stats: { messagesAnalyzed: number; faqsGenerated: number } };
  },

  async deleteFaq(id: string) {
    const response = await chatApi.delete(`/faqs/${id}`);
    return response.data;
  },

  async getAnalytics(clientId?: string) {
    const response = await chatApi.get("/assistant/analytics", {
      params: clientId ? { clientId } : undefined
    });
    return response.data as { stats: ChatAnalyticsStats };
  },

  async getImprovements(clientId?: string) {
    const response = await chatApi.get("/assistant/improvements", {
      params: clientId ? { clientId } : undefined
    });
    return response.data as { suggestions: ChatImprovementSuggestion[] };
  },

  async generateImprovements(clientId?: string) {
    const response = await chatApi.post(
      "/assistant/improvements/generate",
      {},
      {
        params: clientId ? { clientId } : undefined
      }
    );
    return response.data as { count: number; suggestions: ChatImprovementSuggestion[] };
  }
};
