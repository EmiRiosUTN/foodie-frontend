"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, FileUp, Plus, Send, Trash2, X } from "lucide-react";
import {
  chatCampaignService,
  type ChatCampaign,
  type ChatCampaignInput,
  type ChatCampaignStats,
  type ChatEmailCredential,
  type ChatRecipient
} from "./chat-campaign-service";

type CampaignForm = ChatCampaignInput & {
  recipients: ChatRecipient[];
};

const emptyForm: CampaignForm = {
  name: "",
  subject: "",
  htmlContent: "",
  textContent: "",
  emailCredentialId: "",
  trackOpens: true,
  trackClicks: true,
  callToActionUrl: "",
  callToActionLabel: "",
  recipients: []
};

const emptyStats: ChatCampaignStats = {
  totalCampaigns: 0,
  totalSent: 0,
  totalFailed: 0,
  totalRecipients: 0
};

function getCredentialId(campaign: ChatCampaign) {
  if (!campaign.emailCredential) return "";
  if (typeof campaign.emailCredential === "string") return campaign.emailCredential;
  return campaign.emailCredential._id;
}

function statusLabel(status: ChatCampaign["status"]) {
  return (
    {
      draft: "Borrador",
      sending: "Enviando",
      sent: "Enviada",
      failed: "Fallida",
      partial: "Parcial"
    } satisfies Record<ChatCampaign["status"], string>
  )[status];
}

function statusClass(status: ChatCampaign["status"]) {
  return (
    {
      draft: "bg-[#FFF4D8] text-[#8A5B00]",
      sending: "bg-[#EAF2FF] text-[#185ABC]",
      sent: "bg-[#E9F8EF] text-[#137A3F]",
      failed: "bg-[#FDECEC] text-[#B42318]",
      partial: "bg-[#FFF4ED] text-brand-orange"
    } satisfies Record<ChatCampaign["status"], string>
  )[status];
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-brand-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{value}</p>
    </div>
  );
}

function CampaignModal({
  open,
  title,
  form,
  credentials,
  onClose,
  onChange,
  onSave
}: {
  open: boolean;
  title: string;
  form: CampaignForm;
  credentials: ChatEmailCredential[];
  onClose: () => void;
  onChange: (form: CampaignForm) => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientError, setRecipientError] = useState("");

  if (!open) return null;

  function addRecipient() {
    const email = recipientEmail.trim().toLowerCase();
    setRecipientError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecipientError("Email inválido");
      return;
    }
    if (form.recipients.some((recipient) => recipient.email.toLowerCase() === email)) {
      setRecipientError("Ese destinatario ya existe");
      return;
    }
    onChange({
      ...form,
      recipients: [...form.recipients, { email, name: recipientName.trim(), status: "pending" }]
    });
    setRecipientEmail("");
    setRecipientName("");
  }

  async function uploadCsv(file?: File) {
    if (!file) return;
    const csvContent = await file.text();
    const parsed = await chatCampaignService.parseCSV(csvContent);
    const existing = new Set(form.recipients.map((recipient) => recipient.email.toLowerCase()));
    onChange({
      ...form,
      recipients: [...form.recipients, ...parsed.recipients.filter((recipient) => !existing.has(recipient.email.toLowerCase()))]
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-brand-line p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-brand-orange">Campañas</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-ink">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-brand-line p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input className="foodie-input" placeholder="Nombre de campaña" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
            <input className="foodie-input" placeholder="Asunto" value={form.subject} onChange={(event) => onChange({ ...form, subject: event.target.value })} />
            <select className="foodie-input md:col-span-2" value={form.emailCredentialId} onChange={(event) => onChange({ ...form, emailCredentialId: event.target.value })}>
              <option value="">Seleccionar credencial de email</option>
              {credentials.map((credential) => (
                <option key={credential._id} value={credential._id}>
                  {credential.name} ({credential.fromEmail})
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="foodie-input min-h-[180px]"
            placeholder="Contenido. Podés usar {{nombre}} para personalizar."
            value={form.textContent || form.htmlContent}
            onChange={(event) =>
              onChange({
                ...form,
                textContent: event.target.value,
                htmlContent: `<p>${event.target.value.replace(/\n/g, "<br>")}</p>`
              })
            }
          />

          <div className="grid gap-4 rounded-[24px] border border-brand-line bg-[#FFFDF9] p-5 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-brand-ink">
              <input type="checkbox" checked={form.trackOpens} onChange={(event) => onChange({ ...form, trackOpens: event.target.checked })} />
              Trackear aperturas
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-brand-ink">
              <input type="checkbox" checked={form.trackClicks} onChange={(event) => onChange({ ...form, trackClicks: event.target.checked })} />
              Trackear clicks
            </label>
            <input className="foodie-input" placeholder="URL del CTA" value={form.callToActionUrl} onChange={(event) => onChange({ ...form, callToActionUrl: event.target.value })} />
            <input className="foodie-input" placeholder="Texto del CTA" value={form.callToActionLabel} onChange={(event) => onChange({ ...form, callToActionLabel: event.target.value })} />
          </div>

          <div className="rounded-[24px] border border-brand-line bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-brand-ink">Destinatarios</p>
                <p className="text-sm text-neutral-500">{form.recipients.length} cargados</p>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-brand-line px-4 py-2 text-sm font-semibold text-brand-ink">
                <FileUp className="h-4 w-4" />
                Importar CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(event) => uploadCsv(event.target.files?.[0]).catch(() => setRecipientError("No se pudo procesar el CSV"))} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input className="foodie-input" placeholder="email@dominio.com" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} />
              <input className="foodie-input" placeholder="Nombre" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
              <button type="button" onClick={addRecipient} className="rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white">
                Agregar
              </button>
            </div>
            {recipientError ? <p className="mt-3 text-sm text-red-600">{recipientError}</p> : null}

            <div className="mt-4 max-h-44 overflow-y-auto rounded-[20px] border border-brand-line">
              {form.recipients.map((recipient, index) => (
                <div key={`${recipient.email}-${index}`} className="flex items-center justify-between border-b border-brand-line px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{recipient.email}</p>
                    <p className="text-xs text-neutral-500">{recipient.name || "Sin nombre"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ ...form, recipients: form.recipients.filter((_, itemIndex) => itemIndex !== index) })}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!form.recipients.length ? <p className="p-6 text-center text-sm text-neutral-500">No hay destinatarios agregados.</p> : null}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-brand-line p-6">
          <button onClick={onSave} className="flex-1 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white">
            Guardar campaña
          </button>
          <button onClick={onClose} className="rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignDetails({ campaign, onClose }: { campaign: ChatCampaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-brand-orange">Detalle de campaña</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-ink">{campaign.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{campaign.subject}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-brand-line p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Destinatarios" value={campaign.totalRecipients} />
          <StatCard label="Enviados" value={campaign.sentCount} />
          <StatCard label="Aperturas" value={campaign.uniqueOpens ?? campaign.openCount ?? 0} />
          <StatCard label="Clicks" value={campaign.uniqueClicks ?? campaign.clickCount ?? 0} />
        </div>

        <div className="mt-6 rounded-[24px] border border-brand-line bg-[#FFFDF9] p-5">
          <p className="font-semibold text-brand-ink">Contenido</p>
          <div className="mt-4 max-h-80 overflow-y-auto rounded-[18px] bg-white p-4 text-sm text-neutral-700" dangerouslySetInnerHTML={{ __html: campaign.htmlContent || campaign.textContent || "" }} />
        </div>
      </div>
    </div>
  );
}

export function ChatCampaignsModule() {
  const [campaigns, setCampaigns] = useState<ChatCampaign[]>([]);
  const [stats, setStats] = useState<ChatCampaignStats>(emptyStats);
  const [credentials, setCredentials] = useState<ChatEmailCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ChatCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<ChatCampaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [confirmSendId, setConfirmSendId] = useState("");

  async function loadData() {
    setLoading(true);
    setFeedback("");
    try {
      const [campaignData, statsData, credentialData] = await Promise.all([
        chatCampaignService.getCampaigns({ limit: 50 }),
        chatCampaignService.getStats(),
        chatCampaignService.getEmailCredentials().catch(() => ({ credentials: [] }))
      ]);
      setCampaigns(campaignData.campaigns || []);
      setStats(statsData.stats || emptyStats);
      setCredentials(credentialData.credentials || []);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar campañas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate() {
    setEditingCampaign(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function openEdit(campaign: ChatCampaign) {
    const detail = await chatCampaignService.getCampaignById(campaign._id);
    const item = detail.campaign;
    setEditingCampaign(item);
    setForm({
      name: item.name,
      subject: item.subject,
      htmlContent: item.htmlContent,
      textContent: item.textContent || "",
      emailCredentialId: getCredentialId(item),
      trackOpens: item.trackOpens !== false,
      trackClicks: item.trackClicks !== false,
      callToActionUrl: item.callToActionUrl || "",
      callToActionLabel: item.callToActionLabel || "",
      recipients: item.recipients || []
    });
    setModalOpen(true);
  }

  async function openDetails(campaign: ChatCampaign) {
    const detail = await chatCampaignService.getCampaignById(campaign._id);
    setSelectedCampaign(detail.campaign);
  }

  async function saveCampaign() {
    if (!form.name.trim() || !form.subject.trim() || !form.htmlContent.trim() || !form.emailCredentialId) {
      setFeedback("Completá nombre, asunto, contenido y credencial de email");
      return;
    }

    try {
      const payload: ChatCampaignInput = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        htmlContent: form.htmlContent,
        textContent: form.textContent,
        emailCredentialId: form.emailCredentialId,
        trackOpens: form.trackOpens,
        trackClicks: form.trackClicks,
        callToActionUrl: form.callToActionUrl,
        callToActionLabel: form.callToActionLabel
      };

      if (editingCampaign) {
        await chatCampaignService.updateCampaign(editingCampaign._id, payload);
        setFeedback("Campaña actualizada");
      } else {
        const created = await chatCampaignService.createCampaign(payload);
        if (form.recipients.length) {
          await chatCampaignService.addRecipients(created.campaign._id, form.recipients);
        }
        setFeedback("Campaña creada");
      }

      setModalOpen(false);
      setEditingCampaign(null);
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la campaña");
    }
  }

  async function sendCampaign(id: string) {
    try {
      await chatCampaignService.sendCampaign(id);
      setConfirmSendId("");
      setFeedback("Campaña en proceso de envío");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo enviar la campaña");
    }
  }

  async function deleteCampaign(id: string) {
    try {
      await chatCampaignService.deleteCampaign(id);
      setConfirmDeleteId("");
      setFeedback("Campaña eliminada");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar la campaña");
    }
  }

  if (loading) {
    return <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">Cargando campañas...</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Campañas" value={stats.totalCampaigns ?? campaigns.length} />
          <StatCard label="Enviadas" value={stats.totalSent ?? 0} />
          <StatCard label="Fallidas" value={stats.totalFailed ?? 0} />
          <StatCard label="Destinatarios" value={stats.totalRecipients ?? 0} />
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      {feedback ? <div className="rounded-[20px] border border-brand-line bg-[#FFF7F2] px-5 py-3 text-sm text-brand-ink">{feedback}</div> : null}

      <div className="overflow-hidden rounded-[28px] border border-brand-line bg-white">
        <div className="border-b border-brand-line px-5 py-4">
          <p className="font-semibold text-brand-ink">Campañas</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
              <tr>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Asunto</th>
                <th className="px-5 py-4">Destinatarios</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Envío</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {campaigns.map((campaign) => (
                <tr key={campaign._id}>
                  <td className="px-5 py-4 font-semibold text-brand-ink">{campaign.name}</td>
                  <td className="max-w-xs truncate px-5 py-4 text-neutral-600">{campaign.subject}</td>
                  <td className="px-5 py-4 text-neutral-600">{campaign.totalRecipients}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(campaign.status)}`}>{statusLabel(campaign.status)}</span>
                  </td>
                  <td className="px-5 py-4 text-neutral-600">
                    {campaign.sentCount} / {campaign.totalRecipients}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openDetails(campaign)} className="rounded-full border border-brand-line p-2 text-brand-ink">
                        <Eye className="h-4 w-4" />
                      </button>
                      {campaign.status === "draft" ? (
                        <>
                          <button onClick={() => openEdit(campaign)} className="rounded-full border border-brand-line px-3 py-2 text-xs font-semibold text-brand-ink">
                            Editar
                          </button>
                          <button onClick={() => setConfirmSendId(campaign._id)} className="rounded-full border border-green-200 p-2 text-green-700">
                            <Send className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                      <button onClick={() => setConfirmDeleteId(campaign._id)} className="rounded-full border border-red-200 p-2 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!campaigns.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-500">
                    No hay campañas creadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <CampaignModal
        open={modalOpen}
        title={editingCampaign ? "Editar campaña" : "Nueva campaña"}
        form={form}
        credentials={credentials}
        onClose={() => setModalOpen(false)}
        onChange={setForm}
        onSave={saveCampaign}
      />

      {selectedCampaign ? <CampaignDetails campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} /> : null}

      {confirmDeleteId || confirmSendId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <p className="text-xl font-semibold text-brand-ink">{confirmDeleteId ? "Eliminar campaña" : "Enviar campaña"}</p>
            <p className="mt-3 text-sm text-neutral-500">
              {confirmDeleteId ? "Esta acción no se puede deshacer." : "La campaña empezará el proceso de envío."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => (confirmDeleteId ? deleteCampaign(confirmDeleteId) : sendCampaign(confirmSendId))}
                className={`flex-1 rounded-full px-5 py-3 text-sm font-semibold text-white ${confirmDeleteId ? "bg-red-600" : "bg-brand-orange"}`}
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setConfirmDeleteId("");
                  setConfirmSendId("");
                }}
                className="flex-1 rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
