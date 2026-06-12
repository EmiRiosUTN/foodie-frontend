"use client";

import { chatApi } from "./chat-api";

export const chatExportService = {
  async exportAndDownload(startDate?: string, endDate?: string, format: "json" | "csv" = "json") {
    const response = await chatApi.post(
      "/chats/export",
      { startDate, endDate, format },
      { responseType: "blob" }
    );
    const extension = format === "json" ? "json" : "csv";
    const filename = `chats-export-${Date.now()}.${extension}`;
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
