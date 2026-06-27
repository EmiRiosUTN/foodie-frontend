"use client";

import { Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getEnabledChatModules } from "./chat/chat-module-registry";
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
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white px-4 py-2">
      <Image src="/brand/logo-primary.png" alt="Foodie AI" width={138} height={46} className="h-auto w-[138px]" />
    </div>
  );
}

function PageInfoTooltip({ description }: { description: string }) {
  if (!description) return null;

  return (
    <div className="group relative flex justify-end">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#FF5A00]/30 bg-white text-brand-orange transition hover:bg-[#FFF4ED]"
        aria-label="Informacion de la pantalla"
      >
        <Info className="h-4 w-4" />
      </button>
      <div className="pointer-events-none absolute right-0 top-10 z-30 w-[min(360px,80vw)] translate-y-1 rounded-[22px] border border-white/10 bg-[#1F1F21] px-5 py-4 text-sm leading-6 text-white opacity-0 shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        {description}
      </div>
    </div>
  );
}

function RestaurantAvatar({ image, name, size = "lg" }: { image?: string | null; name: string; size?: "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-14 w-14" : "h-12 w-12";
  const imageSize = size === "lg" ? 48 : 42;

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-orange`}>
      {image ? (
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <Image src="/brand/mark.png" alt="Foodie AI" width={imageSize} height={imageSize} className="h-10 w-10 object-contain" priority />
      )}
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
  const { bootstrap, chatSession, currentUser, feedback, userName, logout, selectedBranchId } = useWorkspace();

  const branch = bootstrap?.branches.find((item) => item.id === selectedBranchId);
  const chatNavigationItems =
    currentUser?.scope === "restaurant"
      ? getEnabledChatModules(chatSession.user).map((module) => ({
          href: module.href,
          label: module.label
        }))
      : [];
  const restaurantBaseNavigationItems =
    currentUser?.role === "restaurant_owner"
      ? [...restaurantNavigationItems, { href: "/usuarios", label: "Usuarios" }]
      : restaurantNavigationItems;
  const navigationItems = currentUser?.scope === "platform" ? platformNavigationItems : [...restaurantBaseNavigationItems, ...chatNavigationItems];
  const workspaceLabel = currentUser?.scope === "platform" ? "Administracion" : "Operacion";
  const workspaceName = currentUser?.scope === "platform" ? "Foodie AI" : bootstrap?.name || "Restaurante";
  const workspaceImage = currentUser?.scope === "restaurant" ? bootstrap?.profileImageUrl : "";

  return (
    <div className="h-screen overflow-hidden bg-black">
      <div className="grid h-screen bg-[radial-gradient(circle_at_85%_10%,rgba(0,0,0,0.85)_0,rgba(0,0,0,0.94)_31%,transparent_52%),linear-gradient(135deg,#F4511E_0%,#7A372C_42%,#050505_76%)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden h-screen overflow-hidden border-r border-white/10 bg-[#1F1F21] text-white xl:block">
          <div className="flex h-full flex-col px-10 py-14">
            <div className="flex items-center gap-4">
              <RestaurantAvatar image={workspaceImage} name={workspaceName} />
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold leading-tight text-white">{workspaceName}</p>
                <p className="mt-0.5 text-sm font-semibold italic text-white">by Foodie AI</p>
              </div>
            </div>

            <nav className="mt-12 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {navigationItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-full px-7 py-3.5 text-base font-bold transition ${
                      active ? "bg-brand-orange text-white" : "text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {currentUser?.scope === "restaurant" ? (
              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Sucursal activa</p>
                <p className="mt-2 text-sm font-semibold text-white">{branch?.name || "-"}</p>
              </div>
            ) : (
              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Acceso</p>
                <p className="mt-2 text-sm font-semibold text-white">Administrador de plataforma</p>
              </div>
            )}

            <div className="mt-6 shrink-0 rounded-[14px] bg-white px-7 py-5 text-[#1F1F21]">
              <p className="text-sm font-medium">{userName}</p>
              <button onClick={logout} className="mt-1 text-sm font-extrabold uppercase text-brand-orange hover:text-[#D64213]">
                Cerrar sesion
              </button>
              {feedback ? <StatusAlert message={feedback} /> : null}
            </div>
          </div>
        </aside>

        <main className="h-screen min-w-0 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6 md:px-8 xl:px-20 xl:py-28">
          <div className="mb-5 rounded-[26px] border border-white/10 bg-[#1F1F21] p-4 text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] xl:hidden">
            <div className="flex items-center gap-3">
              <RestaurantAvatar image={workspaceImage} name={workspaceName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-white">{workspaceName}</p>
                <p className="text-xs font-semibold italic text-white">by Foodie AI</p>
              </div>
              <button onClick={logout} className="ml-auto rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase text-brand-orange">
                Salir
              </button>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      active ? "bg-brand-orange text-white" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="min-h-[70vh] rounded-[28px] border border-white/70 bg-white p-4 shadow-[0_32px_70px_rgba(0,0,0,0.18)] sm:p-5 md:p-8 xl:rounded-[40px]">
            {hideIntro ? null : (
              <div className="grid gap-4 border-b border-brand-line pb-6 md:pb-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-brand-orange md:text-xs md:tracking-[0.5em]">{workspaceLabel}</p>
                  <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.06em] text-brand-ink md:mt-4 md:text-6xl">{title}</h1>
                </div>
                <PageInfoTooltip description={description} />
              </div>
            )}

            <div className={`${hideIntro ? "" : "mt-6"} grid gap-6`}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
