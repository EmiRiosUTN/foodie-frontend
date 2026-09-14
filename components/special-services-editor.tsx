"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export type SpecialService = { id?: string; label: string; startTime: string; endTime: string; serviceDate?: string };
type Branch = { id: string; name: string };
type Props = {
  branches: Branch[];
  branchId: string;
  serviceDate: string;
  rows: SpecialService[];
  allRows?: SpecialService[];
  dirty: boolean;
  loading: boolean;
  onBranchChange: (branchId: string) => void;
  onDateChange: (serviceDate: string) => void;
  onRowsChange: (rows: SpecialService[]) => void;
};

function ServiceField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</span>{children}</label>;
}

export function SpecialServicesEditor({ branches, branchId, serviceDate, rows, allRows: initialRows = [], dirty, loading, onBranchChange, onDateChange, onRowsChange }: Props) {
  const [visibleRows, setVisibleRows] = useState<SpecialService[]>(initialRows);
  const allRows = visibleRows.length ? visibleRows : initialRows;
  useEffect(() => { if (serviceDate || !branchId) return; const token = window.localStorage.getItem("foodie_token"); if (!token) return; fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1"}/restaurant/online-booking/special-services?${new URLSearchParams({ branchId })}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() as Promise<SpecialService[]> : []).then(setVisibleRows).catch(() => setVisibleRows([])); }, [branchId, serviceDate]);
  useEffect(() => { if (initialRows.length) setVisibleRows(initialRows); }, [initialRows]);
  const updateRow = (index: number, patch: Partial<SpecialService>) => onRowsChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const addService = () => onRowsChange([...rows, { label: `Servicio ${rows.length + 1}`, startTime: rows.length ? "15:30" : "12:00", endTime: rows.length ? "18:00" : "14:30" }]);

  return <section className="rounded-[26px] border border-brand-orange/40 bg-[#FFF9F5] p-5 shadow-[0_10px_30px_rgba(181,82,33,0.05)]">
    <div className="max-w-3xl"><h2 className="font-extrabold text-brand-ink">Servicios especiales por fecha</h2><p className="mt-1 text-sm leading-6 text-neutral-600">Armá dos o más servicios para una fecha puntual. Cada reserva ocupa la mesa durante toda la franja.</p></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><ServiceField label="Sede"><select value={branchId} onChange={(event) => onBranchChange(event.target.value)} className="foodie-input">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></ServiceField><ServiceField label="Fecha"><input type="date" value={serviceDate} onChange={(event) => onDateChange(event.target.value)} className="foodie-input" /></ServiceField></div>
    {!serviceDate && !loading ? <div className="mt-5 space-y-3">{!allRows.length ? <p className="rounded-2xl border border-dashed border-[#E8CDBB] bg-white/70 px-4 py-5 text-sm text-neutral-600">Todavía no configuraste servicios especiales.</p> : Object.entries(allRows.reduce<Record<string, SpecialService[]>>((groups, row) => { const date = row.serviceDate ? new Date(row.serviceDate).toLocaleDateString("es-AR") : "Fecha"; (groups[date] ||= []).push(row); return groups; }, {})).map(([date, group]) => <div key={date} className="rounded-2xl border border-[#ECDDD2] bg-white p-4"><div className="flex items-center justify-between"><p className="font-bold text-brand-ink">{date}</p><button type="button" onClick={() => onDateChange(group[0]?.serviceDate?.slice(0, 10) || "")} className="rounded-full border border-brand-orange px-3 py-1 text-xs font-bold text-brand-orange">Editar fecha</button></div><div className="mt-2 flex flex-wrap gap-2">{group.map(row => <span key={row.id} className="rounded-full bg-[#FFF1E8] px-3 py-1 text-sm">{row.label} · {row.startTime}-{row.endTime}</span>)}</div></div>)}</div> : null}
    {serviceDate ? <div className="mt-5 space-y-4">
      {loading ? <p className="text-sm text-neutral-600">Cargando servicios…</p> : null}
      {!loading && !rows.length ? <div className="rounded-2xl border border-dashed border-[#E8CDBB] bg-white/70 px-4 py-5 text-sm text-neutral-600">Todavía no configuraste servicios para esta fecha. Agregá al menos dos.</div> : null}
      {rows.map((row, index) => <div key={row.id || index} className="rounded-2xl border border-[#ECDDD2] bg-white p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-brand-ink">Servicio {index + 1}</p><button type="button" onClick={() => onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Quitar</button></div><div className="grid gap-3 sm:grid-cols-3"><ServiceField label="Nombre"><input value={row.label} onChange={(event) => updateRow(index, { label: event.target.value })} className="foodie-input py-2.5" /></ServiceField><ServiceField label="Desde"><input type="time" value={row.startTime} onChange={(event) => updateRow(index, { startTime: event.target.value })} className="foodie-input py-2.5" /></ServiceField><ServiceField label="Hasta"><input type="time" value={row.endTime} onChange={(event) => updateRow(index, { endTime: event.target.value })} className="foodie-input py-2.5" /></ServiceField></div></div>)}
      <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={loading} onClick={addService} className="inline-flex items-center gap-2 rounded-full border border-brand-orange px-4 py-2.5 text-sm font-bold text-brand-orange hover:bg-white disabled:opacity-60"><Plus className="h-4 w-4" />Agregar servicio</button>{rows.length === 1 ? <span className="text-xs text-neutral-500">Falta un servicio más para poder guardar.</span> : null}{dirty ? <span className="text-xs font-semibold text-brand-orange">Cambios pendientes: se guardan con “Guardar cambios”.</span> : null}</div>
    </div> : null}
  </section>;
}
