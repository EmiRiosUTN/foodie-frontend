"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

type Branch = { id: string; name: string };
type SpecialService = {
  id?: string;
  label: string;
  startTime: string;
  endTime: string;
  intervalMin: number;
  durationMinutes: number;
  turnoverMinutes: number;
};

type Props = { token: string; branches: Branch[] };

function ServiceField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</span>{children}</label>;
}

export function SpecialServicesEditor({ token, branches }: Props) {
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [serviceDate, setServiceDate] = useState("");
  const [rows, setRows] = useState<SpecialService[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId || !serviceDate) {
      setRows([]);
      return;
    }
    let active = true;
    setMessage("");
    fetch(`${API_URL}/restaurant/online-booking/special-services?${new URLSearchParams({ branchId, serviceDate })}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los servicios.");
        return response.json() as Promise<SpecialService[]>;
      })
      .then((services) => { if (active) setRows(services); })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "No se pudieron cargar los servicios."); });
    return () => { active = false; };
  }, [branchId, serviceDate, token]);

  const updateRow = (index: number, patch: Partial<SpecialService>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const addService = () => setRows((current) => [...current, {
    label: `Servicio ${current.length + 1}`,
    startTime: current.length ? "15:30" : "12:00",
    endTime: current.length ? "18:00" : "14:30",
    intervalMin: 15,
    durationMinutes: 90,
    turnoverMinutes: 30
  }]);

  async function save() {
    if (!serviceDate || rows.length < 2) {
      setMessage("Configurá al menos dos servicios para esta fecha.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/restaurant/online-booking/special-services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ branchId, serviceDate, services: rows })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "No se pudieron guardar los servicios.");
      setRows(await response.json());
      setMessage("Servicios especiales guardados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron guardar los servicios.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="rounded-[26px] border border-brand-orange/40 bg-[#FFF9F5] p-5 shadow-[0_10px_30px_rgba(181,82,33,0.05)]">
    <div className="max-w-3xl">
      <h2 className="font-extrabold text-brand-ink">Servicios especiales por fecha</h2>
      <p className="mt-1 text-sm leading-6 text-neutral-600">Armá dos o más servicios para una fecha puntual. La duración y el recambio se reservan antes del siguiente servicio.</p>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <ServiceField label="Sede"><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="foodie-input">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></ServiceField>
      <ServiceField label="Fecha"><input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} className="foodie-input" /></ServiceField>
    </div>

    {serviceDate ? <div className="mt-5 space-y-4">
      {!rows.length ? <div className="rounded-2xl border border-dashed border-[#E8CDBB] bg-white/70 px-4 py-5 text-sm text-neutral-600">Todavía no configuraste servicios para esta fecha. Agregá al menos dos.</div> : null}
      {rows.map((row, index) => <div key={row.id || index} className="rounded-2xl border border-[#ECDDD2] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-brand-ink">Servicio {index + 1}</p>
          <button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Quitar</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.6fr)_repeat(5,minmax(88px,1fr))]">
          <ServiceField label="Nombre"><input value={row.label} onChange={(event) => updateRow(index, { label: event.target.value })} className="foodie-input py-2.5" /></ServiceField>
          <ServiceField label="Desde"><input type="time" value={row.startTime} onChange={(event) => updateRow(index, { startTime: event.target.value })} className="foodie-input py-2.5" /></ServiceField>
          <ServiceField label="Hasta"><input type="time" value={row.endTime} onChange={(event) => updateRow(index, { endTime: event.target.value })} className="foodie-input py-2.5" /></ServiceField>
          <ServiceField label="Intervalo (min)"><input type="number" min="5" value={row.intervalMin} onChange={(event) => updateRow(index, { intervalMin: Number(event.target.value) })} className="foodie-input py-2.5" /></ServiceField>
          <ServiceField label="Duración (min)"><input type="number" min="15" value={row.durationMinutes} onChange={(event) => updateRow(index, { durationMinutes: Number(event.target.value) })} className="foodie-input py-2.5" /></ServiceField>
          <ServiceField label="Recambio (min)"><input type="number" min="0" value={row.turnoverMinutes} onChange={(event) => updateRow(index, { turnoverMinutes: Number(event.target.value) })} className="foodie-input py-2.5" /></ServiceField>
        </div>
      </div>)}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addService} className="inline-flex items-center gap-2 rounded-full border border-brand-orange px-4 py-2.5 text-sm font-bold text-brand-orange hover:bg-white"><Plus className="h-4 w-4" />Agregar servicio</button>
        <button type="button" disabled={saving || rows.length < 2} onClick={() => void save()} className="rounded-full bg-brand-orange px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : "Guardar servicios"}</button>
        {rows.length === 1 ? <span className="text-xs text-neutral-500">Falta un servicio más para poder guardar.</span> : null}
      </div>
      {message ? <p className="rounded-xl bg-white/70 px-3 py-2 text-sm text-neutral-700">{message}</p> : null}
    </div> : null}
  </section>;
}
