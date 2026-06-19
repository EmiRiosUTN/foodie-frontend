"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { chatApi } from "./chat-api";
import { chatCustomTableService, type ChatCustomTable } from "./chat-custom-table-service";
import { useWorkspace } from "../workspace-provider";

type Advisor = {
  _id: string;
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdvisorConfig = {
  _id: string;
  clientId: string;
  enabled: boolean;
};

type AdvisorAssignment = {
  _id: string;
  advisorId: Advisor;
  tableId: string;
  position: number;
};

type AdvisorForm = {
  name: string;
  email: string;
  phone: string;
};

const emptyAdvisorForm: AdvisorForm = {
  name: "",
  email: "",
  phone: ""
};

async function getConfig() {
  const response = await chatApi.get("/advisors/config");
  return response.data.data as AdvisorConfig;
}

async function updateConfig(enabled: boolean) {
  const response = await chatApi.put("/advisors/config", { enabled });
  return response.data.data as AdvisorConfig;
}

async function getAdvisors() {
  const response = await chatApi.get("/advisors");
  return response.data.data as Advisor[];
}

async function createAdvisor(data: AdvisorForm) {
  const response = await chatApi.post("/advisors", {
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined
  });
  return response.data.data as Advisor;
}

async function updateAdvisor(id: string, data: Partial<AdvisorForm> & { active?: boolean }) {
  const response = await chatApi.put(`/advisors/${id}`, data);
  return response.data.data as Advisor;
}

async function deleteAdvisor(id: string) {
  await chatApi.delete(`/advisors/${id}`);
}

async function getTableAssignments(tableId: string) {
  const response = await chatApi.get(`/advisors/assignments/${tableId}`);
  return response.data.data as AdvisorAssignment[];
}

async function assignToTable(advisorId: string, tableId: string) {
  const response = await chatApi.post("/advisors/assignments", { advisorId, tableId });
  return response.data.data as AdvisorAssignment;
}

async function removeAssignment(assignmentId: string) {
  await chatApi.delete(`/advisors/assignments/${assignmentId}`);
}

export function ChatAdvisorsModule() {
  const { chatSession } = useWorkspace();
  const [config, setConfig] = useState<AdvisorConfig | null>(null);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [tables, setTables] = useState<ChatCustomTable[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AdvisorAssignment[]>>({});
  const [activeTab, setActiveTab] = useState<"advisors" | "assignments">("advisors");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [advisorForm, setAdvisorForm] = useState<AdvisorForm>(emptyAdvisorForm);
  const [confirmDelete, setConfirmDelete] = useState<Advisor | null>(null);
  const [selectedTable, setSelectedTable] = useState<ChatCustomTable | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState("");

  async function loadData() {
    setLoading(true);
    setFeedback("");
    try {
      const [configData, advisorData, tableData] = await Promise.all([
        getConfig(),
        getAdvisors(),
        chatCustomTableService.getTables(chatSession.user?.clientId)
      ]);
      const assignmentEntries = await Promise.all(
        tableData.map(async (table) => [table._id, await getTableAssignments(table._id)] as const)
      );
      setConfig(configData);
      setAdvisors(advisorData);
      setTables(tableData);
      setAssignments(Object.fromEntries(assignmentEntries));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar asesores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreateAdvisor() {
    setEditingAdvisor(null);
    setAdvisorForm(emptyAdvisorForm);
  }

  function openEditAdvisor(advisor: Advisor) {
    setEditingAdvisor(advisor);
    setAdvisorForm({
      name: advisor.name,
      email: advisor.email || "",
      phone: advisor.phone || ""
    });
  }

  async function saveAdvisor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!advisorForm.name.trim()) return;
    try {
      if (editingAdvisor) {
        await updateAdvisor(editingAdvisor._id, advisorForm);
        setFeedback("Asesor actualizado");
      } else {
        await createAdvisor(advisorForm);
        setFeedback("Asesor creado");
      }
      setEditingAdvisor(null);
      setAdvisorForm(emptyAdvisorForm);
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar el asesor");
    }
  }

  async function toggleModule() {
    if (!config) return;
    try {
      const updated = await updateConfig(!config.enabled);
      setConfig(updated);
      setFeedback(updated.enabled ? "Módulo habilitado" : "Módulo deshabilitado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el módulo");
    }
  }

  async function toggleAdvisorActive(advisor: Advisor) {
    try {
      await updateAdvisor(advisor._id, { active: !advisor.active });
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el estado");
    }
  }

  async function confirmDeleteAdvisor() {
    if (!confirmDelete) return;
    try {
      await deleteAdvisor(confirmDelete._id);
      setConfirmDelete(null);
      setFeedback("Asesor eliminado");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar el asesor");
    }
  }

  async function saveAssignment() {
    if (!selectedTable || !selectedAdvisorId) return;
    try {
      await assignToTable(selectedAdvisorId, selectedTable._id);
      setSelectedTable(null);
      setSelectedAdvisorId("");
      setFeedback("Asesor asignado");
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo asignar el asesor");
    }
  }

  async function deleteAssignment(assignmentId: string) {
    try {
      await removeAssignment(assignmentId);
      await loadData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo quitar la asignación");
    }
  }

  if (loading) {
    return <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">Cargando asesores...</div>;
  }

  const availableAdvisors = selectedTable
    ? advisors.filter((advisor) => !(assignments[selectedTable._id] || []).some((assignment) => assignment.advisorId._id === advisor._id))
    : advisors;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-brand-line bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">Configuración del módulo</p>
          <p className="mt-2 text-lg font-semibold text-brand-ink">
            Asignación automática {config?.enabled ? "habilitada" : "deshabilitada"}
          </p>
        </div>
        <button
          onClick={toggleModule}
          className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
            config?.enabled ? "bg-[#E9F8EF] text-[#137A3F]" : "bg-[#FFF4ED] text-brand-orange"
          }`}
        >
          {config?.enabled ? "Deshabilitar" : "Habilitar"}
        </button>
      </div>

      {feedback ? <div className="rounded-[20px] border border-brand-line bg-[#FFF7F2] px-5 py-3 text-sm text-brand-ink">{feedback}</div> : null}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("advisors")}
          className={`rounded-full px-5 py-3 text-sm font-semibold ${activeTab === "advisors" ? "bg-brand-ink text-white" : "bg-white text-brand-ink"}`}
        >
          Asesores ({advisors.length})
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`rounded-full px-5 py-3 text-sm font-semibold ${activeTab === "assignments" ? "bg-brand-ink text-white" : "bg-white text-brand-ink"}`}
        >
          Asignaciones
        </button>
      </div>

      {activeTab === "advisors" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="overflow-hidden rounded-[28px] border border-brand-line bg-white">
            <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
              <p className="font-semibold text-brand-ink">Lista de asesores</p>
              <button onClick={openCreateAdvisor} className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" />
                Nuevo asesor
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4">Nombre</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Teléfono</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line">
                  {advisors.map((advisor) => (
                    <tr key={advisor._id}>
                      <td className="px-5 py-4 font-semibold text-brand-ink">{advisor.name}</td>
                      <td className="px-5 py-4 text-neutral-600">{advisor.email || "-"}</td>
                      <td className="px-5 py-4 text-neutral-600">{advisor.phone || "-"}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleAdvisorActive(advisor)} className="inline-flex items-center gap-2 rounded-full bg-[#F7F4EF] px-3 py-1 text-xs font-semibold text-brand-ink">
                          {advisor.active ? <UserCheck className="h-3 w-3 text-[#137A3F]" /> : <UserX className="h-3 w-3 text-neutral-400" />}
                          {advisor.active ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditAdvisor(advisor)} className="rounded-full border border-brand-line px-3 py-1 text-xs font-semibold text-brand-ink">
                            Editar
                          </button>
                          <button onClick={() => setConfirmDelete(advisor)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!advisors.length ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                        No hay asesores creados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={saveAdvisor} className="rounded-[28px] border border-brand-line bg-white p-5">
            <p className="text-lg font-semibold text-brand-ink">{editingAdvisor ? "Editar asesor" : "Nuevo asesor"}</p>
            <div className="mt-5 grid gap-4">
              <input className="foodie-input" placeholder="Nombre" value={advisorForm.name} onChange={(event) => setAdvisorForm({ ...advisorForm, name: event.target.value })} />
              <input className="foodie-input" placeholder="Email" value={advisorForm.email} onChange={(event) => setAdvisorForm({ ...advisorForm, email: event.target.value })} />
              <input className="foodie-input" placeholder="Teléfono" value={advisorForm.phone} onChange={(event) => setAdvisorForm({ ...advisorForm, phone: event.target.value })} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white">
                  Guardar
                </button>
                {editingAdvisor ? (
                  <button type="button" onClick={() => setEditingAdvisor(null)} className="rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink">
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid gap-4">
          {tables.map((table) => {
            const tableAssignments = assignments[table._id] || [];
            return (
              <div key={table._id} className="rounded-[28px] border border-brand-line bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-brand-ink">{table.tableName}</p>
                    <p className="text-sm text-neutral-500">{tableAssignments.length} asesor(es) asignado(s)</p>
                  </div>
                  <button onClick={() => setSelectedTable(table)} className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white">
                    <UserPlus className="h-4 w-4" />
                    Asignar asesor
                  </button>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {tableAssignments.map((assignment) => (
                    <div key={assignment._id} className="flex items-center justify-between rounded-[18px] bg-[#F7F4EF] px-4 py-3">
                      <span className="text-sm font-semibold text-brand-ink">{assignment.advisorId.name}</span>
                      <button onClick={() => deleteAssignment(assignment._id)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!tables.length ? <div className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-neutral-500">No hay tablas disponibles en el chat.</div> : null}
        </div>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <p className="text-xl font-semibold text-brand-ink">Eliminar asesor</p>
            <p className="mt-3 text-sm text-neutral-500">¿Seguro que querés eliminar a {confirmDelete.name}?</p>
            <div className="mt-6 flex gap-3">
              <button onClick={confirmDeleteAdvisor} className="flex-1 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white">Eliminar</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-full border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink">Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTable ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-semibold text-brand-ink">Asignar asesor</p>
                <p className="mt-1 text-sm text-neutral-500">{selectedTable.tableName}</p>
              </div>
              <button onClick={() => setSelectedTable(null)}><X className="h-5 w-5" /></button>
            </div>
            <select className="foodie-input mt-5" value={selectedAdvisorId} onChange={(event) => setSelectedAdvisorId(event.target.value)}>
              <option value="">Seleccionar asesor</option>
              {availableAdvisors.map((advisor) => (
                <option key={advisor._id} value={advisor._id}>
                  {advisor.name} {!advisor.active ? "(inactivo)" : ""}
                </option>
              ))}
            </select>
            <button onClick={saveAssignment} disabled={!selectedAdvisorId} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
              <CheckCircle2 className="h-4 w-4" />
              Asignar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
