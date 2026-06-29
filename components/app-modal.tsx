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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.52)] p-3 backdrop-blur-[2px] sm:p-6" onClick={onClose}>
      <div
        className={`max-h-[94dvh] w-full overflow-y-auto ${widthClassName} rounded-[28px] border border-white/10 bg-[#1F1F21] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:rounded-[34px] sm:p-7 [&_input]:text-[#1F1F21] [&_input]:placeholder:text-neutral-400 [&_label]:text-white [&_select]:text-[#1F1F21] [&_textarea]:text-[#1F1F21] [&_textarea]:placeholder:text-neutral-400 [&_.foodie-input]:border-0 [&_.foodie-input]:bg-white [&_.foodie-input]:text-[#1F1F21] [&_.foodie-input]:placeholder:text-neutral-500`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-extrabold text-white">{title}</p>
            {description ? <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-bold text-brand-orange transition hover:bg-[#FFF4ED]"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5">{children}</div>
        {footer ? <div className="app-modal-footer mt-6 flex flex-col gap-3 sm:flex-row">{footer}</div> : null}
      </div>
    </div>
  );
}
