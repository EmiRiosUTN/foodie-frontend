"use client";

import { chatApi } from "./chat-api";

export interface ChatSummary {
  _id: string;
  chatId: string;
  clientId: string;
  summary: string;
  messageCount: number;
  generatedAt: string;
  lastMessageDate: string;
  generatedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export const chatSummaryService = {
  async generateSummary(chatId: string) {
    const response = await chatApi.post(`/summaries/generate/${chatId}`);
    return response.data;
  },

  async getChatSummaries(chatId: string, page = 1, limit = 10) {
    const response = await chatApi.get(`/summaries/${chatId}`, {
      params: { page, limit }
    });
    return response.data as {
      success: boolean;
      summaries: ChatSummary[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }
};
