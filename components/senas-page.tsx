"use client";

import { useEffect, useState } from "react";
import { AppModal } from "./app-modal";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";
import type { ReservationDeposit } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
const labels = { pending: "Pendiente", partial: "Parcial", complete: "Completa" };
const money = (value: number | string, currency = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));

export function SenasPage() {
  const { token, selectedBranchId, currentUser } = useWorkspace();
  const [items, setItems] = useState<ReservationDeposit[]>([]);
  const [status, setStatus] = useState<"" | "pending" | "partial" | "complete">("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ReservationDeposit | null>(null);
  const [form, setForm] = useState({ type: "payment", amount: "", paidAt: new Date().toISOString().slice(0, 10), paymentMethod: "transferencia", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [proofAction, setProofAction] = useState<{ id: string; name: string; mode: "approve" | "reject" } | null>(null);
  const [proofForm, setProofForm] = useState({ amount: "", paidAt: new Date().toISOString().slice(0, 10), paymentMethod: "transferencia", reference: "", notes: "", reason: "" });
  const financial = currentUser?.scope === "restaurant" && ["restaurant_owner", "restaurant_manager", "cashier"].includes(currentUser.role);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!response.ok) throw new Error(await response.text() || "No se pudo completar la operación");
    return response.json();
  }
  async function load() {
    if (!token || !financial) return;
    try { setError(""); setItems(await request<ReservationDeposit[]>(`/restaurant/deposits?branchId=${encodeURIComponent(selectedBranchId)}${status ? `&status=${status}` : ""}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar las señas"); }
  }
  useEffect(() => { void load(); }, [token, selectedBranchId, status, financial]);
  async function saveEntry() {
    if (!selected || !form.amount) return;
    try {
      setBusy(true);
      await request(`/restaurant/deposits/${selected.id}/entries`, { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount), paidAt: `${form.paidAt}T12:00:00.000Z` }) });
      setSelected(null); setForm((current) => ({ ...current, amount: "", reference: "", notes: "" })); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento"); } finally { setBusy(false); }
  }
  async function openProofRequest() {
    if (!selected) return;
    try { await request(`/restaurant/deposits/${selected.id}/proof-requests`, { method: "POST", body: JSON.stringify({ expiresHours: 48 }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir la solicitud"); }
  }
  async function openProof(proofId: string) {
    try { const result = await request<{ url: string }>(`/restaurant/deposits/proofs/${proofId}/download`); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el comprobante"); }
  }
  async function reviewProof() {
    if (!proofAction) return;
    try {
      setBusy(true);
      if (proofAction.mode === "approve") {
        if (!proofForm.amount) throw new Error("Ingresá el importe recibido.");
        await request(`/restaurant/deposits/proofs/${proofAction.id}/approve`, { method: "POST", body: JSON.stringify({ amount: Number(proofForm.amount), paidAt: `${proofForm.paidAt}T12:00:00.000Z`, paymentMethod: proofForm.paymentMethod, reference: proofForm.reference, notes: proofForm.notes }) });
      } else {
        if (proofForm.reason.trim().length < 2) throw new Error("Indicá el motivo del rechazo.");
        await request(`/restaurant/deposits/proofs/${proofAction.id}/reject`, { method: "POST", body: JSON.stringify({ reason: proofForm.reason }) });
      }
      setProofAction(null); setSelected(null); setProofForm({ amount: "", paidAt: new Date().toISOString().slice(0, 10), paymentMethod: "transferencia", reference: "", notes: "", reason: "" }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo revisar el comprobante"); } finally { setBusy(false); }
  }
  if (!financial) return <WorkspaceShell title="Señas" description="Acceso restringido a roles financieros."><p className="rounded-2xl bg-white p-6 text-sm text-neutral-600">No tenés permisos para consultar información financiera.</p></WorkspaceShell>;
  return <WorkspaceShell title="Señas" description="Controlá pagos, comprobantes recibidos y saldos pendientes por reserva.">
    <section className="rounded-[26px] border border-brand-line bg-white p-5 md:p-6">
      <div className="mb-5 flex flex-wrap gap-2"><button onClick={() => setStatus("")} className={`rounded-full px-4 py-2 text-sm ${!status ? "bg-brand-orange text-white" : "border border-brand-line"}`}>Todas</button>{(["pending", "partial", "complete"] as const).map((value) => <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm ${status === value ? "bg-brand-orange text-white" : "border border-brand-line"}`}>{labels[value]}</button>)}</div>
      {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="divide-y divide-brand-line">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-brand-ink">{item.reservation.fullName} <span className="text-sm font-normal text-neutral-500">· {item.reservation.code}</span></p><p className="mt-1 text-sm text-neutral-500">{item.reservation.phone} · {item.reservation.serviceTime}</p><p className="mt-2 text-sm text-neutral-700">{money(item.paidAmount, item.currency)} de {money(item.requiredAmount, item.currency)}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "complete" ? "bg-emerald-100 text-emerald-800" : item.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>{labels[item.status]}</span><button onClick={() => setSelected(item)} className="rounded-full border border-brand-orange px-4 py-2 text-sm font-medium text-brand-orange">Gestionar</button></div></div>)}{!items.length ? <p className="py-10 text-center text-sm text-neutral-500">No hay señas para este filtro.</p> : null}</div>
    </section>
    <AppModal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Seña · ${selected.reservation.fullName}` : "Seña"} description="Los movimientos se registran en Foodie; recibir un comprobante no confirma el pago." footer={<><button onClick={openProofRequest} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm">Esperar comprobante</button><button disabled={busy || !form.amount} onClick={() => void saveEntry()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm text-white">{busy ? "Guardando..." : "Registrar"}</button></>}>
      <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Tipo<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-xl border p-3"><option value="payment">Pago</option><option value="refund">Devolución</option><option value="adjustment">Ajuste</option></select></label><label className="text-sm">Importe<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm">Fecha<input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm">Medio<input value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm md:col-span-2">Referencia<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label></div>
      {selected?.proofRequests.flatMap((request) => request.proofs).length ? <div className="mt-5 space-y-2"><p className="text-sm font-bold text-brand-ink">Comprobantes recibidos</p>{selected.proofRequests.flatMap((request) => request.proofs).map((proof) => <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line p-3"><div><p className="text-sm font-medium text-brand-ink">{proof.originalName}</p><p className="text-xs text-neutral-500">{proof.reviewStatus === "approved" ? "Aprobado" : proof.reviewStatus === "rejected" ? `Rechazado: ${proof.rejectionReason || ""}` : "Pendiente de revisión"}</p></div><div className="flex gap-2"><button onClick={() => void openProof(proof.id)} className="rounded-full border border-brand-line px-3 py-2 text-xs font-bold">Ver</button>{proof.reviewStatus !== "approved" && proof.reviewStatus !== "rejected" ? <><button onClick={() => { setProofAction({ id: proof.id, name: proof.originalName, mode: "reject" }); setProofForm((value) => ({ ...value, reason: "" })); }} className="rounded-full border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Rechazar</button><button onClick={() => { setProofAction({ id: proof.id, name: proof.originalName, mode: "approve" }); setProofForm((value) => ({ ...value, amount: "" })); }} className="rounded-full bg-brand-orange px-3 py-2 text-xs font-bold text-white">Aprobar</button></> : null}</div></div>)}</div> : null}
    </AppModal>
    <AppModal open={Boolean(proofAction)} onClose={() => setProofAction(null)} title={proofAction?.mode === "approve" ? "Aprobar comprobante" : "Rechazar comprobante"} description={proofAction?.name} footer={<><button onClick={() => setProofAction(null)} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm">Cancelar</button><button disabled={busy} onClick={() => void reviewProof()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-bold text-white">{proofAction?.mode === "approve" ? "Aprobar y registrar" : "Rechazar"}</button></>}>{proofAction?.mode === "approve" ? <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Importe<input type="number" min="0.01" step="0.01" value={proofForm.amount} onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm">Fecha<input type="date" value={proofForm.paidAt} onChange={(e) => setProofForm({ ...proofForm, paidAt: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm md:col-span-2">Medio de pago<input value={proofForm.paymentMethod} onChange={(e) => setProofForm({ ...proofForm, paymentMethod: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label className="text-sm md:col-span-2">Referencia<input value={proofForm.reference} onChange={(e) => setProofForm({ ...proofForm, reference: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label></div> : <label className="block text-sm">Motivo del rechazo<textarea value={proofForm.reason} onChange={(e) => setProofForm({ ...proofForm, reason: e.target.value })} className="mt-2 h-28 w-full rounded-xl border p-3" /></label>}</AppModal>
  </WorkspaceShell>;
}
