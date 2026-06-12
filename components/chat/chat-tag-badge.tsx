"use client";

import { X } from "lucide-react";

export function ChatTagBadge({
  name,
  color,
  onRemove,
  size = "md",
  className = ""
}: {
  name: string;
  color: string;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClassName = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5"
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white ${sizeClassName} ${className}`} style={{ backgroundColor: color }}>
      {name}
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 transition hover:bg-white/25"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
