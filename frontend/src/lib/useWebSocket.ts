"use client";

import { useEffect, useState } from "react";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function useWebSocket(url: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    if (!url) return;

    setStatus("connecting");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    ws.onerror = (err) => {
      console.error("WS Error:", err);
      setStatus("disconnected");
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { status, lastMessage };
}
