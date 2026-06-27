"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FoodieSelect } from "./foodie-select";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 960;

function shapeClass(shape: string) {
  if (shape === "round") return "rounded-full";
  if (shape === "square" || shape === "rectangular") return "rounded-[22px]";
  return "rounded-[18px]";
}

function tableStateStyle(status: string) {
  switch (status) {
    case "reserved":
      return "border-[#C63D2F] bg-[#FDE9E7] text-[#8F241B]";
    case "occupied":
      return "border-[#D39C11] bg-[#FFF2CC] text-[#8A5B00]";
    case "blocked":
      return "border-[#6B7280] bg-[#E5E7EB] text-[#374151]";
    default:
      return "border-[#2F8F57] bg-[#E8F7EE] text-[#146C37]";
  }
}

function renderFixedItem(item: {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string | null;
}) {
  const baseStyle = {
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transform: `rotate(${item.rotation}deg)`,
    transformOrigin: "center"
  };

  if (item.kind === "screen") {
    return (
      <div key={item.id} className="absolute" style={baseStyle}>
        <div className="relative h-full w-full rounded-[18px] border-4 border-[#111827] bg-[#0F172A] shadow-[0_10px_24px_rgba(15,23,42,0.22)]">
          <div className="absolute inset-[10%] rounded-[10px] bg-[linear-gradient(135deg,#0EA5E9,#1D4ED8)] opacity-85" />
          <div className="absolute left-1/2 top-full h-3 w-10 -translate-x-1/2 rounded-b-md bg-[#111827]" />
          <div className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-full bg-[rgba(255,255,255,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            TV
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === "wall") {
    return <div key={item.id} className="absolute rounded-sm bg-[#1F1F21]" style={baseStyle} />;
  }

  if (item.kind === "window") {
    return <div key={item.id} className="absolute rounded-sm border border-[#7EC8F8] bg-[#B9E7FF]" style={baseStyle} />;
  }

  if (item.kind === "column") {
    return <div key={item.id} className="absolute rounded-[18px] border border-[#A59686] bg-[#D8D0C6]" style={baseStyle} />;
  }

  if (item.kind === "corridor") {
    return <div key={item.id} className="absolute rounded-[12px] border border-[#DDD1C5] bg-[#ECE5DC]" style={baseStyle} />;
  }

  if (item.kind === "stairs") {
    return (
      <div
        key={item.id}
        className="absolute rounded-[12px] border border-[#B77943] bg-[repeating-linear-gradient(0deg,#F8EFE4_0,#F8EFE4_13px,#C98B50_14px,#C98B50_18px)]"
        style={baseStyle}
      />
    );
  }

  if (item.kind === "bathroom") {
    return (
      <div
        key={item.id}
        className="absolute flex items-center justify-center rounded-[18px] border border-[#5AAEA1] bg-[#E8F7F4] text-[10px] font-black uppercase tracking-[0.12em] text-[#237C72]"
        style={baseStyle}
      >
        WC
      </div>
    );
  }

  return <div key={item.id} className="absolute rounded-sm bg-[#E9DED2]" style={baseStyle} />;
}

export function PanelPage() {
  const {
    bootstrap,
    reservations,
    roomDetail,
    selectedRoomId,
    setSelectedRoomId,
    selectedBranchId,
    selectedDate,
    selectedTurn,
    setSelectedBranchId,
    setSelectedDate,
    setSelectedTurn,
    tableStates,
    setTableState,
    moveReservation
  } = useWorkspace();

  const [selectedTableId, setSelectedTableId] = useState("");
  const [openMenuTableId, setOpenMenuTableId] = useState("");
  const [detailReservationId, setDetailReservationId] = useState("");
  const layoutWrapRef = useRef<HTMLDivElement>(null);
  const [layoutScale, setLayoutScale] = useState(0.7);

  const selectedBranch = bootstrap?.branches.find((branch) => branch.id === selectedBranchId);
  const selectedRoom = selectedBranch?.rooms.find((room) => room.id === selectedRoomId) || null;

  const tableStateMap = useMemo(() => {
    return new Map(tableStates.map((state) => [state.tableId, state]));
  }, [tableStates]);

  const reservationByTableId = useMemo(() => {
    const map = new Map<string, (typeof reservations)[number]>();
    for (const reservation of reservations) {
      for (const link of reservation.tables) {
        map.set(link.table.id, reservation);
      }
    }
    return map;
  }, [reservations]);

  const detailReservation = detailReservationId
    ? reservations.find((reservation) => reservation.id === detailReservationId) || null
    : null;

  useEffect(() => {
    const node = layoutWrapRef.current;
    if (!node) return;

    const updateScale = () => {
      const availableWidth = node.clientWidth;
      const nextScale = Math.min(1, Math.max(0.25, (availableWidth - 2) / CANVAS_WIDTH));
      setLayoutScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <WorkspaceShell
      title="Panel"
      description=""
    >
      <section className="overflow-hidden rounded-[30px] border border-brand-line bg-white">
        <div className="flex flex-wrap items-end gap-4 border-b border-brand-line px-5 py-4">
          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Sucursal</label>
            <FoodieSelect
              value={selectedBranchId}
              onChange={(event) => {
                const next = event.target.value;
                setSelectedBranchId(next);
                const firstRoom = bootstrap?.branches.find((branch) => branch.id === next)?.rooms[0]?.id || "";
                setSelectedRoomId(firstRoom);
                setSelectedTableId("");
                setOpenMenuTableId("");
              }}
              className="font-medium"
            >
              {bootstrap?.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </FoodieSelect>
          </div>

          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Salon</label>
            <FoodieSelect
              value={selectedRoomId}
              onChange={(event) => {
                setSelectedRoomId(event.target.value);
                setSelectedTableId("");
                setOpenMenuTableId("");
              }}
              className="font-medium"
            >
              {selectedBranch?.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </FoodieSelect>
          </div>

          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-2xl border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Turno</label>
            <FoodieSelect
              value={selectedTurn}
              onChange={(event) => setSelectedTurn(event.target.value as "mediodia" | "noche")}
              className="font-medium"
            >
              <option value="mediodia">Mediodia</option>
              <option value="noche">Noche</option>
            </FoodieSelect>
          </div>
        </div>

        <div className="min-w-0 p-3 sm:p-5">
          {!roomDetail ? (
            <div className="rounded-[24px] border border-brand-line bg-[#FCFAF7] p-6 text-sm text-neutral-500">
              Selecciona un salon para ver el layout operativo.
            </div>
          ) : (
            <div ref={layoutWrapRef} className="w-full overflow-hidden rounded-[24px] border border-brand-line bg-[#F7F4EF] p-3 sm:p-4">
              <div className="relative w-full overflow-hidden" style={{ height: CANVAS_HEIGHT * layoutScale }}>
                <div
                  className="relative origin-top-left"
                  style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${layoutScale})` }}
                >
                {roomDetail.floorPlanItems.map((item) => renderFixedItem(item))}

                {roomDetail.tables.map((table) => {
                  const state = tableStateMap.get(table.id);
                  const status = state?.status || "free";
                  const reservation = reservationByTableId.get(table.id) || null;

                  return (
                    <div
                      key={table.id}
                      className="absolute"
                      style={{
                        left: table.x,
                        top: table.y,
                        width: table.width,
                        height: table.height,
                        transform: `rotate(${table.rotation}deg)`,
                        transformOrigin: "center"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTableId(table.id);
                          setOpenMenuTableId("");
                        }}
                        className={`relative h-full w-full border-2 text-center shadow-sm transition ${shapeClass(table.shape)} ${tableStateStyle(status)} ${
                          selectedTableId === table.id ? "ring-4 ring-[#FFB088]" : ""
                        }`}
                      >
                        <span className="block px-2 py-2 text-xs font-semibold">
                          {table.label}
                          <br />
                          {table.seats} pax
                        </span>
                      </button>

                      <div className="absolute -left-2 -top-2 z-20">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTableId(table.id);
                            setOpenMenuTableId((current) => (current === table.id ? "" : table.id));
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-line bg-white text-sm font-bold text-brand-ink shadow-sm"
                          aria-label="Acciones de mesa"
                        >
                          ⋯
                        </button>

                        {openMenuTableId === table.id ? (
                          <div className="absolute left-0 top-8 flex flex-col gap-2 rounded-[18px] border border-brand-line bg-white p-2 shadow-[0_12px_24px_rgba(31,31,33,0.12)]">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuTableId("");
                                if (status === "reserved" && reservation) {
                                  void moveReservation(reservation.id, "check-in");
                                  return;
                                }
                                void setTableState(table.id, "occupied");
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line text-sm text-[#8A5B00] hover:border-[#D39C11]"
                              aria-label="Ocupar mesa"
                            >
                              ●
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuTableId("");
                                if (reservation) {
                                  void moveReservation(reservation.id, "release");
                                  return;
                                }
                                void setTableState(table.id, "free");
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line text-sm text-[#146C37] hover:border-[#2F8F57]"
                              aria-label="Liberar mesa"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuTableId("");
                                if (reservation) {
                                  setDetailReservationId(reservation.id);
                                }
                              }}
                              disabled={!reservation}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                                reservation
                                  ? "border-brand-line text-brand-ink hover:border-brand-orange"
                                  : "cursor-not-allowed border-[#E5E7EB] text-[#BDBDBD]"
                              }`}
                              aria-label="Ver detalle"
                            >
                              i
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {detailReservation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,31,33,0.42)] p-6">
          <div className="w-full max-w-lg rounded-[30px] border border-brand-line bg-white p-6 shadow-[0_24px_60px_rgba(31,31,33,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-brand-ink">Detalle de reserva</p>
                <p className="mt-1 text-sm text-neutral-500">Codigo {detailReservation.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailReservationId("")}
                className="rounded-full border border-brand-line px-3 py-1 text-sm text-brand-ink"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-neutral-600">
              <p><span className="font-semibold text-brand-ink">Nombre:</span> {detailReservation.fullName}</p>
              <p><span className="font-semibold text-brand-ink">Telefono:</span> {detailReservation.phone}</p>
              <p><span className="font-semibold text-brand-ink">Email:</span> {detailReservation.email}</p>
              <p><span className="font-semibold text-brand-ink">Cantidad:</span> {detailReservation.partySize}</p>
              <p><span className="font-semibold text-brand-ink">Estado:</span> {detailReservation.status}</p>
              <p><span className="font-semibold text-brand-ink">Salon:</span> {detailReservation.room.name}</p>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
