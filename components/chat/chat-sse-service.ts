"use client";

type ChatSSEEventType = "new_message" | "chat_status_changed" | "chat_updated" | "connected" | "heartbeat";

interface ChatSSEEvent {
  type: ChatSSEEventType;
  data: any;
}

type ChatSSECallback = (event: ChatSSEEvent) => void;

class ChatSSEService {
  private eventSource: EventSource | null = null;
  private callbacks = new Set<ChatSSECallback>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(token: string) {
    this.shouldReconnect = true;
    if (this.eventSource) {
      this.disconnect();
      this.shouldReconnect = true;
    }

    const url = `https://chat.pupuia.com/api/sse/events?token=${token}`;
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener("connected", (event) => {
      this.notifyCallbacks({ type: "connected", data: JSON.parse((event as MessageEvent).data) });
    });

    this.eventSource.addEventListener("new_message", (event) => {
      this.notifyCallbacks({ type: "new_message", data: JSON.parse((event as MessageEvent).data) });
    });

    this.eventSource.addEventListener("chat_status_changed", (event) => {
      this.notifyCallbacks({ type: "chat_status_changed", data: JSON.parse((event as MessageEvent).data) });
    });

    this.eventSource.addEventListener("chat_updated", (event) => {
      this.notifyCallbacks({ type: "chat_updated", data: JSON.parse((event as MessageEvent).data) });
    });

    this.eventSource.onerror = () => {
      if (this.eventSource?.readyState === EventSource.CLOSED && this.shouldReconnect) {
        this.reconnectTimeout = setTimeout(() => this.connect(token), 3000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(callback: ChatSSECallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(event: ChatSSEEvent) {
    this.callbacks.forEach((callback) => callback(event));
  }
}

export const chatSseService = new ChatSSEService();
