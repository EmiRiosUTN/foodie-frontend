"use client";

import { ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ChatActivityLog, RestaurantActivityLog, RestaurantStaffUserDetail } from "../lib/types";
import { FoodieSelect } from "./foodie-select";
import { roleLabel } from "./restaurant-users-page";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

type TraceType = "system" | "messages";

function systemActionLabel(action: string) {
  if (action === "POST /v1/restaurant/chat-activity") return "Registro de mensaje enviado";
  if (action === "POST /v1/restaurant/users") return "Creo un usuario";
  if (action.startsWith("PATCH /v1/restaurant/users")) return "Actualizo un usuario";
  if (action.startsWith("DELETE /v1/restaurant/users")) return "Elimino un usuario";
  if (action.includes("restaurant_user.created")) return "Creo un usuario";
  if (action.includes("restaurant_user.updated")) return "Actualizo un usuario";
  if (action.includes("restaurant_user.deleted")) return "Elimino un usuario";
  if (action.startsWith("POST")) return "Creo o ejecuto una accion";
  if (action.startsWith("PATCH") || action.startsWith("PUT")) return "Actualizo informacion";
  if (action.startsWith("DELETE")) return "Elimino informacion";
  return action;
}

function moduleLabel(item: RestaurantActivityLog) {
  const path = typeof item.metadata?.path === "string" ? item.metadata.path : "";
  if (path.includes("/restaurant/chat-activity")) return "Chat";
  if (path.includes("/restaurant/users") || item.targetType === "restaurant_user") return "Usuarios";
  if (path.includes("/restaurant/reservations") || item.targetType === "reservation") return "Reservas";
  if (path.includes("/restaurant/customers") || item.targetType === "customer") return "Clientes";
  if (path.includes("/restaurant/rooms") || item.targetType === "room") return "Salon";
  if (path.includes("/restaurant/tables") || item.targetType === "table") return "Mesas";
  if (item.targetType === "http_request") return "Sistema";
  return item.targetType;
}

function chatActionLabel(action: string) {
  if (action === "message.sent") return "Mensaje enviado";
  if (action === "message.send_failed") return "Error al enviar mensaje";
  if (action === "media.sent") return "Archivo enviado";
  if (action === "media.send_failed") return "Error al enviar archivo";
  if (action === "template.sent") return "Plantilla enviada";
  if (action === "template.send_failed") return "Error al enviar plantilla";
  return action;
}

function metadataText(metadata?: Record<string, unknown> | null) {
  if (!metadata) return [];
  const lines: string[] = [];
  if (typeof metadata.email === "string") lines.push(`Email: ${metadata.email}`);
  if (typeof metadata.role === "string") lines.push(`Rol: ${roleLabel(metadata.role)}`);
  if (Array.isArray(metadata.changedFields)) lines.push(`Campos modificados: ${metadata.changedFields.join(", ")}`);
  if (typeof metadata.statusCode === "number" && metadata.statusCode >= 400) lines.push(`Resultado: error ${metadata.statusCode}`);
  return lines;
}

function formatTemplateParameters(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).join(", ");
}

function csvEscape(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function RestaurantUserDetailPage({ userId }: { userId: string }) {
  const router = useRouter();
  const { currentUser, loadRestaurantUserDetail, loadRestaurantActivity, loadRestaurantChatActivity } = useWorkspace();
  const [user, setUser] = useState<RestaurantStaffUserDetail | null>(null);
  const [systemActivity, setSystemActivity] = useState<RestaurantActivityLog[]>([]);
  const [messageActivity, setMessageActivity] = useState<ChatActivityLog[]>([]);
  const [traceType, setTraceType] = useState<TraceType>("messages");
  const [loading, setLoading] = useState(true);

  const canManage = currentUser?.role === "restaurant_owner";

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [userData, systemData, messageData] = await Promise.all([
          loadRestaurantUserDetail(userId),
          loadRestaurantActivity({ restaurantUserId: userId, limit: 300 }),
          loadRestaurantChatActivity({ restaurantUserId: userId, limit: 300 })
        ]);
        setUser(userData);
        setSystemActivity(systemData);
        setMessageActivity(messageData);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [canManage, userId]);

  const activeRows = traceType === "messages" ? messageActivity : systemActivity;

  const metrics = useMemo(
    () => ({
      system: systemActivity.length,
      messages: messageActivity.length,
      errors: messageActivity.filter((item) => item.status === "error").length
    }),
    [messageActivity, systemActivity]
  );

  function exportCurrentTrace() {
    if (!user) return;
    if (traceType === "messages") {
      downloadCsv(
        `trazabilidad-mensajes-${user.email}.csv`,
        messageActivity.map((item) => ({
          fecha: new Date(item.createdAt).toLocaleString("es-AR"),
          accion: chatActionLabel(item.action),
          estado: item.status === "success" ? "OK" : "Error",
          contacto: item.contactName || "",
          telefono: item.contactPhone || "",
          chatId: item.chatId,
          tipo: item.messageType,
          mensaje: item.messageContent || "",
          plantilla: item.templateName || "",
          parametros: formatTemplateParameters(item.templateParameters),
          archivo: item.fileName || "",
          error: item.errorMessage || "",
          idExterno: item.externalMessageId || ""
        }))
      );
      return;
    }

    downloadCsv(
      `trazabilidad-operativa-${user.email}.csv`,
      systemActivity.map((item) => ({
        fecha: new Date(item.createdAt).toLocaleString("es-AR"),
        accion: systemActionLabel(item.action),
        modulo: moduleLabel(item),
        referencia: item.targetId,
        detalle: metadataText(item.metadata).join(" | ")
      }))
    );
  }

  if (!canManage) {
    return (
      <WorkspaceShell title="Usuario" description="Trazabilidad operativa.">
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">
          Solo el usuario principal puede consultar trazabilidad de usuarios.
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title={user?.fullName || "Usuario"} description="Detalle y trazabilidad individual del usuario.">
      <button onClick={() => router.push("/usuarios")} className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-medium text-brand-ink">
        <ArrowLeft className="h-4 w-4" />
        Volver a usuarios
      </button>

      {loading ? (
        <section className="rounded-[28px] border border-brand-line bg-white px-6 py-14 text-center text-sm text-neutral-500">Cargando usuario...</section>
      ) : !user ? (
        <section className="rounded-[28px] border border-brand-line bg-white px-6 py-14 text-center text-sm text-neutral-500">No se encontro el usuario.</section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_1fr]">
            <article className="rounded-[28px] border border-brand-line bg-white p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-orange">Ficha del usuario</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{user.fullName}</h2>
              <div className="mt-5 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                <p><span className="font-semibold text-brand-ink">Email:</span> {user.email}</p>
                <p><span className="font-semibold text-brand-ink">Rol:</span> {roleLabel(user.role)}</p>
                <p><span className="font-semibold text-brand-ink">Estado:</span> {user.isActive ? "Activo" : "Inactivo"}</p>
                <p><span className="font-semibold text-brand-ink">Alta:</span> {new Date(user.createdAt).toLocaleDateString("es-AR")}</p>
                {user.createdBy ? <p className="md:col-span-2"><span className="font-semibold text-brand-ink">Creado por:</span> {user.createdBy.fullName}</p> : null}
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Acciones operativas" value={metrics.system} />
              <MetricCard label="Mensajes enviados" value={metrics.messages} />
              <MetricCard label="Errores de envio" value={metrics.errors} />
            </div>
          </section>

          <section className="rounded-[28px] border border-brand-line bg-white">
            <div className="flex flex-col gap-4 border-b border-brand-line px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-lg font-semibold text-brand-ink">Trazabilidad</p>
                <p className="mt-1 text-sm text-neutral-500">Selecciona que tipo de actividad queres revisar.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <FoodieSelect value={traceType} onChange={(event) => setTraceType(event.target.value as TraceType)} className="min-w-[240px]">
                  <option value="messages">Mensajes enviados</option>
                  <option value="system">Actividad del sistema</option>
                </FoodieSelect>
                <button
                  onClick={exportCurrentTrace}
                  disabled={!activeRows.length}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar CSV
                </button>
              </div>
            </div>

            {traceType === "messages" ? <MessageTraceList rows={messageActivity} /> : <SystemTraceList rows={systemActivity} />}
          </section>
        </>
      )}
    </WorkspaceShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[24px] border border-brand-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-brand-ink">{value}</p>
    </article>
  );
}

function MessageTraceList({ rows }: { rows: ChatActivityLog[] }) {
  if (!rows.length) return <div className="px-6 py-12 text-center text-sm text-neutral-500">No hay mensajes registrados para este usuario.</div>;

  return (
    <div className="divide-y divide-brand-line">
      {rows.map((item) => (
        <article key={item.id} className="space-y-3 px-5 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-ink">{chatActionLabel(item.action)}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${item.status === "success" ? "bg-[#E8F7EE] text-[#146C37]" : "bg-[#FDEAEA] text-[#B42318]"}`}>
                  {item.status === "success" ? "OK" : "Error"}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {item.contactName || "Contacto sin nombre"} {item.contactPhone ? `- ${item.contactPhone}` : ""} - Chat {item.chatId}
              </p>
            </div>
            <p className="text-sm text-neutral-400">{new Date(item.createdAt).toLocaleString("es-AR")}</p>
          </div>

          {item.messageContent ? (
            <div className="rounded-[18px] border border-brand-line bg-[#FCFAF7] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Mensaje</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-brand-ink">{item.messageContent}</p>
            </div>
          ) : null}

          <div className="grid gap-2 text-sm text-neutral-600 md:grid-cols-2 xl:grid-cols-4">
            {item.templateName ? <p><span className="font-semibold text-brand-ink">Plantilla:</span> {item.templateName}</p> : null}
            {item.templateParameters ? <p><span className="font-semibold text-brand-ink">Parametros:</span> {formatTemplateParameters(item.templateParameters)}</p> : null}
            {item.fileName ? <p><span className="font-semibold text-brand-ink">Archivo:</span> {item.fileName}</p> : null}
            {item.externalMessageId ? <p><span className="font-semibold text-brand-ink">Referencia:</span> {item.externalMessageId}</p> : null}
            {item.errorMessage ? <p className="text-[#B42318] md:col-span-2 xl:col-span-4"><span className="font-semibold">Error:</span> {item.errorMessage}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function SystemTraceList({ rows }: { rows: RestaurantActivityLog[] }) {
  if (!rows.length) return <div className="px-6 py-12 text-center text-sm text-neutral-500">No hay actividad operativa registrada para este usuario.</div>;

  return (
    <div className="divide-y divide-brand-line">
      {rows.map((item) => {
        const details = metadataText(item.metadata);
        return (
          <article key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
            <div>
              <p className="font-semibold text-brand-ink">{systemActionLabel(item.action)}</p>
              <p className="mt-1 text-sm text-neutral-500">Modulo: {moduleLabel(item)}</p>
              {details.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.map((detail) => (
                    <span key={detail} className="rounded-full bg-[#FFF7F2] px-3 py-1 text-xs text-[#9A5B38]">
                      {detail}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="text-sm text-neutral-400 md:text-right">{new Date(item.createdAt).toLocaleString("es-AR")}</p>
          </article>
        );
      })}
    </div>
  );
}
