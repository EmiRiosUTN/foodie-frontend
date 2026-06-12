"use client";

import { chatApi } from "./chat-api";

export interface ChatAdvisor {
  _id: string;
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const chatAdvisorService = {
  async getAdvisors(): Promise<ChatAdvisor[]> {
    const response = await chatApi.get("/advisors");
    return response.data.data;
  }
};
