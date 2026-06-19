"use client";

import { chatApi } from "./chat-api";

export type ChatCustomTable = {
  _id: string;
  tableName: string;
  description?: string;
  clientId?: string;
};

export const chatCustomTableService = {
  async getTables(clientId?: string) {
    const response = await chatApi.get("/custom-tables", {
      params: clientId ? { clientId } : {}
    });
    return (response.data.tables || []) as ChatCustomTable[];
  }
};
