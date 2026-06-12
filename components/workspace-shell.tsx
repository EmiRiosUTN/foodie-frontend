"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusAlert } from "./status-alert";
import { useWorkspace } from "./workspace-provider";

const restaurantNavigationItems = [
  { href: "/panel", label: "Panel" },
  { href: "/chat", label: "Chat" },
  { href: "/salon", label: "Salon" },
  { href: "/reservas", label: "Reservas" },
  { href: "/clientes", label: "Clientes" }
];

const platformNavigationItems = [
  { href: "/admin", label: "Restaurantes" },
  { href: "/admin/users", label: "Usuarios" }
];

export function WorkspaceHeaderBrand() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-brand-line bg-white px-4 py-2">
      <Image src="/brand/logo-primary.png" alt="Foodie AI" width={118} height={28} />
    </div>
  );
}

export function WorkspaceShell({
  children,
  title,
  description,
  hideIntro = false
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  hideIntro?: boolean;
}) {
  const pathname = usePathname();
  const {
    bootstrap,
    currentUser,
    feedback,
    userName,
    logout,
    selectedBranchId
  } = useWorkspace();

  const branch = bootstrap?.branches.find((item) => item.id === selectedBranchId);
  const navigationItems = currentUser?.scope === "platform" ? platformNavigationItems : restaurantNavigationItems;
  const workspaceLabel = currentUser?.scope === "platform" ? "Administracion" : "Operacion";
  const workspaceName = currentUser?.scope === "platform" ? "Foodie AI" : bootstrap?.name || "Restaurante";

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-cloud">
      <div className="grid min-h-screen xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="border-r border-brand-line bg-white">
          <div className="sticky top-0 flex min-h-screen flex-col px-6 py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3EC]">
                <Image src="/brand/mark.png" alt="Foodie mark" width={34} height={34} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-orange">Foodie AI</p>
                <p className="text-sm font-medium text-brand-ink">{workspaceName}</p>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {navigationItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-r-[22px] rounded-l-none border-l-4 px-5 py-3 text-sm font-medium transition ${
                      active
                        ? "border-brand-orange bg-[#FFF4ED] text-brand-ink"
                        : "border-transparent text-neutral-600 hover:bg-[#FFF7F2] hover:text-brand-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {currentUser?.scope === "restaurant" ? (
              <div className="mt-8 rounded-[24px] border border-brand-line bg-[#FFF7F2] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Sucursal activa</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">{branch?.name || "-"}</p>
              </div>
            ) : (
              <div className="mt-8 rounded-[24px] border border-brand-line bg-[#FFF7F2] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Acceso</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">Administrador de plataforma</p>
              </div>
            )}

            <div className="mt-auto rounded-[24px] border border-brand-line bg-[#1F1F21] p-4 text-white">
              <p className="text-sm font-medium">{userName}</p>
              <button onClick={logout} className="mt-2 text-xs uppercase tracking-[0.18em] text-[#FFB088] hover:text-white">
                Cerrar sesion
              </button>
              {feedback ? <StatusAlert message={feedback} /> : null}
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-6 py-6 md:px-8 xl:px-10">
          <div className="rounded-[30px] border border-brand-line bg-white/85 p-6 shadow-[0_18px_45px_rgba(31,31,33,0.06)] md:p-8">
            {hideIntro ? null : (
              <div className="grid gap-4 border-b border-brand-line pb-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-orange">{workspaceLabel}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-ink md:text-5xl">{title}</h1>
                </div>
                <p className="max-w-md text-sm leading-7 text-neutral-500">{description}</p>
              </div>
            )}

            <div className={`${hideIntro ? "" : "mt-6"} grid gap-6`}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
