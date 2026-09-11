import { jsPDF } from "jspdf";
import type { Reservation } from "./types";

export type OfflineBackup = {
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

export function formatBackupDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export function formatBackupGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function backupServiceLabel(backup: OfflineBackup) {
  return backup.specialService ? `${backup.specialService.label} · ${backup.specialService.startTime}-${backup.specialService.endTime}` : backup.turn === "mediodia" ? "Mediodía" : "Noche";
}

function statusLabel(status: string) {
  return ({ pending: "Pendiente", confirmed: "Confirmada", seated: "Sentada" } as Record<string, string>)[status] || status;
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
  pdf.text(`${backup.branch.name} · ${formatBackupDate(backup.serviceDate)} · ${backupServiceLabel(backup)}`, 14, 30);
  pdf.setTextColor(82, 82, 91);
  pdf.setFontSize(8);
  pdf.text(`Generado: ${formatBackupGeneratedAt(backup.generatedAt)} · Página ${pageNumber}`, 14, 36);
  pdf.setDrawColor(228, 228, 231);
  pdf.line(14, 40, width - 14, 40);
}

export function downloadOfflineBackupPdf(backup: OfflineBackup) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const width = pdf.internal.pageSize.getWidth();
  let pageNumber = 1;
  let y = 49;
  const nextPage = () => { pdf.addPage(); pageNumber += 1; addPdfHeader(pdf, backup, pageNumber); y = 49; };
  const ensureSpace = (height: number) => { if (y + height > pageHeight - 16) nextPage(); };

  addPdfHeader(pdf, backup, pageNumber);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(10);
  pdf.text(`${backup.totalReservations} reservas · ${backup.totalCovers} cubiertos`, 14, y);
  y += 9;
  if (!backup.reservations.length) { pdf.setTextColor(82, 82, 91); pdf.text("No hay reservas activas para este servicio.", 14, y + 4); }

  backup.reservations.forEach((reservation) => {
    const { location, notes } = reservationDetails(reservation);
    const noteLines = notes ? pdf.splitTextToSize(notes, width - 34) : [];
    const height = 26 + noteLines.length * 4;
    ensureSpace(height);
    pdf.setFillColor(255, 247, 237);
    pdf.roundedRect(14, y, width - 28, height - 2, 2, 2, "F");
    pdf.setTextColor(24, 24, 27); pdf.setFontSize(12); pdf.text(reservation.serviceTime, 18, y + 8);
    pdf.setFontSize(10); pdf.text(`${reservation.fullName} · ${reservation.partySize} pax · ${reservation.code}`, 38, y + 8);
    pdf.setFontSize(8.5); pdf.setTextColor(82, 82, 91); pdf.text(`${reservation.phone || "Sin teléfono"} · ${statusLabel(reservation.status)}`, 18, y + 14);
    pdf.text(location, 18, y + 19); if (noteLines.length) pdf.text(noteLines, 18, y + 24);
    y += height + 3;
  });

  pdf.setTextColor(113, 113, 122); pdf.setFontSize(7.5);
  pdf.text("Copia operativa estática. Volvé a descargarla si cambian las reservas.", 14, pageHeight - 9);
  pdf.save(`foodie-reservas-${safeFilename(backup.branch.name)}-${backup.serviceDate}-${safeFilename(backup.specialService?.label || backup.turn)}.pdf`);
}
