"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Reservation } from "../../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

type OfflineBackup = {
  generatedAt: string;
  restaurant: { name: string };
  branch: { id: string; name: string };
  serviceDate: string;
  turn: "mediodia" | "noche";
  specialService: { id: string; label: string; startTime: string; endTime: string } | null;
  totalReservations: number;
  totalCovers: number;
  reservations: Reservation[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  return ({ pending: "Pendiente", confirmed: "Confirmada", seated: "Sentada" } as Record<string, string>)[status] || status;
}

function serviceLabel(backup: OfflineBackup) {
  return backup.specialService ? `${backup.specialService.label} · ${backup.specialService.startTime}-${backup.specialService.endTime}` : backup.turn === "mediodia" ? "Mediodía" : "Noche";
}

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function reservationDetails(reservation: Reservation) {
  const location = `${reservation.room?.name || "Sin salón"}${reservation.tables.length ? ` · Mesa${reservation.tables.length > 1 ? "s" : ""} ${reservation.tables.map((item) => item.table.label).join(" + ")}` : ""}`;
  const notes = [reservation.notes, reservation.preferredZone ? `Ubicación: ${reservation.preferredZone}` : null].filter(Boolean).join(" · ");
  return { location, notes };
}

function addPdfHeader(pdf: jsPDF, backup: OfflineBackup, pageNumber: number) {
  const width = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(234, 88, 12);
  pdf.setFontSize(9);
  pdf.text(backup.restaurant.name.toUpperCase(), 14, 14);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(17);
  pdf.text("Backup operativo de reservas", 14, 23);
  pdf.setFontSize(10);
  pdf.text(`${backup.branch.name} · ${formatDate(backup.serviceDate)} · ${serviceLabel(backup)}`, 14, 30);
  pdf.setTextColor(82, 82, 91);
  pdf.setFontSize(8);
  pdf.text(`Generado: ${formatGeneratedAt(backup.generatedAt)} · Página ${pageNumber}`, 14, 36);
  pdf.setDrawColor(228, 228, 231);
  pdf.line(14, 40, width - 14, 40);
}

function downloadPdf(backup: OfflineBackup) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const width = pdf.internal.pageSize.getWidth();
  let pageNumber = 1;
  let y = 49;
  const nextPage = () => {
    pdf.addPage();
    pageNumber += 1;
    addPdfHeader(pdf, backup, pageNumber);
    y = 49;
  };
  const ensureSpace = (height: number) => { if (y + height > pageHeight - 16) nextPage(); };

  addPdfHeader(pdf, backup, pageNumber);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(10);
  pdf.text(`${backup.totalReservations} reservas · ${backup.totalCovers} cubiertos`, 14, y);
  y += 9;

  if (!backup.reservations.length) {
    pdf.setTextColor(82, 82, 91);
    pdf.text("No hay reservas activas para este servicio.", 14, y + 4);
  }

  backup.reservations.forEach((reservation) => {
    const { location, notes } = reservationDetails(reservation);
    const noteLines = notes ? pdf.splitTextToSize(notes, width - 34) : [];
    const height = 26 + noteLines.length * 4;
    ensureSpace(height);
    pdf.setFillColor(255, 247, 237);
    pdf.roundedRect(14, y, width - 28, height - 2, 2, 2, "F");
    pdf.setTextColor(24, 24, 27);
    pdf.setFontSize(12);
    pdf.text(reservation.serviceTime, 18, y + 8);
    pdf.setFontSize(10);
    pdf.text(`${reservation.fullName} · ${reservation.partySize} pax · ${reservation.code}`, 38, y + 8);
    pdf.setFontSize(8.5);
    pdf.setTextColor(82, 82, 91);
    pdf.text(`${reservation.phone || "Sin teléfono"} · ${statusLabel(reservation.status)}`, 18, y + 14);
    pdf.text(location, 18, y + 19);
    if (noteLines.length) pdf.text(noteLines, 18, y + 24);
    y += height + 3;
  });

  pdf.setTextColor(113, 113, 122);
  pdf.setFontSize(7.5);
  pdf.text("Copia operativa estática. Volvé a descargarla si cambian las reservas.", 14, pageHeight - 9);
  pdf.save(`foodie-reservas-${safeFilename(backup.branch.name)}-${backup.serviceDate}-${safeFilename(backup.specialService?.label || backup.turn)}.pdf`);
}

export default function PrintReservationsPage() {
  const [backup, setBackup] = useState<OfflineBackup | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBackup = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams(window.location.search);
    const branchId = params.get("branchId") || "";
    const serviceDate = params.get("date") || "";
    const turn = params.get("turn") || "";
    const specialServiceId = params.get("specialServiceId") || "";
    const token = window.localStorage.getItem("foodie_token");

    if (!token) {
      setError("Tu sesión no está disponible. Volvé a iniciar sesión desde Foodie.");
      setLoading(false);
      return;
    }
    if (!branchId || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !["mediodia", "noche"].includes(turn)) {
      setError("Faltan la sede, fecha o turno para preparar el backup.");
      setLoading(false);
      return;
    }

    const query = new URLSearchParams({ branchId, serviceDate, turn });
    if (specialServiceId) query.set("specialServiceId", specialServiceId);
    try {
      const response = await fetch(`${API_URL}/restaurant/reservations/offline-backup?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(response.status === 403 ? "No tenés permiso para descargar este backup." : "No se pudo preparar el backup. Revisá tu conexión y reintentá.");
      setBackup(await response.json() as OfflineBackup);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo preparar el backup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBackup(); }, [loadBackup]);

  const cards = useMemo(() => backup?.reservations.map((reservation) => ({ reservation, ...reservationDetails(reservation) })) || [], [backup]);

  if (loading) return <main className="print-feedback">Preparando backup operativo…</main>;
  if (error || !backup) return <main className="print-feedback print-feedback-card"><strong>No se pudo preparar el backup.</strong><span>{error}</span><button type="button" onClick={() => void loadBackup()}><RefreshCw size={16} /> Reintentar</button></main>;

  return (
    <main className="print-page offline-backup-page">
      <div className="print-actions">
        <button type="button" className="print-secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
        <button type="button" onClick={() => downloadPdf(backup)}><Download size={16} /> Descargar PDF</button>
      </div>
      <header>
        <p className="print-kicker">{backup.restaurant.name}</p>
        <h1 className="print-title">Backup operativo de reservas</h1>
        <p className="print-branch">{backup.branch.name} · {formatDate(backup.serviceDate)}<br /><strong>{serviceLabel(backup)}</strong></p>
        <p className="offline-generated">Generado el {formatGeneratedAt(backup.generatedAt)}. Esta copia no se actualiza sola.</p>
      </header>
      <section className="print-summary" aria-label="Resumen de reservas">
        <div><span>Reservas activas</span><strong>{backup.totalReservations}</strong></div>
        <div><span>Cubiertos</span><strong>{backup.totalCovers}</strong></div>
      </section>
      {cards.length ? <section className="offline-reservation-list">{cards.map(({ reservation, location, notes }) => (
        <article className="offline-reservation-card" key={reservation.id}>
          <div className="offline-reservation-time">{reservation.serviceTime}</div>
          <div className="offline-reservation-main"><div className="offline-reservation-heading"><h2>{reservation.fullName}</h2><span>{statusLabel(reservation.status)}</span></div><p><strong>{reservation.partySize} pax</strong> · Código <strong>{reservation.code}</strong></p><p>{reservation.phone || "Sin teléfono"}</p><p>{location}</p>{notes ? <p className="offline-reservation-notes">{notes}</p> : null}</div>
        </article>
      ))}</section> : <p className="print-empty">No hay reservas activas para este servicio.</p>}
      <p className="offline-footer">Copia operativa estática. Volvé a descargarla antes del servicio si hubo cambios.</p>
    </main>
  );
}
