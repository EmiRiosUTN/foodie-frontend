"use client";

import { useCallback, useState } from "react";
import { chatApi } from "./chat-api";

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
      const response = await chatApi.get("/tags");
      setTags(response.data.tags || []);
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
    await chatApi.put(`/tags/${encodeURIComponent(tagName)}/color`, { color });
    setTags((current) => current.map((tag) => (tag.name === tagName ? { ...tag, color } : tag)));
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

  const getTag = useCallback((tagName: string) => tags.find((tag) => tag.name === tagName.toLowerCase()), [tags]);

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
