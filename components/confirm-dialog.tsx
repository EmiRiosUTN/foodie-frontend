"use client";

import { AppModal } from "./app-modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <AppModal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      widthClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-full px-4 py-3 text-sm font-medium text-white ${
              tone === "danger" ? "bg-[#B65221]" : "bg-brand-orange"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="rounded-2xl border border-brand-line bg-[#FCFAF7] p-4 text-sm text-neutral-600">
        Esta accion requiere confirmacion explicita.
      </div>
    </AppModal>
  );
}
