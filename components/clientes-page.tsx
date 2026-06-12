"use client";

import { CalendarDays, Mail, Pencil, Phone, Plus, Tag, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Customer, CustomerDetail } from "../lib/types";
import { AppModal } from "./app-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

type CustomerFormState = {
  fullName: string;
  phone: string;
  email: string;
  birthday: string;
  notes: string;
  tagsText: string;
};

const emptyForm: CustomerFormState = {
  fullName: "",
  phone: "",
  email: "",
  birthday: "",
  notes: "",
  tagsText: ""
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return value.slice(0, 10);
}

function toFormState(customer?: Customer | CustomerDetail | null): CustomerFormState {
  if (!customer) return emptyForm;
  return {
    fullName: customer.fullName || "",
    phone: customer.phone || "",
    email: customer.email || "",
    birthday: customer.birthday ? customer.birthday.slice(0, 10) : "",
    notes: customer.notes || "",
    tagsText: customer.tags.map((tag) => tag.label).join(", ")
  };
}

export function ClientesPage() {
  const { customers, createCustomer, updateCustomer, deleteCustomer, loadCustomerDetail } = useWorkspace();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((left, right) => {
        if (right.reservationCount !== left.reservationCount) {
          return right.reservationCount - left.reservationCount;
        }
        return left.fullName.localeCompare(right.fullName);
      }),
    [customers]
  );

  useEffect(() => {
    if (!selectedCustomerId || !detailOpen) return;
    setIsLoadingDetail(true);
    loadCustomerDetail(selectedCustomerId)
      .then((customer) => setDetail(customer))
      .finally(() => setIsLoadingDetail(false));
  }, [detailOpen, loadCustomerDetail, selectedCustomerId]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm(toFormState(customer));
    setFormOpen(true);
  };

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setDetail(customer as CustomerDetail);
    setDetailOpen(true);
  };

  const handleSubmit = async () => {
    const tags = form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      birthday: form.birthday || null,
      notes: form.notes.trim() || null,
      tags
    };

    setIsSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
      } else {
        await createCustomer(payload);
      }
      setFormOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      if (selectedCustomerId && detailOpen) {
        const refreshed = await loadCustomerDetail(selectedCustomerId);
        setDetail(refreshed);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCustomer(deleteTarget.id);
    if (selectedCustomerId === deleteTarget.id) {
      setDetailOpen(false);
      setSelectedCustomerId(null);
      setDetail(null);
    }
    setDeleteTarget(null);
  };

  return (
    <WorkspaceShell
      title="Clientes"
      description="Administra la base de clientes del restaurante con una vista clara, historial y acciones rapidas."
    >
      <section className="overflow-hidden rounded-[26px] border border-brand-line bg-white">
        <div className="flex flex-col gap-4 border-b border-brand-line px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-orange">Base de clientes</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-brand-ink">Listado de clientes</h2>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Agregar cliente
          </button>
        </div>

        {sortedCustomers.length ? (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[minmax(0,2.2fr)_1.3fr_0.8fr_1fr_132px] gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                <span>Cliente</span>
                <span>Contacto</span>
                <span>Reservas</span>
                <span>Ultima actividad</span>
                <span className="text-right">Acciones</span>
              </div>
              <div className="divide-y divide-brand-line">
                {sortedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetailModal(customer)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetailModal(customer);
                      }
                    }}
                    className="grid cursor-pointer grid-cols-[minmax(0,2.2fr)_1.3fr_0.8fr_1fr_132px] gap-4 px-6 py-4 transition hover:bg-[#FFFBF8]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">{customer.fullName}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customer.tags.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="rounded-full bg-[#FFF0E7] px-2.5 py-1 text-[11px] font-medium text-[#C7652C]">
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0 text-sm text-neutral-500">
                      <p className="truncate">{customer.email || "-"}</p>
                      <p className="truncate">{customer.phone || "-"}</p>
                    </div>
                    <div className="text-sm font-semibold text-brand-ink">{customer.reservationCount}</div>
                    <div className="text-sm text-neutral-500">{customer.reservations[0] ? formatDate(customer.reservations[0].serviceDate) : "Sin historial"}</div>
                    <div className="flex items-start justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="rounded-full border border-brand-line p-2 text-neutral-500 transition hover:text-brand-ink"
                        aria-label={`Editar ${customer.fullName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(customer)}
                        className="rounded-full border border-[#F0C7B2] bg-[#FFF1EA] p-2 text-[#B65221] transition hover:bg-[#FFE4D6]"
                        aria-label={`Eliminar ${customer.fullName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-brand-line md:hidden">
              {sortedCustomers.map((customer) => (
                <div key={customer.id} className="px-5 py-4">
                  <button type="button" onClick={() => openDetailModal(customer)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-brand-ink">{customer.fullName}</p>
                        <p className="mt-1 truncate text-sm text-neutral-500">{customer.email || customer.phone || "Sin contacto"}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-400">Reservas: {customer.reservationCount}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-neutral-400">
                        {customer.reservations[0] ? formatDate(customer.reservations[0].serviceDate) : "Sin historial"}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {customer.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="rounded-full bg-[#FFF0E7] px-2.5 py-1 text-[11px] font-medium text-[#C7652C]">
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </button>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(customer)}
                      className="flex-1 rounded-full border border-brand-line px-4 py-2.5 text-sm font-medium text-brand-ink"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(customer)}
                      className="flex-1 rounded-full bg-[#FFF1EA] px-4 py-2.5 text-sm font-medium text-[#B65221]"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF4ED] text-brand-orange">
              <UserRound className="h-7 w-7" />
            </div>
            <p className="mt-5 text-lg font-semibold text-brand-ink">Todavia no hay clientes cargados</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-neutral-500">
              Cuando quieras registrar un cliente manualmente o completar su perfil, hacelo desde el alta por modal.
            </p>
          </div>
        )}
      </section>

      <AppModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCustomer(null);
          setForm(emptyForm);
        }}
        title={editingCustomer ? "Editar cliente" : "Agregar cliente"}
        description={editingCustomer ? "Actualiza los datos del cliente seleccionado." : "Crea un cliente nuevo sin necesidad de una reserva previa."}
        widthClassName="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingCustomer(null);
                setForm(emptyForm);
              }}
              className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving || !form.fullName.trim()}
              className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : editingCustomer ? "Guardar cambios" : "Crear cliente"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Nombre completo</span>
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Telefono</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink">
            <span className="font-medium">Cumpleanos</span>
            <input
              type="date"
              value={form.birthday}
              onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink md:col-span-2">
            <span className="font-medium">Tags</span>
            <input
              value={form.tagsText}
              onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))}
              placeholder="VIP, cumple, ventana"
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-ink md:col-span-2">
            <span className="font-medium">Notas</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 outline-none focus:border-brand-orange"
            />
          </label>
        </div>
      </AppModal>

      <AppModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
          setSelectedCustomerId(null);
        }}
        title={detail?.fullName || "Detalle de cliente"}
        description="Historial, contacto y atributos del cliente seleccionado."
        widthClassName="max-w-4xl"
        footer={
          detail ? (
            <>
              <button
                type="button"
                onClick={() => detail && openEditModal(detail)}
                className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(detail);
                  setDetailOpen(false);
                }}
                className="flex-1 rounded-full bg-[#FFF1EA] px-4 py-3 text-sm font-medium text-[#B65221]"
              >
                Eliminar
              </button>
            </>
          ) : undefined
        }
      >
        {isLoadingDetail ? (
          <div className="py-10 text-center text-sm text-neutral-500">Cargando detalle...</div>
        ) : detail ? (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[24px] bg-[#FCFAF7] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Ficha</p>
                <div className="mt-4 space-y-3 text-sm text-neutral-600">
                  <p className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-brand-orange" />
                    {detail.phone || "Sin telefono"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-brand-orange" />
                    {detail.email || "Sin email"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-brand-orange" />
                    {detail.birthday ? formatDate(detail.birthday) : "Sin cumpleanos"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-brand-orange" />
                    Reservas historicas: {detail.reservationCount}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] bg-[#FCFAF7] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Tags</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.tags.length ? (
                    detail.tags.map((tag) => (
                      <span key={tag.id} className="rounded-full bg-[#FFF0E7] px-3 py-1 text-xs font-medium text-[#C7652C]">
                        {tag.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">Sin tags</span>
                  )}
                </div>
              </div>

              {detail.notes ? (
                <div className="rounded-[24px] bg-[#FCFAF7] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Notas</p>
                  <p className="mt-4 text-sm leading-7 text-neutral-600">{detail.notes}</p>
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-brand-orange" />
                <p className="text-sm font-semibold text-brand-ink">Historial de reservas</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-brand-line">
                {detail.reservations.length ? (
                  <div className="divide-y divide-brand-line">
                    {detail.reservations.map((reservation) => (
                      <div key={reservation.id} className="grid gap-3 px-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_120px] md:items-center">
                        <div>
                          <p className="text-sm font-semibold text-brand-ink">{reservation.code}</p>
                          <p className="text-xs text-neutral-400">{formatDate(reservation.serviceDate)}</p>
                        </div>
                        <div className="min-w-0 text-sm text-neutral-600">
                          <p className="truncate">{reservation.room?.name || "Salon sin nombre"}</p>
                          <p className="truncate text-xs text-neutral-400">
                            {reservation.tables?.map((item) => item.table.label).join(", ") || "Sin mesas"}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-neutral-500 md:text-right">{reservation.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-neutral-500">Este cliente todavia no tiene historial de reservas.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AppModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar cliente"
        description={`Se va a eliminar a ${deleteTarget?.fullName || "este cliente"}. Las reservas existentes conservaran sus datos historicos, pero la ficha dejara de estar disponible.`}
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </WorkspaceShell>
  );
}
