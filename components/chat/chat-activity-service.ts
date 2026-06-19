"use client";

const FOODIE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export type ChatActivityPayload = {
  action: "message.sent" | "message.send_failed" | "media.sent" | "media.send_failed" | "template.sent" | "template.send_failed";
  status: "success" | "error";
  chatId: string;
  chatClientId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  messageType: "text" | "media" | "template";
  messageContent?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  templateParameters?: unknown;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  externalMessageId?: string | null;
  externalResponse?: unknown;
  errorMessage?: string | null;
  metadata?: unknown;
};

export function serializeChatError(error: any) {
  return {
    message: error?.response?.data?.message || error?.response?.data?.msg || error?.message || "Error desconocido",
    status: error?.response?.status,
    data: error?.response?.data
  };
}

export async function logChatActivity(payload: ChatActivityPayload) {
  if (typeof window === "undefined") return;
  const token = window.localStorage.getItem("foodie_token");
  if (!token) return;

  try {
    await fetch(`${FOODIE_API_URL}/restaurant/chat-activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // El audit no debe bloquear la operatoria del chat.
  }
}
