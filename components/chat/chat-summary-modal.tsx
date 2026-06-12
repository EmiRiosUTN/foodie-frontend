"use client";

import { AlertCircle, FileText, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { AppModal } from "../app-modal";
import { chatSummaryService, type ChatSummary } from "./chat-summary-service";

export function ChatSummaryModal({
  open,
  onClose,
  chatId,
  chatName
}: {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
}) {
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummaries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatSummaryService.getChatSummaries(chatId);
      setSummaries(response.summaries);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSummaries([]);
      } else {
        setError(err.response?.data?.error || "No se pudieron cargar los resumenes");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadSummaries();
  }, [chatId, open]);

  const handleGenerateSummary = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const response = await chatSummaryService.generateSummary(chatId);
      if (response.success) {
        toast.success("Resumen generado", {
          description: "El analisis de la conversacion ya esta disponible"
        });
      }
      await loadSummaries();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "No se pudo generar el resumen";
      const hoursSinceOpened = err.response?.data?.hoursSinceOpened;
      if (hoursSinceOpened !== undefined) {
        const hoursRemaining = Math.max(0, 24 - hoursSinceOpened);
        toast.error("Chat abierto recientemente", {
          description: `Espera ${Math.ceil(hoursRemaining)} horas mas para generar un nuevo resumen`
        });
      } else {
        toast.error("No se pudo generar el resumen", { description: errorMessage });
      }
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (value: string) => {
    try {
      return format(new Date(value), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    } catch {
      return value;
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Resumenes de conversacion"
      description={chatName}
      widthClassName="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateSummary()}
            disabled={isGenerating}
            className="rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generar nuevo resumen
              </span>
            )}
          </button>
        </>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
          </div>
        ) : error && summaries.length === 0 ? (
          <div className="rounded-[24px] border border-[#F0C7B2] bg-[#FFF1EA] px-6 py-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#B65221]" />
            <p className="mt-3 text-sm font-medium text-[#B65221]">{error}</p>
          </div>
        ) : summaries.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-brand-line bg-[#FCFAF7] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <FileText className="h-7 w-7 text-neutral-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-brand-ink">Todavia no hay resumenes</p>
            <p className="mt-2 text-sm text-neutral-500">Genera el primer resumen para obtener una lectura rapida del historial.</p>
          </div>
        ) : (
          summaries.map((summary, index) => (
            <article key={summary._id} className="rounded-[24px] border border-brand-line bg-[#FCFAF7] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF4ED]">
                    <Sparkles className="h-5 w-5 text-brand-orange" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-brand-ink">Resumen #{summaries.length - index}</p>
                      {index === 0 ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
                          Mas reciente
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span>{formatDate(summary.generatedAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {summary.messageCount} mensajes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{summary.summary}</p>
              {summary.generatedBy ? <p className="mt-4 text-xs text-neutral-500">Generado por {summary.generatedBy.name}</p> : null}
            </article>
          ))
        )}
      </div>
    </AppModal>
  );
}
