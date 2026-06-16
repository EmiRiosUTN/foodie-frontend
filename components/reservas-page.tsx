"use client";

import { CalendarDays, CheckCircle2, Clock3, Plus, Ticket, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AppModal } from "./app-modal";
import { FoodieSelect } from "./foodie-select";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

export function ReservasPage() {
  const {
    reservations,
    reservationForm,
    setReservationForm,
    createReservation,
    moveReservation,
    roomDetail,
    selectedDate,
    selectedTurn,
    setSelectedDate,
    setSelectedTurn
  } = useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const zonePills = roomDetail?.zones || [];

  const sortedReservations = useMemo(
    () =>
      [...reservations].sort((left, right) => {
        const statusOrder = { confirmed: 0, pending: 1, seated: 2, completed: 3, cancelled: 4, no_show: 5 } as Record<string, number>;
        return (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
      }),
    [reservations]
  );

  const handleCreate = async () => {
    setFormError("");

    if (!reservationForm.fullName.trim() || !reservationForm.phone.trim() || !reservationForm.email.trim()) {
      setFormError("Completa nombre, telefono y email para crear la reserva.");
      return;
    }

    const partySize = Number(reservationForm.partySize);
    if (!Number.isInteger(partySize) || partySize < 1) {
      setFormError("Ingresa una cantidad valida de comensales.");
      return;
    }

    try {
      await createReservation();
      setCreateOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la reserva.");
    }
  };

  return (
    <WorkspaceShell
      title="Reservas"
      description="Opera el turno con una vista limpia de reservas y acciones puntuales, sin formularios permanentes expuestos."
    >
      <section className="overflow-hidden rounded-[26px] border border-brand-line bg-white">
        <div className="flex flex-col gap-4 border-b border-brand-line px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-orange">Turno activo</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-brand-ink">Reservas del turno</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Nueva reserva
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_180px] md:items-end">
            <label className="space-y-2 text-sm text-brand-ink">
              <span className="inline-flex items-center gap-2 font-medium">
                <CalendarDays className="h-4 w-4 text-brand-orange" />
                Fecha
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
              />
            </label>
            <label className="space-y-2 text-sm text-brand-ink">
              <span className="inline-flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4 text-brand-orange" />
                Turno
              </span>
              <FoodieSelect
                value={selectedTurn}
                onChange={(event) => setSelectedTurn(event.target.value as "mediodia" | "noche")}
                className="font-medium"
              >
                <option value="mediodia">Mediodia</option>
                <option value="noche">Noche</option>
              </FoodieSelect>
            </label>
          </div>
        </div>

        {sortedReservations.length ? (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[minmax(0,1.7fr)_1fr_0.9fr_0.9fr_160px] gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                <span>Cliente</span>
                <span>Salon y mesa</span>
                <span>Codigo</span>
                <span>Estado</span>
                <span className="text-right">Acciones</span>
              </div>
              <div className="divide-y divide-brand-line">
                {sortedReservations.map((reservation) => (
                  <div key={reservation.id} className="grid grid-cols-[minmax(0,1.7fr)_1fr_0.9fr_0.9fr_160px] gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">{reservation.fullName}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {reservation.phone} - {reservation.email}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        <Users className="h-3.5 w-3.5" />
                        {reservation.partySize} cubiertos
                      </p>
                    </div>
                    <div className="min-w-0 text-sm text-neutral-500">
                      <p className="truncate">{reservation.room.name}</p>
                      <p className="truncate text-xs text-neutral-400">{reservation.tables.map((item) => item.table.label).join(", ") || "Sin asignacion"}</p>
                    </div>
                    <div className="text-sm font-semibold text-brand-ink">{reservation.code}</div>
                    <div className="text-sm text-neutral-500">{reservation.status}</div>
                    <div className="flex items-start justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => moveReservation(reservation.id, "check-in")}
                        className="rounded-full bg-brand-orange px-3 py-2 text-xs font-medium text-white"
                      >
                        Check-in
                      </button>
                      <button
                        type="button"
                        onClick={() => moveReservation(reservation.id, "release")}
                        className="rounded-full border border-brand-line px-3 py-2 text-xs font-medium text-brand-ink"
                      >
                        Liberar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-brand-line md:hidden">
              {sortedReservations.map((reservation) => (
                <div key={reservation.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-brand-ink">{reservation.fullName}</p>
                      <p className="mt-1 text-sm text-neutral-500">{reservation.room.name}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                        {reservation.code} - {reservation.partySize} cubiertos
                      </p>
                    </div>
                    <div className="shrink-0 text-xs font-medium text-neutral-500">{reservation.status}</div>
                  </div>
                  <p className="mt-3 text-xs text-neutral-400">{reservation.tables.map((item) => item.table.label).join(", ") || "Sin asignacion"}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveReservation(reservation.id, "check-in")}
                      className="flex-1 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Check-in
                    </button>
                    <button
                      type="button"
                      onClick={() => moveReservation(reservation.id, "release")}
                      className="flex-1 rounded-full border border-brand-line px-4 py-2.5 text-sm font-medium text-brand-ink"
                    >
                      Liberar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF4ED] text-brand-orange">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-5 text-lg font-semibold text-brand-ink">No hay reservas para este turno</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-neutral-500">
              Cuando necesites cargar una nueva reserva, hacelo desde el boton superior y mantene esta vista enfocada en la operacion.
            </p>
          </div>
        )}
      </section>

      <AppModal
        open={createOpen}
        onClose={() => {
          setFormError("");
          setCreateOpen(false);
        }}
        title="Nueva reserva"
        description="Crea una reserva manual para el turno actual usando la asignacion automatica del backend."
        widthClassName="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
            >
              Cancelar
            </button>
            <button type="button" onClick={() => void handleCreate()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white">
              Crear reserva
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Nombre del cliente</span>
            <input
              value={reservationForm.fullName}
              onChange={(event) => setReservationForm((current) => ({ ...current, fullName: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Telefono</span>
            <input
              value={reservationForm.phone}
              onChange={(event) => setReservationForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={reservationForm.email}
              onChange={(event) => setReservationForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Comensales</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={reservationForm.partySize}
              onChange={(event) => setReservationForm((current) => ({ ...current, partySize: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Fecha de reserva</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Turno</span>
            <FoodieSelect
              value={selectedTurn}
              onChange={(event) => setSelectedTurn(event.target.value as "mediodia" | "noche")}
              className="font-medium"
            >
              <option value="mediodia">Mediodia</option>
              <option value="noche">Noche</option>
            </FoodieSelect>
          </label>
          <label className="space-y-2 text-sm text-brand-ink md:col-span-2">
            <span className="font-medium">Cumpleanos</span>
            <input
              type="date"
              value={reservationForm.birthday}
              onChange={(event) => setReservationForm((current) => ({ ...current, birthday: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink md:col-span-2">
            <span className="font-medium">Preferencia de zona</span>
            <FoodieSelect
              value={reservationForm.preferredZone}
              onChange={(event) => setReservationForm((current) => ({ ...current, preferredZone: event.target.value }))}
              className="font-medium"
            >
              <option value="">Sin preferencia de zona</option>
              {zonePills.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </FoodieSelect>
          </label>
          <label className="space-y-2 text-sm text-brand-ink md:col-span-2">
            <span className="font-medium">Notas</span>
            <textarea
              value={reservationForm.notes}
              onChange={(event) => setReservationForm((current) => ({ ...current, notes: event.target.value }))}
              className="h-28 w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          {formError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:col-span-2">
              {formError}
            </p>
          ) : null}
        </div>
      </AppModal>
    </WorkspaceShell>
  );
}
