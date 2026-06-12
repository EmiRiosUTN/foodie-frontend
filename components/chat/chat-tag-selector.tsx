"use client";

import { Plus, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatTagBadge } from "./chat-tag-badge";

export function ChatTagSelector({
  availableTags,
  selectedTags,
  onTagAdd,
  onTagRemove,
  onCreateTag,
  disabled = false
}: {
  availableTags: Array<{ name: string; color: string }>;
  selectedTags: string[];
  onTagAdd: (tagName: string) => void;
  onTagRemove: (tagName: string) => void;
  onCreateTag?: () => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const unselectedTags = availableTags.filter((tag) => !selectedTags.includes(tag.name));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-full border border-[#E6D8CB] bg-[#FFF9F4] px-3 py-2 text-sm font-medium text-brand-ink transition hover:border-[#D9C1AF] hover:bg-white disabled:opacity-50"
      >
        <Tag className="h-4 w-4" />
        Gestionar tags
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 flex max-h-96 w-72 flex-col overflow-hidden rounded-[24px] border border-[#E6D8CB] bg-[#FFFDFC] shadow-[0_24px_60px_rgba(31,31,33,0.14)]">
          <div className="border-b border-brand-line px-4 py-3">
            <h3 className="text-sm font-semibold text-brand-ink">Tags</h3>
          </div>

          {selectedTags.length > 0 ? (
            <div className="border-b border-brand-line px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Aplicadas</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagName) => {
                  const tag = availableTags.find((item) => item.name === tagName);
                  return <ChatTagBadge key={tagName} name={tagName} color={tag?.color || "#6B7280"} size="sm" onRemove={() => onTagRemove(tagName)} />;
                })}
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {unselectedTags.length > 0 ? (
              <>
                <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Disponibles</p>
                {unselectedTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => onTagAdd(tag.name)}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-[#FFF7F2]"
                  >
                    <ChatTagBadge name={tag.name} color={tag.color} size="sm" />
                    <Plus className="h-4 w-4 text-neutral-400 transition group-hover:text-brand-ink" />
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-neutral-500">No hay tags disponibles</div>
            )}
          </div>

          {onCreateTag ? (
            <div className="border-t border-brand-line px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateTag();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-orange transition hover:bg-[#FFF4ED]"
              >
                <Plus className="h-4 w-4" />
                Crear nueva tag
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
