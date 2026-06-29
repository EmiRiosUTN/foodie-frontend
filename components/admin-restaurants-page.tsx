"use client";

import { Building2, Mail, Plus, UserCog, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AppModal } from "./app-modal";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

type RestaurantFormState = {
  restaurantName: string;
  slug: string;
  profileImageUrl: string;
  branchName: string;
  timezone: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const initialRestaurantForm: RestaurantFormState = {
  restaurantName: "",
  slug: "",
  profileImageUrl: "",
  branchName: "",
  timezone: "America/Argentina/Buenos_Aires",
  ownerFullName: "",
  ownerEmail: "",
  ownerPassword: ""
};

export function AdminRestaurantsPage() {
  const { currentUser, platformRestaurants, createPlatformRestaurant, uploadPlatformRestaurantProfileImage } = useWorkspace();
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormState>(initialRestaurantForm);
  const [profileUploading, setProfileUploading] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const metrics = useMemo(() => {
    return platformRestaurants.reduce(
      (acc, restaurant) => {
        acc.restaurants += 1;
        if (restaurant.isActive) acc.activeRestaurants += 1;
        acc.users += restaurant.users.length;
        acc.reservations += restaurant._count.reservations;
        acc.customers += restaurant._count.customers;
        return acc;
      },
      { restaurants: 0, activeRestaurants: 0, users: 0, reservations: 0, customers: 0 }
    );
  }, [platformRestaurants]);

  async function submitRestaurant() {
    await createPlatformRestaurant(restaurantForm);
    setRestaurantModalOpen(false);
    setRestaurantForm(initialRestaurantForm);
  }

  async function selectProfileImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setProfileUploading(true);
    try {
      const imageUrl = await uploadPlatformRestaurantProfileImage(file);
      setRestaurantForm((current) => ({ ...current, profileImageUrl: imageUrl }));
    } finally {
      setProfileUploading(false);
    }
  }

  if (currentUser?.scope !== "platform") {
    return (
      <WorkspaceShell title="Restaurantes" description="Acceso restringido para administradores de plataforma.">
        <section className="rounded-[28px] border border-brand-line bg-white p-10 text-center text-sm text-neutral-500">
          Este panel solo esta disponible para usuarios `platform_admin`.
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      title="Restaurantes"
      description="Gestiona las cuentas de restaurantes, sus owners iniciales y la fotografia operativa general de cada tenant."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Restaurantes", value: metrics.restaurants, icon: Building2 },
          { label: "Activos", value: metrics.activeRestaurants, icon: Building2 },
          { label: "Usuarios", value: metrics.users, icon: Users },
          { label: "Reservas", value: metrics.reservations, icon: UserCog },
          { label: "Clientes", value: metrics.customers, icon: Mail }
        ].map((card) => (
          <article key={card.label} className="rounded-[24px] border border-brand-line bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-500">{card.label}</p>
              <card.icon className="h-4 w-4 text-brand-orange" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-brand-ink">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-brand-line bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-brand-line px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-brand-ink">Listado de restaurantes</p>
            <p className="mt-1 text-sm text-neutral-500">Cada fila resume sucursales, usuarios, reservas y clientes acumulados.</p>
          </div>
          <button
            type="button"
            onClick={() => setRestaurantModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Crear restaurante
          </button>
        </div>

        <div className="hidden grid-cols-[minmax(0,1.2fr)_140px_140px_140px_140px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 md:grid">
          <span>Restaurante</span>
          <span>Usuarios</span>
          <span>Reservas</span>
          <span>Clientes</span>
          <span>Estado</span>
        </div>

        <div className="divide-y divide-brand-line">
          {platformRestaurants.map((restaurant) => (
            <article key={restaurant.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_140px_140px_140px_140px] md:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F4511E]">
                  {restaurant.profileImageUrl ? (
                    <img src={restaurant.profileImageUrl} alt={restaurant.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-extrabold text-white">{restaurant.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-brand-ink">{restaurant.name}</p>
                  <p className="mt-1 truncate text-sm text-neutral-500">{restaurant.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {restaurant.branches.map((branch) => (
                      <span key={branch.id} className="rounded-full border border-brand-line bg-[#FCFAF7] px-3 py-1 text-xs text-brand-ink">
                        {branch.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-brand-ink">{restaurant.users.length}</p>
              <p className="text-sm text-brand-ink">{restaurant._count.reservations}</p>
              <p className="text-sm text-brand-ink">{restaurant._count.customers}</p>
              <div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${restaurant.isActive ? "bg-[#E8F7EE] text-[#146C37]" : "bg-[#F1F1F1] text-[#5F5F5F]"}`}>
                  {restaurant.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AppModal
        open={restaurantModalOpen}
        onClose={() => {
          setRestaurantModalOpen(false);
          setRestaurantForm(initialRestaurantForm);
        }}
        title="Crear restaurante"
        description="Alta completa del tenant con su primera sucursal y usuario owner."
        widthClassName="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRestaurantModalOpen(false);
                setRestaurantForm(initialRestaurantForm);
              }}
              className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
            >
              Cancelar
            </button>
            <button type="button" onClick={() => void submitRestaurant()} className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white">
              Crear restaurante
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-white">Foto de perfil del restaurante</span>
            <div className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-orange">
                {restaurantForm.profileImageUrl ? (
                  <img src={restaurantForm.profileImageUrl} alt="Preview restaurante" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-extrabold text-white">
                    {(restaurantForm.restaurantName || "R").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  disabled={profileUploading}
                  className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-brand-orange"
                >
                  {profileUploading ? "Subiendo..." : "Subir foto"}
                </button>
                <p className="mt-2 text-xs leading-5 text-white/70">PNG, JPG o WEBP hasta 2MB. Se guarda como archivo y la base conserva solo la URL.</p>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void selectProfileImage(event.target.files?.[0])}
                />
              </div>
            </div>
          </div>
          {[
            ["restaurantName", "Nombre del restaurante"],
            ["slug", "Slug"],
            ["branchName", "Primera sucursal"],
            ["timezone", "Timezone"],
            ["ownerFullName", "Owner"],
            ["ownerEmail", "Email owner"],
            ["ownerPassword", "Password owner"]
          ].map(([key, label]) => (
            <label key={key} className={`space-y-2 text-sm text-brand-ink ${key === "ownerPassword" ? "md:col-span-2" : ""}`}>
              <span className="font-medium">{label}</span>
              <input
                type={key === "ownerPassword" ? "password" : "text"}
                value={restaurantForm[key as keyof RestaurantFormState]}
                onChange={(event) => setRestaurantForm((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={
                  key === "restaurantName"
                    ? "Ej: La Esquina de Barrio"
                    : key === "slug"
                      ? "Ej: la-esquina"
                      : key === "branchName"
                        ? "Ej: Sucursal Centro"
                        : key === "timezone"
                          ? "Ej: America/Argentina/Buenos_Aires"
                          : key === "ownerFullName"
                            ? "Ej: Owner Restaurante"
                            : key === "ownerEmail"
                              ? "Ej: owner@restaurante.com"
                              : "Minimo 4 caracteres"
                }
                className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
              />
            </label>
          ))}
        </div>
      </AppModal>
    </WorkspaceShell>
  );
}
