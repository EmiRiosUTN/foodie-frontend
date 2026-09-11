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

function reservationLocation(reservation: Reservation) {
  const tables = reservation.tables.map((item) => item.table.label).join(" + ");
  const rooms = reservation.eventRoomAssignments?.length
    ? reservation.eventRoomAssignments.map((assignment) => `${assignment.room.name} (${assignment.allocatedCovers} pax)`).join(" + ")
    : reservation.room?.name || "Sin salón";
  return `${rooms}${tables ? ` · ${tables}` : ""}`;
}

function reservationNotes(reservation: Reservation) {
  return [reservation.notes, reservation.preferredZone ? `Ubicación: ${reservation.preferredZone}` : null].filter(Boolean).join(" · ") || "—";
}

function addPdfHeader(pdf: jsPDF, backup: OfflineBackup, pageNumber: number) {
  const width = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(234, 88, 12);
  pdf.setFontSize(9);
  pdf.text(backup.restaurant.name.toUpperCase(), 14, 14);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(17);
  pdf.text("Reservas del turno", 14, 23);
  pdf.setFontSize(10);
  pdf.text(`${backup.branch.name} · ${formatBackupDate(backup.serviceDate)} · ${backupServiceLabel(backup)}`, 14, 30);
  pdf.setTextColor(82, 82, 91);
  pdf.setFontSize(8);
  pdf.text(`Generado: ${formatBackupGeneratedAt(backup.generatedAt)} · Página ${pageNumber}`, 14, 36);
  pdf.setDrawColor(228, 228, 231);
  pdf.line(14, 40, width - 14, 40);
}

function addTableHeader(pdf: jsPDF, y: number) {
  const columns = [14, 37, 68, 112, 129, 168, 211, 239];
  const labels = ["Hora", "Código", "Cliente", "Pax", "Teléfono", "Salón / mesa", "Estado", "Notas"];
  pdf.setFillColor(244, 244, 245);
  pdf.rect(14, y, 269, 7, "F");
  pdf.setTextColor(82, 82, 91);
  pdf.setFontSize(6.8);
  labels.forEach((label, index) => pdf.text(label.toUpperCase(), columns[index], y + 4.5));
}

function addPdfFooter(pdf: jsPDF) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setTextColor(113, 113, 122);
  pdf.setFontSize(7.5);
  pdf.text("Copia operativa estática. Volvé a descargarla si cambian las reservas.", 14, pageHeight - 9);
}

export function downloadOfflineBackupPdf(backup: OfflineBackup) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const tableWidth = pageWidth - margin * 2;
  const columns = [14, 37, 68, 112, 129, 168, 211, 239];
  const widths = [23, 31, 44, 17, 39, 43, 28, 44];
  let pageNumber = 1;
  let y = 49;

  const nextPage = () => {
    addPdfFooter(pdf);
    pdf.addPage();
    pageNumber += 1;
    addPdfHeader(pdf, backup, pageNumber);
    addTableHeader(pdf, 45);
    y = 52;
  };

  addPdfHeader(pdf, backup, pageNumber);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(10);
  pdf.text(`${backup.totalReservations} reservas · ${backup.totalCovers} cubiertos`, margin, y);
  y += 8;
  addTableHeader(pdf, y);
  y += 7;

  if (!backup.reservations.length) {
    pdf.setTextColor(82, 82, 91);
    pdf.setFontSize(9);
    pdf.text("No hay reservas activas para este servicio.", margin, y + 8);
  }

  backup.reservations.forEach((reservation) => {
    const values = [
      reservation.serviceTime,
      reservation.code,
      reservation.fullName,
      String(reservation.partySize),
      reservation.phone || "—",
      reservationLocation(reservation),
      statusLabel(reservation.status),
      reservationNotes(reservation)
    ];
    const lines = values.map((value, index) => pdf.splitTextToSize(value, widths[index] - 2));
    const rowHeight = Math.max(9, ...lines.map((item) => item.length * 3.4 + 3));
    if (y + rowHeight > pageHeight - 16) nextPage();

    pdf.setDrawColor(228, 228, 231);
    pdf.line(margin, y + rowHeight, tableWidth + margin, y + rowHeight);
    pdf.setTextColor(39, 39, 42);
    pdf.setFontSize(7.6);
    lines.forEach((item, index) => pdf.text(item, columns[index], y + 4.5));
    y += rowHeight;
  });

  addPdfFooter(pdf);
  pdf.save(`foodie-reservas-${safeFilename(backup.branch.name)}-${backup.serviceDate}-${safeFilename(backup.specialService?.label || backup.turn)}.pdf`);
}
