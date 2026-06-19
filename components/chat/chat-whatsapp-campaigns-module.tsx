"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileUp, MessageSquareText, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "../app-modal";
import { ConfirmDialog } from "../confirm-dialog";
import { FoodieSelect } from "../foodie-select";
import { chatTemplateService, type WhatsAppTemplate } from "./chat-template-service";
import {
  chatWhatsAppCampaignService,
  type WhatsAppCampaign,
  type WhatsAppCampaignInput,
  type WhatsAppCampaignRecipient,
  type WhatsAppCampaignStats
} from "./chat-whatsapp-campaign-service";

type RecipientDraft = Pick<WhatsAppCampaignRecipient, "phoneNumber" | "name">;

type CampaignForm = {
  name: string;
  templateId: string;
  parameters: string[];
  recipients: RecipientDraft[];
};

const emptyStats: WhatsAppCampaignStats = {
  totalCampaigns: 0,
  totalRecipients: 0,
  totalSent: 0,
  totalDelivered: 0,
  totalRead: 0,
  totalFailed: 0
};

const emptyForm: CampaignForm = {
  name: "",
  templateId: "",
  parameters: [],
  recipients: []
};

function statusLabel(status: string) {
  return (
    {
      draft: "Borrador",
      sending: "Enviando",
      completed: "Completada",
      partial: "Parcial",
      failed: "Fallida",
      pending: "Pendiente",
      accepted: "Aceptado",
      sent: "Enviado",
      delivered: "Entregado",
      read: "Leído"
    }[status] || status
  );
}

function statusClass(status: string) {
  return (
    {
      draft: "bg-[#FFF4D8] text-[#8A5B00]",
      sending: "bg-[#EAF2FF] text-[#185ABC]",
      completed: "bg-[#E9F8EF] text-[#137A3F]",
      partial: "bg-[#FFF4ED] text-brand-orange",
      failed: "bg-[#FDECEC] text-[#B42318]",
      pending: "bg-[#F4EEE8] text-neutral-600",
      accepted: "bg-[#EAF2FF] text-[#185ABC]",
      sent: "bg-[#EAF2FF] text-[#185ABC]",
      delivered: "bg-[#E9F8EF] text-[#137A3F]",
      read: "bg-[#E7F8F2] text-[#0F766E]"
    }[status] || "bg-[#F4EEE8] text-neutral-600"
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTemplateId(campaign: WhatsAppCampaign | null) {
  if (!campaign) return "";
  if (typeof campaign.template === "string") return campaign.template;
  return campaign.template?._id || "";
}

function getBodyText(template?: WhatsAppTemplate | null) {
  return template?.components.find((component) => component.type === "BODY")?.text || "";
}

function getParameterCount(template?: WhatsAppTemplate | null) {
  return new Set(Array.from(getBodyText(template).matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((match) => match[1])).size;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeRecipients(recipients: RecipientDraft[]) {
  const seen = new Set<string>();
  return recipients
    .map((recipient) => ({
      phoneNumber: normalizePhone(recipient.phoneNumber),
      name: String(recipient.name || "").trim()
    }))
    .filter((recipient) => {
      if (!recipient.phoneNumber || recipient.phoneNumber.length < 8 || seen.has(recipient.phoneNumber)) return false;
      seen.add(recipient.phoneNumber);
      return true;
    });
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-brand-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(status)}`}>{statusLabel(status)}</span>;
}

function RecipientManager({
  recipients,
  onChange
}: {
  recipients: RecipientDraft[];
  onChange: (recipients: RecipientDraft[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function addRecipient() {
    const normalizedPhone = normalizePhone(phoneNumber);
    setError("");
    if (!normalizedPhone || normalizedPhone.length < 8) {
      setError("Ingresa un teléfono válido.");
      return;
    }
    if (recipients.some((recipient) => normalizePhone(recipient.phoneNumber) === normalizedPhone)) {
      setError("Ese teléfono ya fue agregado.");
      return;
    }
    onChange([...recipients, { phoneNumber: normalizedPhone, name: name.trim() }]);
    setPhoneNumber("");
    setName("");
  }

  async function uploadCsv(file?: File) {
    if (!file) return;
    const response = await chatWhatsAppCampaignService.parseCSV(await file.text());
    const nextRecipients = normalizeRecipients([...(recipients || []), ...(response.recipients || [])]);
    onChange(nextRecipients);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
    toast.success("CSV procesado", { description: `${nextRecipients.length} destinatarios cargados` });
  }

  return (
    <div className="rounded-[24px] border border-brand-line bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-brand-ink">Destinatarios WhatsApp</p>
          <p className="text-sm text-neutral-500">{recipients.length} numeros cargados</p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-line px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-orange hover:text-brand-orange"
        >
          <FileUp className="h-4 w-4" />
          Importar CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(event) => uploadCsv(event.target.files?.[0]).catch(() => setError("No se pudo procesar el CSV."))}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input className="foodie-input" placeholder="5491122334455" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
        <input className="foodie-input" placeholder="Nombre opcional" value={name} onChange={(event) => setName(event.target.value)} />
        <button type="button" onClick={addRecipient} className="rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white">
          Agregar
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 max-h-48 overflow-y-auto rounded-[20px] border border-brand-line">
        {recipients.length ? (
          recipients.map((recipient, index) => (
            <div key={`${recipient.phoneNumber}-${index}`} className="flex items-center justify-between border-b border-brand-line px-4 py-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-ink">{recipient.phoneNumber}</p>
                <p className="truncate text-xs text-neutral-500">{recipient.name || "Sin nombre"}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(recipients.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-full p-2 text-red-600 transition hover:bg-[#FDECEC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">No hay destinatarios cargados.</p>
        )}
      </div>
    </div>
  );
}

function CampaignModal({
  open,
  form,
  templates,
  editing,
  saving,
  onClose,
  onChange,
  onSave
}: {
  open: boolean;
  form: CampaignForm;
  templates: WhatsAppTemplate[];
  editing: WhatsAppCampaign | null;
  saving: boolean;
  onClose: () => void;
  onChange: (form: CampaignForm) => void;
  onSave: () => void;
}) {
  const selectedTemplate = templates.find((template) => template._id === form.templateId) || null;
  const parameterCount = getParameterCount(selectedTemplate);

  useEffect(() => {
    if (!open) return;
    if (form.parameters.length === parameterCount) return;
    onChange({
      ...form,
      parameters: Array.from({ length: parameterCount }, (_, index) => form.parameters[index] || "")
    });
  }, [form, onChange, open, parameterCount]);

  return (
    <AppModal
      open={open}
      title={editing ? "Editar campaña WhatsApp" : "Nueva campaña WhatsApp"}
      description="Usa plantillas aprobadas de Meta y carga destinatarios manualmente o por CSV."
      onClose={onClose}
      widthClassName="max-w-5xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear campaña"}
          </button>
        </>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid gap-5">
          <input className="foodie-input" placeholder="Nombre de campaña" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />

          <FoodieSelect
            value={form.templateId}
            disabled={Boolean(editing)}
            onChange={(event) => onChange({ ...form, templateId: event.target.value })}
          >
            <option value="">Seleccionar plantilla aprobada</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name} - {template.language} - {chatTemplateService.getCategoryText(template.category)}
              </option>
            ))}
          </FoodieSelect>

          {selectedTemplate ? (
            <div className="rounded-[24px] border border-brand-line bg-[#FFFDF9] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Preview de plantilla</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink">{getBodyText(selectedTemplate) || "Sin cuerpo de mensaje."}</p>
            </div>
          ) : null}

          {parameterCount ? (
            <div className="grid gap-3 rounded-[24px] border border-brand-line bg-white p-5 md:grid-cols-2">
              {Array.from({ length: parameterCount }).map((_, index) => (
                <input
                  key={index}
                  className="foodie-input"
                  placeholder={`Parametro {{${index + 1}}}`}
                  value={form.parameters[index] || ""}
                  onChange={(event) => {
                    const nextParameters = [...form.parameters];
                    nextParameters[index] = event.target.value;
                    onChange({ ...form, parameters: nextParameters });
                  }}
                />
              ))}
            </div>
          ) : null}

          <RecipientManager recipients={form.recipients} onChange={(recipients) => onChange({ ...form, recipients })} />
        </div>
      </div>
    </AppModal>
  );
}

function CampaignDetailsModal({
  campaign,
  open,
  onClose
}: {
  campaign: WhatsAppCampaign | null;
  open: boolean;
  onClose: () => void;
}) {
  const recipients = campaign?.recipients || [];

  return (
    <AppModal open={open} title={campaign?.name || "Detalle de campaña"} description="Seguimiento de envío y estado de destinatarios." onClose={onClose} widthClassName="max-w-6xl">
      {!campaign ? null : (
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Destinatarios" value={campaign.totalRecipients} />
            <StatCard label="Enviados" value={campaign.sentCount} />
            <StatCard label="Entregados" value={campaign.deliveredCount} />
            <StatCard label="Fallidos" value={campaign.failedCount} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[24px] border border-brand-line bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Mensaje</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink">{campaign.bodyPreview || "Sin preview."}</p>
              {campaign.parameters?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {campaign.parameters.map((parameter, index) => (
                    <span key={`${parameter}-${index}`} className="rounded-full bg-[#FFF4ED] px-3 py-1 text-xs font-semibold text-brand-orange">
                      {`{{${index + 1}}}: ${parameter || "-"}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-brand-line bg-white p-5 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Resumen</p>
              <div className="mt-4 grid gap-3 text-neutral-600">
                <p>
                  <span className="font-semibold text-brand-ink">Estado:</span> <StatusBadge status={campaign.status} />
                </p>
                <p>
                  <span className="font-semibold text-brand-ink">Plantilla:</span> {campaign.templateName}
                </p>
                <p>
                  <span className="font-semibold text-brand-ink">Idioma:</span> {campaign.templateLanguage}
                </p>
                <p>
                  <span className="font-semibold text-brand-ink">Creada:</span> {formatDate(campaign.createdAt)}
                </p>
                <p>
                  <span className="font-semibold text-brand-ink">Inicio:</span> {formatDate(campaign.startedAt)}
                </p>
                <p>
                  <span className="font-semibold text-brand-ink">Fin:</span> {formatDate(campaign.completedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-brand-line bg-white">
            <div className="border-b border-brand-line px-5 py-4">
              <p className="font-semibold text-brand-ink">Destinatarios</p>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Telefono</th>
                    <th className="px-5 py-4 font-semibold">Nombre</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 font-semibold">Ultimo evento</th>
                    <th className="px-5 py-4 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line">
                  {recipients.length ? (
                    recipients.map((recipient, index) => (
                      <tr key={recipient._id || `${recipient.phoneNumber}-${index}`}>
                        <td className="px-5 py-4 font-semibold text-brand-ink">{recipient.phoneNumber}</td>
                        <td className="px-5 py-4 text-neutral-600">{recipient.name || "-"}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={recipient.status} />
                        </td>
                        <td className="px-5 py-4 text-neutral-600">{formatDate(recipient.lastStatusAt || recipient.sentAt)}</td>
                        <td className="px-5 py-4 text-red-600">{recipient.error || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">
                        No hay destinatarios para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppModal>
  );
}

export function ChatWhatsAppCampaignsModule() {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [stats, setStats] = useState<WhatsAppCampaignStats>(emptyStats);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "default";
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirmar",
    action: async () => {}
  });

  const campaignRows = useMemo(() => campaigns, [campaigns]);

  async function loadData() {
    setLoading(true);
    try {
      const [campaignResponse, statsResponse, templateResponse] = await Promise.all([
        chatWhatsAppCampaignService.list({ limit: 50 }),
        chatWhatsAppCampaignService.stats().catch(() => ({ stats: emptyStats })),
        chatTemplateService.getTemplates({ status: "APPROVED" }).catch(() => [])
      ]);
      setCampaigns(campaignResponse.campaigns || []);
      setStats(statsResponse.stats || emptyStats);
      setTemplates(templateResponse || []);
    } catch (error) {
      console.error("Error loading WhatsApp campaigns", error);
      toast.error("No se pudieron cargar las campañas de WhatsApp");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditingCampaign(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function openEdit(campaign: WhatsAppCampaign) {
    try {
      const response = await chatWhatsAppCampaignService.getById(campaign._id);
      const currentCampaign = response.campaign || campaign;
      setEditingCampaign(currentCampaign);
      setForm({
        name: currentCampaign.name,
        templateId: getTemplateId(currentCampaign),
        parameters: currentCampaign.parameters || [],
        recipients: (currentCampaign.recipients || []).map((recipient) => ({
          phoneNumber: recipient.phoneNumber,
          name: recipient.name || ""
        }))
      });
      setModalOpen(true);
    } catch (error) {
      console.error("Error loading WhatsApp campaign", error);
      toast.error("No se pudo cargar la campaña");
    }
  }

  async function openDetails(campaign: WhatsAppCampaign) {
    try {
      const response = await chatWhatsAppCampaignService.getById(campaign._id);
      setSelectedCampaign(response.campaign || campaign);
      setDetailsOpen(true);
    } catch (error) {
      console.error("Error loading WhatsApp campaign details", error);
      toast.error("No se pudo cargar el detalle");
    }
  }

  async function saveCampaign() {
    const recipients = normalizeRecipients(form.recipients);
    if (!form.name.trim()) {
      toast.error("Ingresa un nombre para la campaña");
      return;
    }
    if (!form.templateId) {
      toast.error("Selecciona una plantilla aprobada");
      return;
    }
    if (!recipients.length) {
      toast.error("Carga al menos un destinatario");
      return;
    }

    setSaving(true);
    try {
      const data: WhatsAppCampaignInput = {
        name: form.name.trim(),
        templateId: form.templateId,
        parameters: form.parameters,
        recipients
      };

      if (editingCampaign) {
        await chatWhatsAppCampaignService.update(editingCampaign._id, {
          name: data.name,
          parameters: data.parameters
        });
        await chatWhatsAppCampaignService.addRecipients(editingCampaign._id, recipients);
        toast.success("Campaña actualizada");
      } else {
        await chatWhatsAppCampaignService.create(data);
        toast.success("Campaña de WhatsApp creada");
      }

      setModalOpen(false);
      setEditingCampaign(null);
      setForm(emptyForm);
      await loadData();
    } catch (error: any) {
      console.error("Error saving WhatsApp campaign", error);
      toast.error(error.response?.data?.error || "No se pudo guardar la campaña");
    } finally {
      setSaving(false);
    }
  }

  function requestSend(campaign: WhatsAppCampaign) {
    setConfirm({
      open: true,
      title: "Enviar campaña WhatsApp",
      description: `Se enviara la plantilla a ${campaign.totalRecipients} destinatarios cargados.`,
      confirmLabel: "Enviar",
      action: async () => {
        await chatWhatsAppCampaignService.send(campaign._id);
        toast.success("Campaña en proceso de envío");
        setConfirm((current) => ({ ...current, open: false }));
        setTimeout(loadData, 2000);
      }
    });
  }

  function requestDelete(campaign: WhatsAppCampaign) {
    setConfirm({
      open: true,
      title: "Eliminar campaña",
      description: "Esta acción eliminará la campaña de WhatsApp y sus métricas.",
      confirmLabel: "Eliminar",
      tone: "danger",
      action: async () => {
        await chatWhatsAppCampaignService.remove(campaign._id);
        toast.success("Campaña eliminada");
        setConfirm((current) => ({ ...current, open: false }));
        await loadData();
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm leading-7 text-neutral-500">
            Crea envíos masivos por WhatsApp usando plantillas aprobadas en Meta. Este módulo es independiente de las campañas de mail.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,90,0,0.24)]"
        >
          <Plus className="h-4 w-4" />
          Nueva campaña WhatsApp
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Campañas" value={stats.totalCampaigns} />
        <StatCard label="Destinatarios" value={stats.totalRecipients} />
        <StatCard label="Enviados" value={stats.totalSent} />
        <StatCard label="Entregados" value={stats.totalDelivered} />
        <StatCard label="Leídos" value={stats.totalRead} />
        <StatCard label="Fallidos" value={stats.totalFailed} />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-brand-line bg-white">
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <div>
            <p className="font-semibold text-brand-ink">Campañas WhatsApp</p>
            <p className="text-sm text-neutral-500">{campaignRows.length} registros</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Nombre</th>
                <th className="px-5 py-4 font-semibold">Plantilla</th>
                <th className="px-5 py-4 font-semibold">Destinatarios</th>
                <th className="px-5 py-4 font-semibold">Estado</th>
                <th className="px-5 py-4 font-semibold">Enviados</th>
                <th className="px-5 py-4 font-semibold">Fallidos</th>
                <th className="px-5 py-4 font-semibold">Creada</th>
                <th className="px-5 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-neutral-500">
                    Cargando campañas...
                  </td>
                </tr>
              ) : campaignRows.length ? (
                campaignRows.map((campaign) => (
                  <tr key={campaign._id} className="text-brand-ink">
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => openDetails(campaign)} className="font-semibold transition hover:text-brand-orange">
                        {campaign.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">{campaign.templateName || "-"}</td>
                    <td className="px-5 py-4 text-neutral-600">{campaign.totalRecipients}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-5 py-4 text-neutral-600">{campaign.sentCount}</td>
                    <td className="px-5 py-4 text-neutral-600">{campaign.failedCount}</td>
                    <td className="px-5 py-4 text-neutral-600">{formatDate(campaign.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openDetails(campaign)} className="rounded-full border border-brand-line p-2 text-brand-ink transition hover:border-brand-orange hover:text-brand-orange">
                          <Eye className="h-4 w-4" />
                        </button>
                        {campaign.status === "draft" ? (
                          <>
                            <button type="button" onClick={() => openEdit(campaign)} className="rounded-full border border-brand-line p-2 text-brand-ink transition hover:border-brand-orange hover:text-brand-orange">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => requestSend(campaign)} className="rounded-full border border-brand-line p-2 text-brand-ink transition hover:border-brand-orange hover:text-brand-orange">
                              <Send className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        <button type="button" onClick={() => requestDelete(campaign)} className="rounded-full border border-brand-line p-2 text-red-600 transition hover:bg-[#FDECEC]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF4ED] text-brand-orange">
                        <MessageSquareText className="h-7 w-7" />
                      </span>
                      <p className="mt-4 font-semibold text-brand-ink">No hay campañas de WhatsApp creadas.</p>
                      <p className="mt-1 text-sm text-neutral-500">Crea una campaña y carga teléfonos por CSV o manualmente.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CampaignModal
        open={modalOpen}
        form={form}
        templates={templates}
        editing={editingCampaign}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingCampaign(null);
        }}
        onChange={setForm}
        onSave={saveCampaign}
      />

      <CampaignDetailsModal
        campaign={selectedCampaign}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCampaign(null);
          loadData();
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        tone={confirm.tone}
        onCancel={() => setConfirm((current) => ({ ...current, open: false }))}
        onConfirm={() => {
          confirm.action().catch((error: any) => {
            console.error("Error confirming WhatsApp campaign action", error);
            toast.error(error.response?.data?.error || "No se pudo completar la acción");
          });
        }}
      />
    </div>
  );
}
