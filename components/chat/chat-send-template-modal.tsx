"use client";

import { AlertTriangle, Loader2, MessageSquareText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "../app-modal";
import { FoodieSelect } from "../foodie-select";
import { chatTemplateService, type WhatsAppTemplate } from "./chat-template-service";

function getParameterCount(template: WhatsAppTemplate) {
  const body = template.components.find((component) => component.type === "BODY");
  if (!body?.text) return 0;
  const matches = body.text.match(/\{\{(\d+)\}\}/g);
  return matches ? matches.length : 0;
}

export function ChatSendTemplateModal({
  open,
  onClose,
  chatId,
  chatName,
  onTemplateSent
}: {
  open: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  onTemplateSent: () => void;
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await chatTemplateService.getTemplates({ status: "APPROVED" });
        setTemplates(data);
      } catch (err: any) {
        toast.error("No se pudieron cargar las plantillas", {
          description: err.response?.data?.msg || err.response?.data?.message || "Error inesperado"
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [open]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template._id === selectedTemplateId) || null,
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setParameters([]);
      return;
    }
    setParameters(new Array(getParameterCount(selectedTemplate)).fill(""));
  }, [selectedTemplate]);

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    try {
      setIsSending(true);
      await chatTemplateService.sendTemplateToChat(selectedTemplateId, {
        chatId,
        parameters: parameters.filter((parameter) => parameter.trim() !== "")
      });
      toast.success("Plantilla enviada", {
        description: "El chat paso automaticamente a modo manual"
      });
      onTemplateSent();
      onClose();
      setSelectedTemplateId(null);
      setParameters([]);
    } catch (err: any) {
      toast.error("No se pudo enviar la plantilla", {
        description: err.response?.data?.msg || err.response?.data?.message || "Error inesperado"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Enviar plantilla"
      description={`WhatsApp oficial a ${chatName}`}
      widthClassName="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSending} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!selectedTemplateId || isSending}
            className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando
              </span>
            ) : (
              "Enviar plantilla"
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[24px] border border-[#F0D8CA] bg-[#FFF7F2] p-4 text-sm text-[#9A5B38]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          Al enviar una plantilla el chat cambia a modo manual para evitar respuestas automáticas del bot.
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-brand-ink">Plantilla</label>
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-brand-line bg-[#FCFAF7] px-4 py-5">
              <Loader2 className="h-5 w-5 animate-spin text-brand-orange" />
            </div>
          ) : (
            <FoodieSelect
              value={selectedTemplateId || ""}
              onChange={(event) => setSelectedTemplateId(event.target.value || null)}
              disabled={isSending}
              className="font-medium"
            >
              <option value="">Selecciona una plantilla...</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name} ({chatTemplateService.getCategoryText(template.category)})
                </option>
              ))}
            </FoodieSelect>
          )}
        </div>

        {selectedTemplate ? (
          <div className="rounded-[24px] border border-brand-line bg-[#FCFAF7] p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-ink">
              <MessageSquareText className="h-4 w-4 text-brand-orange" />
              Vista previa
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">{chatTemplateService.getTemplatePreview(selectedTemplate)}</p>
          </div>
        ) : null}

        {selectedTemplate && getParameterCount(selectedTemplate) > 0 ? (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-brand-ink">Parametros</label>
            {parameters.map((parameter, index) => (
              <input
                key={index}
                type="text"
                value={parameter}
                onChange={(event) => {
                  const next = [...parameters];
                  next[index] = event.target.value;
                  setParameters(next);
                }}
                placeholder={`Parametro {{${index + 1}}}`}
                disabled={isSending}
                className="w-full rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange"
              />
            ))}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
