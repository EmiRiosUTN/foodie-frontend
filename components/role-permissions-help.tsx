"use client";

import { Info, X } from "lucide-react";
import { useId, useState } from "react";
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
  }
};

export function restaurantRoleLabel(role: string) {
  return restaurantRolePermissions[role as RestaurantUserRole]?.label || role;
}

export function RolePermissionsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        aria-label="Consultar permisos de los roles"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-orange/30 text-brand-orange transition hover:bg-[#FFF4ED] focus:outline-none focus:ring-4 focus:ring-[#FF5A00]/10"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {isOpen ? (
        <span
          id={panelId}
          role="dialog"
          aria-label="Permisos por rol"
          className="absolute left-0 top-full z-30 mt-2 block w-[min(360px,calc(100vw-3rem))] rounded-[20px] border border-brand-line bg-white p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
        >
          <span className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-brand-ink">Permisos por rol</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-neutral-400 transition hover:bg-[#FFF4ED] hover:text-brand-orange focus:outline-none focus:ring-4 focus:ring-[#FF5A00]/10"
              aria-label="Cerrar permisos por rol"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
          <span className="grid gap-3">
            {(Object.keys(restaurantRolePermissions) as RestaurantUserRole[]).map((role) => {
              const info = restaurantRolePermissions[role];
              return (
                <span key={role} className="block">
                  <span className="block text-sm font-semibold text-brand-ink">{info.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{info.description}</span>
                </span>
              );
            })}
          </span>
        </span>
      ) : null}
    </span>
  );
}
