"use client";

import { useEffect, useState } from "react";
import type { Reservation, ReservationTableOption } from "../lib/types";
import { AppModal } from "./app-modal";
import { useWorkspace } from "./workspace-provider";

type ReservationTableReassignModalProps = {
  reservation: Reservation | null;
  onClose: () => void;
};

function optionKey(option: ReservationTableOption) {
  return option.tableIds.join("|");
}

export function ReservationTableReassignModal({ reservation, onClose }: ReservationTableReassignModalProps) {
  const { loadReservationTableOptions, reassignReservationTables } = useWorkspace();
  const [options, setOptions] = useState<ReservationTableOption[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reservation) return;
    let active = true;
    setLoading(true);
    setError("");
    setOptions([]);
    setSelectedKey("");

    loadReservationTableOptions(reservation.id)
      .then((nextOptions) => {
        if (!active) return;
        setOptions(nextOptions);
        if (nextOptions.length) setSelectedKey(optionKey(nextOptions[0]));
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las mesas disponibles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reservation?.id]);

  const selectedOption = options.find((option) => optionKey(option) === selectedKey) || null;

  async function save() {
    if (!reservation || !selectedOption) return;
    setSaving(true);
    setError("");
    try {
      await reassignReservationTables(reservation.id, selectedOption.tableIds);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo reasignar la mesa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={Boolean(reservation)}
      onClose={saving ? () => undefined : onClose}
      title="Cambiar mesa"
      description={reservation ? `${reservation.fullName} · ${reservation.partySize} comensales · ${reservation.room.name}` : ""}
      footer={
        <>
          <button type="button" disabled={saving} onClick={onClose} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink disabled:opacity-60">Cancelar</button>
          <button type="button" disabled={saving || loading || !selectedOption} onClick={() => void save()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Guardando..." : "Confirmar mesa"}</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-6 text-white/75">Solo se muestran mesas y combinaciones disponibles en este salón para el horario de la reserva.</p>
        {loading ? <p className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/80">Buscando mesas disponibles...</p> : null}
        {!loading && !error && !options.length ? <p className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/80">No hay mesas disponibles con capacidad suficiente.</p> : null}
        {!loading && options.map((option) => {
          const key = optionKey(option);
          const isSelected = key === selectedKey;
          return (
            <button key={key} type="button" onClick={() => setSelectedKey(key)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected ? "border-brand-orange bg-[#FFF4ED] text-brand-ink" : "border-white/15 bg-white text-brand-ink hover:border-brand-orange"}`}>
              <span className="block text-sm font-bold">{option.tableLabels.join(" + ")}</span>
              <span className="mt-1 block text-xs text-neutral-500">{option.seats} pax {option.tableIds.length > 1 ? "· Mesas combinadas" : ""}</span>
            </button>
          );
        })}
        {error ? <p className="rounded-2xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      </div>
    </AppModal>
  );
}
