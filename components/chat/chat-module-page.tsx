"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { chatApi } from "./chat-api";
import { getChatModuleDefinition, isChatModuleAllowed } from "./chat-module-registry";
import { ChatAuthProvider } from "./chat-auth";
import { ChatAdvisorsModule } from "./chat-advisors-module";
import { ChatAssistantModule } from "./chat-assistant-module";
import { ChatCampaignsModule } from "./chat-campaigns-module";
import { ChatWhatsAppCampaignsModule } from "./chat-whatsapp-campaigns-module";
import { ChatProvider } from "./chat-context";
import { ChatDashboard } from "./chat-dashboard";
import { useWorkspace } from "../workspace-provider";
import { WorkspaceShell } from "../workspace-shell";

type ModuleState = {
  loading: boolean;
  error: string;
  data: unknown;
};

const emptyState: ModuleState = {
  loading: true,
  error: "",
  data: null
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.campaigns)) return record.campaigns;
  if (Array.isArray(record.templates)) return record.templates;
  if (Array.isArray(record.metrics)) return record.metrics;
  return [];
}

function ValueCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-brand-line bg-white p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{value}</p>
    </div>
  );
}

function ChatModuleDataView({ moduleKey, data }: { moduleKey: string; data: unknown }) {
  const list = getArray(data);
  const record = asRecord(data);

  if (moduleKey === "campaigns") {
    const stats = asRecord(record.stats || record);
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <ValueCard label="Campañas" value={String(stats.totalCampaigns ?? list.length)} />
          <ValueCard label="Enviadas" value={String(stats.sentCampaigns ?? stats.sent ?? "-")} />
          <ValueCard label="Borradores" value={String(stats.draftCampaigns ?? stats.draft ?? "-")} />
        </div>
        <DataTable
          columns={["Nombre", "Estado", "Destinatarios", "Creada"]}
          rows={list.map((item) => {
            const campaign = asRecord(item);
            return [
              String(campaign.name ?? "-"),
              String(campaign.status ?? "-"),
              String(campaign.totalRecipients ?? campaign.recipientsCount ?? "-"),
              String(campaign.createdAt ? new Date(String(campaign.createdAt)).toLocaleDateString("es-AR") : "-")
            ];
          })}
          emptyLabel="No hay campañas para mostrar."
        />
      </div>
    );
  }

  if (moduleKey === "advisors") {
    const stats = asRecord(record.stats || {});
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <ValueCard label="Asesores" value={String(stats.totalAdvisors ?? list.length)} />
          <ValueCard label="Activos" value={String(stats.activeAdvisors ?? list.filter((item) => asRecord(item).active).length)} />
          <ValueCard label="Módulo" value={stats.moduleEnabled === false ? "Off" : "On"} />
        </div>
        <DataTable
          columns={["Nombre", "Email", "Teléfono", "Estado"]}
          rows={list.map((item) => {
            const advisor = asRecord(item);
            return [
              String(advisor.name ?? "-"),
              String(advisor.email ?? "-"),
              String(advisor.phone ?? "-"),
              advisor.active === false ? "Inactivo" : "Activo"
            ];
          })}
          emptyLabel="No hay asesores para mostrar."
        />
      </div>
    );
  }

  if (moduleKey === "templates") {
    return (
      <DataTable
        columns={["Plantilla", "Categoría", "Idioma", "Estado"]}
        rows={list.map((item) => {
          const template = asRecord(item);
          return [
            String(template.name ?? "-"),
            String(template.category ?? "-"),
            String(template.language ?? "-"),
            String(template.status ?? "-")
          ];
        })}
        emptyLabel="No hay plantillas para mostrar."
      />
    );
  }

  if (moduleKey === "advisorMetrics") {
    return (
      <DataTable
        columns={["Asesor", "Email", "Chats", "Chats etiquetados"]}
        rows={list.map((item) => {
          const metric = asRecord(item);
          return [
            String(metric.advisorName ?? "-"),
            String(metric.advisorEmail ?? "-"),
            String(metric.totalChats ?? "-"),
            String(metric.taggedChats ?? "-")
          ];
        })}
        emptyLabel="No hay métricas para mostrar."
      />
    );
  }

  return (
    <div className="rounded-[28px] border border-brand-line bg-white p-8">
      <p className="text-sm font-semibold text-brand-ink">Módulo habilitado</p>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-500">
        Este módulo está activo en chat.pupuia.com. Falta adaptar su pantalla específica a Foodie.
      </p>
    </div>
  );
}

function DataTable({ columns, rows, emptyLabel }: { columns: string[]; rows: React.ReactNode[][]; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-brand-line bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="text-brand-ink">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-8 text-center text-neutral-500" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function loadModuleData(moduleKey: string) {
  if (moduleKey === "campaigns") {
    const [campaigns, stats] = await Promise.all([
      chatApi.get("/campaigns", { params: { limit: 25 } }),
      chatApi.get("/campaigns/stats").catch(() => ({ data: {} }))
    ]);
    return { ...campaigns.data, stats: stats.data };
  }

  if (moduleKey === "advisors") {
    const [advisors, stats] = await Promise.all([
      chatApi.get("/advisors"),
      chatApi.get("/advisors/stats").catch(() => ({ data: { data: {} } }))
    ]);
    return { data: advisors.data.data || [], stats: stats.data.data || {} };
  }

  if (moduleKey === "templates") {
    const response = await chatApi.get("/templates");
    return response.data;
  }

  if (moduleKey === "advisorMetrics") {
    const response = await chatApi.get("/advisor-metrics");
    return response.data;
  }

  return null;
}

export function ChatModulePage({ moduleKey }: { moduleKey: string }) {
  const router = useRouter();
  const { chatSession } = useWorkspace();
  const module = useMemo(() => getChatModuleDefinition(moduleKey), [moduleKey]);
  const allowed = isChatModuleAllowed(moduleKey, chatSession.user);
  const [state, setState] = useState<ModuleState>(emptyState);

  useEffect(() => {
    if (!chatSession.token || !allowed) {
      setState({ loading: false, error: "", data: null });
      return;
    }

    if (moduleKey === "campaigns" || moduleKey === "whatsappCampaigns" || moduleKey === "advisors" || moduleKey === "assistant") {
      setState({ loading: false, error: "", data: null });
      return;
    }

    let cancelled = false;
    setState(emptyState);
    loadModuleData(moduleKey)
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: "", data });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "No se pudo cargar el módulo",
            data: null
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [allowed, chatSession.token, moduleKey]);

  if (moduleKey === "dashboard") {
    return (
      <WorkspaceShell title="Chat y WhatsApp." description="Opera conversaciones, control manual, etiquetas y exportación.">
        <ChatAuthProvider>
          <ChatProvider>
            <ChatDashboard />
          </ChatProvider>
        </ChatAuthProvider>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title={module.label} description={module.description}>
      {!chatSession.token ? (
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Sesión requerida</p>
          <p className="mt-3 text-2xl font-semibold text-brand-ink">No hay sesión activa contra chat.pupuia.com</p>
        </section>
      ) : !allowed ? (
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Módulo deshabilitado</p>
          <p className="mt-3 text-2xl font-semibold text-brand-ink">Este módulo no está habilitado para este cliente.</p>
          <button
            onClick={() => router.replace("/chat")}
            className="mt-6 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white"
          >
            Volver al chat
          </button>
        </section>
      ) : state.loading ? (
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">
          Cargando módulo...
        </section>
      ) : state.error ? (
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Error del módulo</p>
          <p className="mt-3 text-sm text-neutral-500">{state.error}</p>
        </section>
      ) : moduleKey === "campaigns" ? (
        <ChatCampaignsModule />
      ) : moduleKey === "whatsappCampaigns" ? (
        <ChatWhatsAppCampaignsModule />
      ) : moduleKey === "advisors" ? (
        <ChatAdvisorsModule />
      ) : moduleKey === "assistant" ? (
        <ChatAssistantModule />
      ) : (
        <ChatModuleDataView moduleKey={moduleKey} data={state.data} />
      )}
    </WorkspaceShell>
  );
}
