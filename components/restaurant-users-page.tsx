"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RestaurantStaffUser, RestaurantUserRole } from "../lib/types";
import { AppModal } from "./app-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { FoodieSelect } from "./foodie-select";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  role: RestaurantUserRole;
  isActive: boolean;
};

export const roleOptions: RestaurantUserRole[] = ["restaurant_owner", "restaurant_manager", "host", "waiter", "cashier", "kitchen"];

const initialUserForm: UserFormState = {
  fullName: "",
  email: "",
  password: "",
  role: "waiter",
  isActive: true
};

export function roleLabel(role: string) {
  switch (role) {
    case "restaurant_owner":
      return "Principal";
    case "restaurant_manager":
      return "Encargado";
    case "host":
      return "Recepcion";
    case "waiter":
      return "Mozo";
    case "cashier":
      return "Caja";
    case "kitchen":
      return "Cocina";
    default:
      return role;
  }
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function RestaurantUsersPage() {
  const router = useRouter();
  const { currentUser, loadRestaurantUsers, createRestaurantUser, updateRestaurantUser, deleteRestaurantUser } = useWorkspace();

  const [users, setUsers] = useState<RestaurantStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "">("");
  const [form, setForm] = useState<UserFormState>(initialUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RestaurantStaffUser | null>(null);

  const canManage = currentUser?.role === "restaurant_owner";

  async function loadData() {
    setLoading(true);
    try {
      setUsers(await loadRestaurantUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [canManage]);

  const metrics = useMemo(() => {
    const currentMonth = monthKey(new Date());
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      owners: users.filter((user) => user.role === "restaurant_owner").length,
      createdThisMonth: users.filter((user) => monthKey(new Date(user.createdAt)) === currentMonth).length
    };
  }, [users]);

  const roleDistribution = useMemo(() => {
    return roleOptions
      .map((role) => ({ role, count: users.filter((user) => user.role === role).length }))
      .filter((item) => item.count > 0);
  }, [users]);

  function resetModal() {
    setModalMode("");
    setEditingUserId("");
    setForm(initialUserForm);
  }

  function openCreate() {
    resetModal();
    setModalMode("create");
  }

  function openEdit(user: RestaurantStaffUser) {
    setModalMode("edit");
    setEditingUserId(user.id);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive
    });
  }

  async function submitUser() {
    if (modalMode === "create") {
      await createRestaurantUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role
      });
    } else if (editingUserId) {
      await updateRestaurantUser(editingUserId, {
        fullName: form.fullName,
        email: form.email,
        password: form.password || undefined,
        role: form.role,
        isActive: form.isActive
      });
    }

    resetModal();
    await loadData();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteRestaurantUser(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  }

  if (!canManage) {
    return (
      <WorkspaceShell title="Usuarios" description="Usuarios operativos del restaurante.">
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">
          Solo el usuario principal puede administrar usuarios.
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title="Usuarios" description="Gestiona accesos internos y consulta trazabilidad por usuario.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Usuarios" value={metrics.total} />
        <MetricCard label="Activos" value={metrics.active} />
        <MetricCard label="Inactivos" value={metrics.inactive} />
        <MetricCard label="Principales" value={metrics.owners} />
        <MetricCard label="Altas del mes" value={metrics.createdThisMonth} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-brand-line bg-white">
          <div className="flex flex-col gap-4 border-b border-brand-line px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-brand-ink">Listado de usuarios</p>
              <p className="mt-1 text-sm text-neutral-500">Hace click en una fila para ver la trazabilidad individual.</p>
            </div>
            <button onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" />
              Crear usuario
            </button>
          </div>

          {loading ? (
            <div className="px-6 py-14 text-center text-sm text-neutral-500">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF7F2] text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Usuario</th>
                    <th className="px-5 py-4 font-semibold">Rol</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 font-semibold">Alta</th>
                    <th className="px-5 py-4 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/usuarios/${user.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/usuarios/${user.id}`);
                        }
                      }}
                      className="cursor-pointer text-brand-ink transition hover:bg-[#FFF8F1]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">{user.fullName}</p>
                        <p className="mt-1 text-xs text-neutral-500">{user.email}</p>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">{roleLabel(user.role)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${user.isActive ? "bg-[#E8F7EE] text-[#146C37]" : "bg-[#F1F1F1] text-[#5F5F5F]"}`}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-neutral-500">{new Date(user.createdAt).toLocaleDateString("es-AR")}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(user);
                            }}
                            className="rounded-full border border-brand-line p-2 text-brand-ink"
                            aria-label="Editar usuario"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(user);
                            }}
                            className="rounded-full border border-[#F0C7B2] p-2 text-[#B65221] disabled:opacity-40"
                            aria-label="Eliminar usuario"
                            disabled={user.id === currentUser?.sub}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!users.length ? <div className="px-6 py-12 text-center text-sm text-neutral-500">Todavia no hay usuarios creados.</div> : null}
            </div>
          )}
        </div>

        <aside className="rounded-[28px] border border-brand-line bg-white p-5">
          <p className="text-lg font-semibold text-brand-ink">Distribucion por rol</p>
          <div className="mt-5 space-y-4">
            {roleDistribution.map((item) => (
              <div key={item.role}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-brand-ink">{roleLabel(item.role)}</span>
                  <span className="text-neutral-500">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F2ECE5]">
                  <div className="h-full rounded-full bg-brand-orange" style={{ width: `${Math.max((item.count / Math.max(users.length, 1)) * 100, 8)}%` }} />
                </div>
              </div>
            ))}
            {!roleDistribution.length ? <p className="text-sm text-neutral-500">Sin datos para mostrar.</p> : null}
          </div>
        </aside>
      </section>

      <AppModal
        open={modalMode !== ""}
        onClose={resetModal}
        title={modalMode === "create" ? "Crear usuario" : "Editar usuario"}
        description="El usuario va a poder ingresar al sistema con estas credenciales."
        widthClassName="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={resetModal} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
              Cancelar
            </button>
            <button type="button" onClick={() => void submitUser()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white">
              {modalMode === "create" ? "Crear usuario" : "Guardar cambios"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Nombre y apellido</span>
            <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="foodie-input" />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="foodie-input" />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Rol</span>
            <FoodieSelect value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as RestaurantUserRole }))}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </FoodieSelect>
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">{modalMode === "create" ? "Contrasena" : "Nueva contrasena"}</span>
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="foodie-input" placeholder={modalMode === "edit" ? "Dejar vacia para no cambiarla" : ""} />
          </label>
          {modalMode === "edit" ? (
            <label className="flex items-center gap-3 rounded-2xl border border-brand-line bg-[#FCFAF7] px-4 py-3 text-sm text-brand-ink md:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Usuario activo
            </label>
          ) : null}
        </div>
      </AppModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        description={`Vas a eliminar a ${deleteTarget?.fullName || "este usuario"}.`}
        confirmLabel="Eliminar usuario"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
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
