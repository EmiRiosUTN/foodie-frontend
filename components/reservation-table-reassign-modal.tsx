"use client";

import { useEffect, useMemo, useState } from "react";
import type { Reservation, ReservationTableAvailability } from "../lib/types";
import { AppModal } from "./app-modal";
import { useWorkspace } from "./workspace-provider";

type ReservationTableReassignModalProps = { reservation: Reservation | null; onClose: () => void };

export function ReservationTableReassignModal({ reservation, onClose }: ReservationTableReassignModalProps) {
  const { bootstrap, loadReservationTableAvailability, reassignReservationTables } = useWorkspace();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [availabilityByRoom, setAvailabilityByRoom] = useState<Record<string, ReservationTableAvailability>>({});
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rooms = useMemo(() => {
    const branch = bootstrap?.branches.find((item) => item.id === reservation?.branch?.id || item.rooms.some((room) => room.id === reservation?.room.id));
    return branch?.rooms || [];
  }, [bootstrap, reservation?.branch?.id, reservation?.room.id]);
  const availability = availabilityByRoom[selectedRoomId];
  const selectedTables = availability?.tables.filter((table) => selectedTableIds.includes(table.id)) || [];
  const selectedCapacity = selectedTables.reduce((total, table) => total + table.seats, 0);
  const hasEnoughCapacity = Boolean(reservation && selectedCapacity >= reservation.partySize);

  useEffect(() => {
    if (!reservation || !rooms.length) return;
    let active = true;
    setSelectedRoomId(reservation.room.id);
    setSelectedTableIds([]);
    setAvailabilityByRoom({});
    setError("");
    setLoading(true);
    Promise.all(rooms.map(async (room) => [room.id, await loadReservationTableAvailability(reservation.id, room.id)] as const))
      .then((responses) => { if (active) setAvailabilityByRoom(Object.fromEntries(responses)); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las mesas del salon."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reservation?.id, rooms, loadReservationTableAvailability]);

  async function save() {
    if (!reservation || !availability?.isBookable || !hasEnoughCapacity) return;
    setSaving(true);
    setError("");
    try {
      await reassignReservationTables(reservation.id, { roomId: selectedRoomId, tableIds: selectedTableIds });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron reasignar las mesas.");
    } finally {
      setSaving(false);
    }
  }

  return <AppModal open={Boolean(reservation)} onClose={saving ? () => undefined : onClose} title="Cambiar mesa" description={reservation ? `${reservation.fullName} · ${reservation.partySize} comensales · ${reservation.serviceTime}` : ""} widthClassName="max-w-3xl" footer={<><button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink disabled:opacity-60">Cancelar</button><button type="button" disabled={saving || loading || !availability?.isBookable || !hasEnoughCapacity} onClick={() => void save()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Guardando..." : "Confirmar asignacion"}</button></>}>
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-white">Salon
        <select value={selectedRoomId} disabled={loading || saving} onChange={(event) => { setSelectedRoomId(event.target.value); setSelectedTableIds([]); }} className="mt-2 w-full rounded-xl border border-white/15 bg-white px-3 py-3 text-sm font-medium text-brand-ink disabled:opacity-60">
          {rooms.map((room) => { const roomAvailability = availabilityByRoom[room.id]; return <option key={room.id} value={room.id} disabled={roomAvailability ? !roomAvailability.isBookable : false}>{room.name}{roomAvailability && !roomAvailability.isBookable ? " · No disponible" : ""}</option>; })}
        </select>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/10 px-4 py-3"><p className="text-sm text-white/80">Elegí una o más mesas libres. Las grises están ocupadas, bloqueadas o no aceptan reservas.</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${hasEnoughCapacity ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/80"}`}>{selectedTableIds.length} mesas · {selectedCapacity} de {reservation?.partySize || 0} pax</span></div>
      {loading ? <p className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/80">Buscando disponibilidad en los salones...</p> : null}
      {!loading && availability && !availability.isBookable ? <p className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{availability.unavailableReason}</p> : null}
      {!loading && availability?.isBookable ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availability.tables.map((table) => { const selected = selectedTableIds.includes(table.id); return <button key={table.id} type="button" disabled={!table.isAvailable || saving} title={table.unavailableReason || undefined} onClick={() => setSelectedTableIds((current) => selected ? current.filter((id) => id !== table.id) : [...current, table.id])} className={`rounded-xl border px-3 py-3 text-left transition ${!table.isAvailable ? "cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500" : selected ? "border-brand-orange bg-[#FFF4ED] text-brand-ink" : "border-white/15 bg-white text-brand-ink hover:border-brand-orange"}`}><span className="block font-semibold">Mesa {table.label}</span><span className="mt-1 block text-xs opacity-75">{table.seats} pax{!table.isAvailable ? ` · ${table.unavailableReason || "No disponible"}` : ""}</span></button>; })}</div> : null}
      {!loading && availability?.isBookable && !availability.tables.length ? <p className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/80">Este salon no tiene mesas configuradas.</p> : null}
      {error ? <p className="rounded-2xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
    </div>
  </AppModal>;
}
