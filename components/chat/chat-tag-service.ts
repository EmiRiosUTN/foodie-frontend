"use client";

import { useCallback, useState } from "react";
import { chatApi } from "./chat-api";

const FOODIE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

async function foodieRequest(path: string, init?: RequestInit) {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("foodie_token") : null;
  const response = await fetch(`${FOODIE_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed with status code ${response.status}`);
  }
  return response.json();
}

export interface ChatTag {
  name: string;
  color: string;
  createdAt?: string;
  _id?: string;
}

export function useChatTagService() {
  const [tags, setTags] = useState<ChatTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, styles] = await Promise.all([chatApi.get("/tags"), foodieRequest("/restaurant/chat-tag-styles")]);
      const stylesByName = new Map((styles as Array<{ tagName: string; color: string }>).map((style) => [style.tagName.trim().toLowerCase(), style.color]));
      setTags((response.data.tags || []).map((tag: ChatTag) => ({ ...tag, color: stylesByName.get(tag.name.trim().toLowerCase()) || tag.color })));
    } catch (err: any) {
      setError(err.response?.data?.error || "Error cargando tags");
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(async (name: string, color: string) => {
    const response = await chatApi.post("/tags", { name, color });
    const newTag = response.data.tag;
    setTags((current) => [...current, newTag]);
    return newTag;
  }, []);

  const updateTag = useCallback(async (tagName: string, color: string) => {
    const normalizedTagName = tagName.trim().toLowerCase();
    await foodieRequest(`/restaurant/chat-tag-styles/${encodeURIComponent(normalizedTagName)}`, { method: "PUT", body: JSON.stringify({ color }) });
    setTags((current) => current.map((tag) => (tag.name.trim().toLowerCase() === normalizedTagName ? { ...tag, color } : tag)));
  }, []);

  const deleteTag = useCallback(async (tagName: string) => {
    await chatApi.delete(`/tags/${encodeURIComponent(tagName)}`);
    setTags((current) => current.filter((tag) => tag.name !== tagName));
  }, []);

  const addTagToChat = useCallback(async (chatId: string, tagName: string) => {
    const response = await chatApi.post(`/tags/chats/${chatId}/tags`, { tag: tagName });
    return response.data as {
      tags: string[];
      metaEvent?: {
        attempted: boolean;
        success: boolean;
        eventName?: string;
        error?: string;
      };
    };
  }, []);

  const removeTagFromChat = useCallback(async (chatId: string, tagName: string) => {
    const response = await chatApi.delete(`/tags/chats/${chatId}/tags/${encodeURIComponent(tagName)}`);
    return response.data.tags as string[];
  }, []);

  const getTag = useCallback((tagName: string) => {
    const normalizedTagName = tagName.trim().toLowerCase();
    return tags.find((tag) => tag.name.trim().toLowerCase() === normalizedTagName);
  }, [tags]);

  return {
    tags,
    loading,
    error,
    loadUserTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToChat,
    removeTagFromChat,
    getTag
  };
}
