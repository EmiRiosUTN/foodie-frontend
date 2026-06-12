"use client";

import { Calendar, Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppModal } from "../app-modal";
import { chatExportService } from "./chat-export-service";

export function ChatExportModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await chatExportService.exportAndDownload(startDate || undefined, endDate || undefined, format);
      toast.success("Exportacion completada", {
        description: "La descarga de chats ya fue generada"
      });
      onClose();
      setStartDate("");
      setEndDate("");
    } catch (err: any) {
      toast.error("No se pudieron exportar los chats", {
        description: err.response?.data?.msg || err.response?.data?.message || "Error inesperado"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Exportar chats"
      description="Descarga conversaciones, etiquetas, asesor asignado y estado."
      widthClassName="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isExporting} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isExporting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Descargar
              </span>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[#D7E7F4] bg-[#F5FAFF] p-4 text-sm text-[#31546E]">
          La exportacion incluye mensajes, etiquetas, timestamps, asesor asignado y estado del chat.
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink">
            <Calendar className="h-4 w-4 text-brand-orange" />
            Rango de fechas
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isExporting}
              className="w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
              disabled={isExporting}
              className="w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange"
            />
          </div>
          <p className="text-xs text-neutral-500">Si dejas ambas fechas vacias se exportan todos los chats.</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-ink">Formato</p>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setFormat("json")}
              disabled={isExporting}
              className={`rounded-[24px] border p-5 text-left transition ${format === "json" ? "border-brand-orange bg-[#FFF4ED]" : "border-brand-line bg-white"}`}
            >
              <FileJson className={`h-8 w-8 ${format === "json" ? "text-brand-orange" : "text-neutral-400"}`} />
              <p className="mt-3 text-sm font-semibold text-brand-ink">JSON</p>
              <p className="mt-1 text-xs text-neutral-500">Completo, ideal para integraciones y backup.</p>
            </button>
            <button
              type="button"
              onClick={() => setFormat("csv")}
              disabled={isExporting}
              className={`rounded-[24px] border p-5 text-left transition ${format === "csv" ? "border-brand-orange bg-[#FFF4ED]" : "border-brand-line bg-white"}`}
            >
              <FileSpreadsheet className={`h-8 w-8 ${format === "csv" ? "text-brand-orange" : "text-neutral-400"}`} />
              <p className="mt-3 text-sm font-semibold text-brand-ink">CSV</p>
              <p className="mt-1 text-xs text-neutral-500">Preparado para Excel y cruces operativos.</p>
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
