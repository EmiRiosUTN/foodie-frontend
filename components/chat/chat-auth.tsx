"use client";

import { createContext, useContext, useMemo } from "react";
import { useWorkspace } from "../workspace-provider";
import type { ChatClientFeatureFlags } from "./chat-feature-flags";

type ChatAuthUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "client" | "advisor";
  clientId?: string;
  advisorId?: string;
  workflowId?: string;
  whatsappToken?: string;
  featureFlags?: Partial<ChatClientFeatureFlags>;
};

type ChatAuthContextValue = {
  user: ChatAuthUser | null;
};

const ChatAuthContext = createContext<ChatAuthContextValue | null>(null);

export function ChatAuthProvider({ children }: { children: React.ReactNode }) {
  const { chatSession } = useWorkspace();

  const value = useMemo<ChatAuthContextValue>(() => {
    if (!chatSession.user) {
      return { user: null };
    }

    return {
      user: {
        ...chatSession.user,
        role: (chatSession.user.role as ChatAuthUser["role"]) || "client"
      }
    };
  }, [chatSession.user]);

  return <ChatAuthContext.Provider value={value}>{children}</ChatAuthContext.Provider>;
}

export function useChatAuth() {
  const context = useContext(ChatAuthContext);
  if (!context) {
    throw new Error("useChatAuth must be used within ChatAuthProvider");
  }
  return context;
}
