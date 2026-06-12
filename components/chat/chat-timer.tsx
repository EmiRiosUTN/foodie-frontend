"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function ChatTimer({ statusChangeTime, onExpire }: { statusChangeTime: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const endTime = new Date(new Date(statusChangeTime).getTime() + 30 * 60 * 1000);
    const updateTimer = () => {
      const diff = Math.max(0, endTime.getTime() - Date.now());
      setTimeLeft(diff);
      if (diff === 0 && onExpire) onExpire();
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [onExpire, statusChangeTime]);

  if (!timeLeft) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 text-[#B65221]">
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
