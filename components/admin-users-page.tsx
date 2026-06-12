"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PlatformRestaurantDetail } from "../lib/types";
import { AppModal } from "./app-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { FoodieSelect } from "./foodie-select";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  role: "restaurant_owner" | "restaurant_manager" | "host" | "waiter";
  isActive: boolean;
};

const initialUserForm: UserFormState = {
  fullName: "",
  email: "",
  password: "",
  role: "restaurant_manager",
  isActive: true
};

const roleOptions: Array<UserFormState["role"]> = [
  "restaurant_owner",
  "restaurant_manager",
  "host",
  "waiter"
];

function roleLabel(role: UserFormState["role"] | string) {
  switch (role) {
    case "restaurant_owner":
      return "Owner";
    case "restaurant_manager":
      return "Manager";
    case "host":
      return "Host";
    default:
      return "Mozo";
  }
}

export function AdminUsersPage() {
  const {
    currentUser,
    platformRestaurants,
    loadPlatformRestaurantDetail,
    createPlatformRestaurantUser,
    updatePlatformRestaurantUser,
    deletePlatformRestaurantUser
  } = useWorkspace();

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<PlatformRestaurantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit" | "">("");
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ restaurantId: string; userId: string; fullName: string } | null>(null);

  useEffect(() => {
    if (!platformRestaurants.length) {
      setSelectedRestaurantId("");
      setSelectedRestaurant(null);
      return;
    }

    if (!selectedRestaurantId || !platformRestaurants.some((restaurant) => restaurant.id === selectedRestaurantId)) {
      setSelectedRestaurantId(platformRestaurants[0].id);
    }
  }, [platformRestaurants, selectedRestaurantId]);

  useEffect(() => {
    if (!selectedRestaurantId) return;
    setDetailLoading(true);
    loadPlatformRestaurantDetail(selectedRestaurantId)
      .then(setSelectedRestaurant)
      .finally(() => setDetailLoading(false));
  }, [selectedRestaurantId]);

  const userMetrics = useMemo(() => {
    const users = selectedRestaurant?.users || [];
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      owners: users.filter((user) => user.role === "restaurant_owner").length,
      managers: users.filter((user) => user.role === "restaurant_manager").length
    };
  }, [selectedRestaurant]);

  function resetUserModal() {
    setUserModalMode("");
    setEditingUserId("");
    setUserForm(initialUserForm);
  }

  function openCreateUser() {
    resetUserModal();
    setUserModalMode("create");
  }

  function openEditUser(user: NonNullable<PlatformRestaurantDetail["users"]>[number]) {
    setEditingUserId(user.id);
    setUserModalMode("edit");
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role as UserFormState["role"],
      isActive: user.isActive
    });
  }

  async function submitUser() {
    if (!selectedRestaurant) return;

    if (userModalMode === "create") {
      await createPlatformRestaurantUser(selectedRestaurant.id, {
        fullName: userForm.fullName,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role
      });
    } else if (editingUserId) {
      await updatePlatformRestaurantUser(selectedRestaurant.id, editingUserId, {
        fullName: userForm.fullName,
        email: userForm.email,
        password: userForm.password || undefined,
        role: userForm.role,
        isActive: userForm.isActive
      });
    }

    const refreshed = await loadPlatformRestaurantDetail(selectedRestaurant.id);
    setSelectedRestaurant(refreshed);
    resetUserModal();
  }

  async function confirmDeleteUser() {
    if (!deleteTarget || !selectedRestaurant) return;
    await deletePlatformRestaurantUser(deleteTarget.restaurantId, deleteTarget.userId);
    const refreshed = await loadPlatformRestaurantDetail(selectedRestaurant.id);
    setSelectedRestaurant(refreshed);
    setDeleteTarget(null);
  }

  if (currentUser?.scope !== "platform") {
    return (
      <WorkspaceShell title="Usuarios" description="Acceso restringido para administradores de plataforma.">
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">
          Este panel solo esta disponible para usuarios `platform_admin`.
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Usuarios"
      description="Administra los usuarios operativos de cada restaurante desde una vista separada del alta de tenants."
    >
      <section className="rounded-[28px] border border-brand-line bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-end">
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Restaurante</span>
            <FoodieSelect value={selectedRestaurantId} onChange={(event) => setSelectedRestaurantId(event.target.value)}>
              {platformRestaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </FoodieSelect>
          </label>

          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-[22px] bg-[#FCFAF7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Usuarios</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{userMetrics.total}</p>
            </article>
            <article className="rounded-[22px] bg-[#FCFAF7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Activos</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{userMetrics.active}</p>
            </article>
            <article className="rounded-[22px] bg-[#FCFAF7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Owners</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{userMetrics.owners}</p>
            </article>
            <article className="rounded-[22px] bg-[#FCFAF7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Managers</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{userMetrics.managers}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-brand-line bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-brand-line px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-brand-ink">Usuarios del restaurante</p>
            <p className="mt-1 text-sm text-neutral-500">
              {selectedRestaurant ? `${selectedRestaurant.name} · ${selectedRestaurant.branches.length} sucursales` : "Selecciona un restaurante para administrar sus usuarios."}
            </p>
          </div>
          {selectedRestaurant ? (
            <button
              type="button"
              onClick={openCreateUser}
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Agregar usuario
            </button>
          ) : null}
        </div>

        {!selectedRestaurant ? (
          <div className="px-6 py-14 text-center text-sm text-neutral-500">No hay restaurante seleccionado.</div>
        ) : detailLoading ? (
          <div className="px-6 py-14 text-center text-sm text-neutral-500">Cargando usuarios...</div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.5fr)_1fr_150px_110px_120px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 md:grid">
              <span>Usuario</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Estado</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-brand-line">
              {selectedRestaurant.users.map((user) => (
                <article key={user.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_1fr_150px_110px_120px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-brand-ink">{user.fullName}</p>
                    <p className="mt-1 text-xs text-neutral-400">{new Date(user.createdAt).toLocaleDateString("es-AR")}</p>
                  </div>
                  <p className="truncate text-sm text-neutral-500">{user.email}</p>
                  <p className="text-sm text-neutral-500">{roleLabel(user.role)}</p>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${user.isActive ? "bg-[#E8F7EE] text-[#146C37]" : "bg-[#F1F1F1] text-[#5F5F5F]"}`}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditUser(user)}
                      className="rounded-full border border-brand-line p-2 text-brand-ink"
                      aria-label="Editar usuario"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ restaurantId: selectedRestaurant.id, userId: user.id, fullName: user.fullName })}
                      className="rounded-full border border-[#F0C7B2] p-2 text-[#B65221]"
                      aria-label="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
              {!selectedRestaurant.users.length ? (
                <div className="px-6 py-12 text-center text-sm text-neutral-500">Este restaurante todavia no tiene usuarios operativos.</div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <AppModal
        open={userModalMode !== ""}
        onClose={resetUserModal}
        title={userModalMode === "create" ? "Crear usuario" : "Editar usuario"}
        description="Gestiona usuarios operativos del restaurante seleccionado."
        widthClassName="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={resetUserModal} className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink">
              Cancelar
            </button>
            <button type="button" onClick={() => void submitUser()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white">
              {userModalMode === "create" ? "Crear usuario" : "Guardar cambios"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Nombre completo</span>
            <input
              value={userForm.fullName}
              onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Rol</span>
            <FoodieSelect value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserFormState["role"] }))}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </FoodieSelect>
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">{userModalMode === "create" ? "Password" : "Nueva password"}</span>
            <input
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
              placeholder={userModalMode === "edit" ? "Dejar vacia para no cambiarla" : ""}
            />
          </label>
          {userModalMode === "edit" ? (
            <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-brand-line bg-[#FCFAF7] px-4 py-3 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={userForm.isActive}
                onChange={(event) => setUserForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Usuario activo
            </label>
          ) : null}
        </div>
      </AppModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        description={`Vas a eliminar a ${deleteTarget?.fullName || "este usuario"} del restaurante seleccionado.`}
        confirmLabel="Eliminar usuario"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteUser()}
      />
    </WorkspaceShell>
  );
}
