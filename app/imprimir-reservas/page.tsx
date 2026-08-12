"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bootstrap, Reservation } from "../../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Confirmada",
    pending: "Pendiente",
    seated: "Sentada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No show"
  };
  return labels[status] || status;
}

function DailyReservationsPrint() {
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState("");
  const [paramsReady, setParamsReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBranchId(params.get("branchId") || "");
    setDate(params.get("date") || "");
    setParamsReady(true);
  }, []);

  useEffect(() => {
    if (!paramsReady) return;
    const token = window.localStorage.getItem("foodie_token");
    if (!token) {
      setError("Tu sesion no esta disponible. Volve a iniciar sesion desde Foodie.");
      setLoading(false);
      return;
    }
    if (!branchId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Faltan la sede o la fecha para generar el listado.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const query = new URLSearchParams({ branchId, dateFrom: date, dateTo: date, turn: "all" });
    Promise.all([
      fetch(`${API_URL}/restaurant/bootstrap`, { headers }),
      fetch(`${API_URL}/restaurant/reservations/history?${query.toString()}`, { headers })
    ])
      .then(async ([bootstrapResponse, reservationsResponse]) => {
        if (!bootstrapResponse.ok || !reservationsResponse.ok) {
          throw new Error("No se pudieron cargar las reservas para imprimir.");
        }
        const nextBootstrap = (await bootstrapResponse.json()) as Bootstrap;
        const nextReservations = (await reservationsResponse.json()) as Reservation[];
        if (!nextBootstrap.branches.some((branch) => branch.id === branchId)) {
          throw new Error("La sede seleccionada no pertenece a este restaurante.");
        }
        setBootstrap(nextBootstrap);
        setReservations(nextReservations);
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudo generar el listado.");
      })
      .finally(() => setLoading(false));
  }, [branchId, date, paramsReady]);

  const branch = bootstrap?.branches.find((item) => item.id === branchId);
  const sortedReservations = useMemo(
    () => [...reservations].sort((left, right) => left.serviceTime.localeCompare(right.serviceTime)),
    [reservations]
  );
  const totalCovers = useMemo(
    () => sortedReservations.reduce((total, reservation) => total + reservation.partySize, 0),
    [sortedReservations]
  );

  if (loading) return <main className="print-feedback">Preparando listado de reservas...</main>;
  if (error) return <main className="print-feedback">{error}</main>;

  return (
    <main className="print-page">
      <div className="print-actions"><button type="button" onClick={() => window.print()}>Imprimir / Guardar PDF</button></div>
      <header>
        <p className="print-kicker">{bootstrap?.name}</p>
        <h1 className="print-title">Reservas — {formatDate(date)}</h1>
        <p className="print-branch">Sede: {branch?.name || "—"}</p>
      </header>
      <section className="print-summary" aria-label="Resumen de reservas">
        <div><span>Reservas</span><strong>{sortedReservations.length}</strong></div>
        <div><span>Cubiertos</span><strong>{totalCovers}</strong></div>
      </section>
      {sortedReservations.length ? (
        <table className="print-table">
          <thead><tr><th>Hora</th><th>Cliente</th><th>Personas</th><th>Telefono</th><th>Salon / mesa</th><th>Estado</th><th>Observaciones y preferencias</th></tr></thead>
          <tbody>{sortedReservations.map((reservation) => (
            <tr key={reservation.id}>
              <td>{reservation.serviceTime}</td><td><strong>{reservation.fullName}</strong></td><td>{reservation.partySize}</td><td>{reservation.phone || "—"}</td>
              <td>{reservation.room?.name || "—"}{reservation.tables.length ? ` — ${reservation.tables.map((item) => item.table.label).join(", ")}` : ""}</td>
              <td>{statusLabel(reservation.status)}</td>
              <td>{[reservation.notes, reservation.preferredZone ? `Ubicacion: ${reservation.preferredZone}` : null].filter(Boolean).join(" · ") || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="print-empty">No hay reservas para este dia.</p>}
    </main>
  );
}

export default function PrintReservationsPage() {
  return <DailyReservationsPrint />;
}
