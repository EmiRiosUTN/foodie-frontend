"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RestaurantUserRole } from "../lib/types";

type RolePermissionInfo = {
  label: string;
  description: string;
};

export const restaurantRolePermissions: Record<RestaurantUserRole, RolePermissionInfo> = {
  restaurant_owner: {
    label: "Principal",
    description: "Acceso operativo completo. Administra usuarios, configuración y reservas online."
  },
  restaurant_manager: {
    label: "Encargado",
    description: "Accede a los módulos operativos y puede gestionar el plano del salón."
  },
  host: {
    label: "Recepción",
    description: "Accede a los módulos operativos. No administra usuarios, configuración ni el plano del salón."
  },
  waiter: {
    label: "Mozo",
    description: "Accede a los módulos operativos. No administra usuarios, configuración ni el plano del salón."
  },
  cashier: {
    label: "Caja",
    description: "Accede a los módulos operativos. No administra usuarios, configuración ni el plano del salón."
  },
  kitchen: {
    label: "Cocina",
    description: "Accede a los módulos operativos. No administra usuarios, configuración ni el plano del salón."
  },
  events: {
    label: "Eventos",
    description: "Tiene los mismos permisos que Recepción. En Chat sólo ve conversaciones con la etiqueta Evento."
  }
};

export function restaurantRoleLabel(role: string) {
  return restaurantRolePermissions[role as RestaurantUserRole]?.label || role;
}

export function RolePermissionsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const margin = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    const placeBelow = spaceBelow >= panelRect.height || spaceBelow >= spaceAbove;
    const desiredTop = placeBelow ? triggerRect.bottom + gap : triggerRect.top - panelRect.height - gap;
    const top = panelRect.height <= window.innerHeight - margin * 2 ? Math.max(margin, Math.min(desiredTop, window.innerHeight - panelRect.height - margin)) : margin;
    const left = Math.max(margin, Math.min(triggerRect.left, window.innerWidth - panelRect.width - margin));

    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("keydown", onEscape, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("keydown", onEscape, true);
    };
  }, [isOpen]);

  return (
    <span className="inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) setPosition(null);
          setIsOpen((current) => !current);
        }}
        aria-label="Consultar permisos de los roles"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-orange/30 text-brand-orange transition hover:bg-[#FFF4ED] focus:outline-none focus:ring-4 focus:ring-[#FF5A00]/10"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="Permisos por rol"
              style={{ top: position?.top, left: position?.left, visibility: position ? "visible" : "hidden" }}
              className="fixed z-[60] w-[min(360px,calc(100vw-24px))] rounded-[20px] border border-brand-line bg-white p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-brand-ink">Permisos por rol</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-neutral-400 transition hover:bg-[#FFF4ED] hover:text-brand-orange focus:outline-none focus:ring-4 focus:ring-[#FF5A00]/10"
                  aria-label="Cerrar permisos por rol"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid gap-3">
                {(Object.keys(restaurantRolePermissions) as RestaurantUserRole[]).map((role) => {
                  const info = restaurantRolePermissions[role];
                  return (
                    <div key={role}>
                      <p className="text-sm font-semibold text-brand-ink">{info.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-neutral-500">{info.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
