"use client";

import { Loader2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "../app-modal";
import { chatService } from "./chat-service";
import { ChatAdvisorSelector } from "./chat-advisor-selector";

export function ChatAssignAdvisorModal({
  open,
  onClose,
  chatId,
  currentAdvisorId,
  currentAdvisorName,
  onAssignmentComplete
}: {
  open: boolean;
  onClose: () => void;
  chatId: string;
  currentAdvisorId?: string | null;
  currentAdvisorName?: string | null;
  onAssignmentComplete: (advisorId: string | null, advisorName: string | null) => void;
}) {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(currentAdvisorId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedAdvisorId(currentAdvisorId || null);
  }, [currentAdvisorId, open]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const updatedChat = await chatService.assignChatToAdvisor(chatId, selectedAdvisorId);
      toast.success(selectedAdvisorId ? "Chat asignado" : "Chat desasignado", {
        description: selectedAdvisorId ? `Asignado a ${updatedChat.assignedAdvisorName}` : "El chat quedo sin asesor"
      });
      onAssignmentComplete(updatedChat.assignedAdvisorId || null, updatedChat.assignedAdvisorName || null);
      onClose();
    } catch (err: any) {
      toast.error("No se pudo asignar el chat", {
        description: err.response?.data?.msg || err.response?.data?.message || "Error inesperado"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Asignar asesor"
      description="Defini quien toma este chat dentro del equipo."
      widthClassName="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando
              </span>
            ) : (
              "Guardar asignacion"
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {currentAdvisorName ? (
          <div className="rounded-2xl border border-[#F0D8CA] bg-[#FFF7F2] px-4 py-3 text-sm text-[#9A5B38]">
            Asignacion actual: <span className="font-semibold text-brand-ink">{currentAdvisorName}</span>
          </div>
        ) : null}
        <div className="rounded-[24px] border border-brand-line bg-[#FCFAF7] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-ink">
            <UserCheck className="h-4 w-4 text-brand-orange" />
            Seleccion de asesor
          </div>
          <ChatAdvisorSelector selectedAdvisorId={selectedAdvisorId} onSelect={setSelectedAdvisorId} disabled={isSubmitting} />
        </div>
      </div>
    </AppModal>
  );
}
