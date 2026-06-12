"use client";

import { useEffect } from "react";

type AppModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

export function AppModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  widthClassName = "max-w-lg"
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,31,33,0.42)] p-6" onClick={onClose}>
      <div
        className={`w-full ${widthClassName} rounded-[30px] border border-brand-line bg-white p-6 shadow-[0_24px_60px_rgba(31,31,33,0.18)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-brand-ink">{title}</p>
            {description ? <p className="mt-2 text-sm text-neutral-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-line px-3 py-1 text-sm font-medium text-neutral-500 transition hover:text-brand-orange"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
