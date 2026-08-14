"use client";

import { Copy, ExternalLink, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const services = [
  { key: "lunch", label: "Almuerzo", startTime: "12:00", endTime: "15:00" },
  { key: "dinner", label: "Cena", startTime: "20:00", endTime: "23:00" }
] as const;

type BookingWindow = { branchId: string; weekday: number; service: "lunch" | "dinner"; isEnabled: boolean; startTime: string; endTime: string; intervalMin: number };
type Exception = { branchId: string; serviceDate: string; isClosed: boolean; startTime?: string | null; endTime?: string | null; intervalMin?: number | null };
type Settings = { isEnabled: boolean; coverImageUrl?: string | null; accentColor: string; minAdvanceMinutes: number; maxAdvanceDays: number; minPartySize: number; maxPartySize: number; largePartyThreshold?: number | null; agencyPartyThreshold?: number | null; remindersEnabled?: boolean; reminderPartySizeFrom?: number | null; reminderHoursBefore?: number | null };
type Config = { restaurant: { slug: string; branches: Array<{ id: string; name: string; onlineBookingDurationMinutes: number }> }; settings: Settings; bookingWindows: BookingWindow[]; exceptions: Exception[] };

export function OnlineBookingsPage({ mode = "public" }: { mode?: "rules" | "public" }) {
  const { token, currentUser } = useWorkspace();
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/restaurant/online-booking`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la configuración");
        return response.json() as Promise<Config>;
      })
      .then((data) => {
        const legacySchedules = (data as Config & { schedules?: Array<Omit<BookingWindow, "service">> }).schedules;
        const incomingWindows = Array.isArray(data.bookingWindows) ? data.bookingWindows : Array.isArray(legacySchedules) ? legacySchedules.map((schedule) => ({ ...schedule, service: schedule.startTime < "17:00" ? "lunch" as const : "dinner" as const })) : [];
        const known = new Set(incomingWindows.map((item) => `${item.branchId}:${item.weekday}:${item.service}`));
        const defaults = data.restaurant.branches.flatMap((branch) => days.flatMap((_, weekday) => services.map((service) => ({ branchId: branch.id, weekday, service: service.key, isEnabled: false, startTime: service.startTime, endTime: service.endTime, intervalMin: 30 })).filter((item) => !known.has(`${item.branchId}:${item.weekday}:${item.service}`))));
        setConfig({ ...data, bookingWindows: [...incomingWindows, ...defaults] });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo cargar"));
  }, [token]);

  const updateSettings = (key: keyof Settings, value: string | boolean | number | null) => setConfig((current) => current ? { ...current, settings: { ...current.settings, [key]: value } } : current);
  const updateWindow = (branchId: string, weekday: number, service: BookingWindow["service"], key: keyof BookingWindow, value: string | boolean | number) => setConfig((current) => current ? { ...current, bookingWindows: current.bookingWindows.map((item) => item.branchId === branchId && item.weekday === weekday && item.service === service ? { ...item, [key]: value } : item) } : current);
  const updateDuration = (branchId: string, duration: number) => setConfig((current) => current ? { ...current, restaurant: { ...current.restaurant, branches: current.restaurant.branches.map((branch) => branch.id === branchId ? { ...branch, onlineBookingDurationMinutes: duration } : branch) } } : current);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/restaurant/online-booking`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...config.settings, branchDurations: config.restaurant.branches.map((branch) => ({ branchId: branch.id, durationMinutes: branch.onlineBookingDurationMinutes })), bookingWindows: config.bookingWindows, exceptions: config.exceptions })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message || "No se pudo guardar");
      }
      setConfig(await response.json() as Config);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "rules" ? "Reservas" : "Reservas online";
  const description = mode === "rules" ? "Horarios y reglas compartidos por panel, web y WhatsApp." : "Publicación y apariencia de la página de reservas.";
  const publicUrl = useMemo(() => config ? `${window.location.origin}/reservar/${config.restaurant.slug}` : "", [config]);
  if (currentUser?.role !== "restaurant_owner") return <WorkspaceShell title={title} description={description}><p>No tenés permiso para editar esta configuración.</p></WorkspaceShell>;
  if (!config) return <WorkspaceShell title={title} description={description}><p>{error || "Cargando configuración..."}</p></WorkspaceShell>;

  return <WorkspaceShell title={title} description={description}><div className="space-y-6">
    {mode === "public" ? <PublicSettings config={config} publicUrl={publicUrl} update={updateSettings} /> : <><RulesSettings settings={config.settings} update={updateSettings} /><Schedules branches={config.restaurant.branches} bookingWindows={config.bookingWindows} updateWindow={updateWindow} updateDuration={updateDuration} /></>}
    <div className="flex justify-end"><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 font-bold text-white"><Save className="h-4 w-4" />{saving ? "Guardando..." : "Guardar cambios"}</button></div>
    {error ? <p className="text-sm text-red-600">{error}</p> : null}
  </div></WorkspaceShell>;
}

function PublicSettings({ config, publicUrl, update }: { config: Config; publicUrl: string; update: (key: keyof Settings, value: string | boolean | number | null) => void }) {
  return <section className="rounded-[26px] border border-brand-line bg-white p-5 md:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-extrabold text-brand-ink">Habilitar reservas online</h2><p className="mt-1 text-sm text-neutral-500">Los horarios se administran en Configuración → Reservas.</p></div><Toggle value={config.settings.isEnabled} onChange={(value) => update("isEnabled", value)} /></div><div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]"><Field label="Link público"><input readOnly value={publicUrl} className="foodie-input" /></Field><div className="flex gap-2 self-end"><button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="rounded-full border border-brand-line p-3"><Copy className="h-4 w-4" /></button><a href={publicUrl} target="_blank" className="rounded-full bg-brand-orange p-3 text-white"><ExternalLink className="h-4 w-4" /></a></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Portada (URL)"><input value={config.settings.coverImageUrl || ""} onChange={(event) => update("coverImageUrl", event.target.value || null)} className="foodie-input" /></Field><Field label="Color principal"><input type="color" value={config.settings.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="h-12 w-full rounded-[18px] border border-brand-line p-1" /></Field><Field label="Mínimo de personas online"><input type="number" min="1" value={config.settings.minPartySize} onChange={(event) => update("minPartySize", Number(event.target.value))} className="foodie-input" /></Field><Field label="Máximo de personas online"><input type="number" min="1" value={config.settings.maxPartySize} onChange={(event) => update("maxPartySize", Number(event.target.value))} className="foodie-input" /></Field></div></section>;
}

function RulesSettings({ settings, update }: { settings: Settings; update: (key: keyof Settings, value: string | boolean | number | null) => void }) {
  return <section className="rounded-[26px] border border-brand-line bg-white p-5 md:p-7"><h2 className="font-extrabold text-brand-ink">Reglas generales</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Anticipación mínima (minutos)"><input type="number" min="0" value={settings.minAdvanceMinutes} onChange={(event) => update("minAdvanceMinutes", Number(event.target.value))} className="foodie-input" /></Field><Field label="Anticipación máxima (días)"><input type="number" min="1" value={settings.maxAdvanceDays} onChange={(event) => update("maxAdvanceDays", Number(event.target.value))} className="foodie-input" /></Field><Field label="Grupo grande desde"><input type="number" min="1" value={settings.largePartyThreshold || ""} placeholder="Sin límite" onChange={(event) => update("largePartyThreshold", event.target.value ? Number(event.target.value) : null)} className="foodie-input" /></Field><Field label="Consultar si es agencia desde"><input type="number" min="1" value={settings.agencyPartyThreshold || ""} placeholder="Sin regla" onChange={(event) => update("agencyPartyThreshold", event.target.value ? Number(event.target.value) : null)} className="foodie-input" /></Field></div><div className="mt-5 rounded-2xl border border-brand-line p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-bold text-brand-ink">Recordatorios por WhatsApp</h3><p className="text-sm text-neutral-500">Configurá cuándo enviar recordatorios a tus clientes.</p></div><Toggle value={settings.remindersEnabled || false} onChange={(value) => update("remindersEnabled", value)} /></div>{settings.remindersEnabled ? <div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Desde cuántas personas"><input type="number" min="1" value={settings.reminderPartySizeFrom || ""} onChange={(event) => update("reminderPartySizeFrom", event.target.value ? Number(event.target.value) : null)} className="foodie-input" /></Field><Field label="Horas antes de la reserva"><input type="number" min="1" value={settings.reminderHoursBefore || ""} onChange={(event) => update("reminderHoursBefore", event.target.value ? Number(event.target.value) : null)} className="foodie-input" /></Field></div> : null}</div></section>;
}

function Schedules({ branches, bookingWindows, updateWindow, updateDuration }: { branches: Config["restaurant"]["branches"]; bookingWindows: BookingWindow[]; updateWindow: (branchId: string, weekday: number, service: BookingWindow["service"], key: keyof BookingWindow, value: string | boolean | number) => void; updateDuration: (branchId: string, duration: number) => void }) {
  return <section className="rounded-[26px] border border-brand-line bg-white p-5 md:p-7"><h2 className="font-extrabold text-brand-ink">Horarios por sede</h2><p className="mt-1 text-sm text-neutral-500">Configurá Almuerzo y Cena por separado. Esta es la fuente para reservas, web pública y WhatsApp.</p>{branches.map((branch) => <div key={branch.id} className="mt-6 overflow-x-auto"><div className="mb-3 flex items-center justify-between"><b>{branch.name}</b><label className="text-sm font-bold">Duración <input type="number" min="15" value={branch.onlineBookingDurationMinutes} onChange={(event) => updateDuration(branch.id, Number(event.target.value))} className="foodie-input ml-2 inline w-24 py-2" /> min</label></div><div className="min-w-[760px] divide-y divide-brand-line border-y border-brand-line">{days.map((day, weekday) => <div key={day} className="py-3"><b className="mb-2 block text-sm">{day}</b>{services.map((service) => { const row = bookingWindows.find((item) => item.branchId === branch.id && item.weekday === weekday && item.service === service.key)!; return <div key={`${day}-${service.key}`} className="grid grid-cols-[120px_70px_1fr_1fr_100px] items-center gap-3 py-2 text-sm"><span className="font-semibold text-neutral-600">{service.label}</span><input type="checkbox" aria-label={`${service.label} ${day}`} checked={row.isEnabled} onChange={(event) => updateWindow(branch.id, weekday, service.key, "isEnabled", event.target.checked)} /><input type="time" value={row.startTime} onChange={(event) => updateWindow(branch.id, weekday, service.key, "startTime", event.target.value)} className="foodie-input py-2" /><input type="time" value={row.endTime} onChange={(event) => updateWindow(branch.id, weekday, service.key, "endTime", event.target.value)} className="foodie-input py-2" /><input type="number" value={row.intervalMin} min="5" onChange={(event) => updateWindow(branch.id, weekday, service.key, "intervalMin", Number(event.target.value))} className="foodie-input py-2" /></div>; })}</div>)}</div></div>)}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-semibold text-brand-ink"><span>{label}</span>{children}</label>; }
function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!value)} className={`rounded-full px-5 py-3 text-sm font-bold ${value ? "bg-brand-orange text-white" : "bg-neutral-200 text-neutral-600"}`}>{value ? "Habilitadas" : "Deshabilitadas"}</button>; }
