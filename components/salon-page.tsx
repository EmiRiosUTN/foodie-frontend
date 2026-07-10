"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppModal } from "./app-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { FoodieSelect } from "./foodie-select";
import { WorkspaceShell } from "./workspace-shell";
import { useWorkspace } from "./workspace-provider";
import type { Room } from "../lib/types";

type EditorKind =
  | "wall"
  | "window"
  | "column"
  | "corridor"
  | "screen"
  | "stairs"
  | "bathroom"
  | "round"
  | "square"
  | "rectangular";

type EditorItem = {
  id: string;
  kind: EditorKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seats?: number;
  tableId?: string;
  zoneId?: string | null;
  isReservable?: boolean;
  isCombinable?: boolean;
  metadata?: Record<string, unknown>;
};

type TableItemMetadata = {
  manualFeatures?: {
    hasTvView?: boolean;
  };
  capacity?: {
    minPartySize?: number;
    maxPartySize?: number;
  };
  derivedFeatures?: {
    nearWindow?: boolean;
    nearColumn?: boolean;
    nearWall?: boolean;
    nearCorridor?: boolean;
  };
};

type DesignState = {
  items: EditorItem[];
  combinationKeys: string[];
};

type PendingTableDraft = {
  kind: Extract<EditorKind, "round" | "square" | "rectangular">;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seats: number;
};

type TableModalState = {
  label: string;
  seats: string;
  minPartySize: string;
  maxPartySize: string;
  isReservable: boolean;
  isCombinable: boolean;
  hasTvView: boolean;
  combinationTableIds: string[];
};

type DesignSnapshot = {
  items: EditorItem[];
  combinationKeys: string[];
};

type RoomFormState = {
  name: string;
  description: string;
  isOutdoor: boolean;
};

type RoomModalMode = "" | "create" | "edit";

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "w" | "e";

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 960;
const STORAGE_PREFIX = "foodie_salon_editor_v3";
const GRID_UNIT = 32;

const paletteItems: Array<{
  kind: EditorKind;
  label: string;
  width: number;
  height: number;
  seats?: number;
}> = [
  { kind: "round", label: "Mesa redonda", width: 112, height: 112, seats: 4 },
  { kind: "square", label: "Mesa cuadrada", width: 104, height: 104, seats: 4 },
  { kind: "rectangular", label: "Mesa rectangular", width: 160, height: 104, seats: 6 },
  { kind: "wall", label: "Pared", width: 220, height: 16 },
  { kind: "window", label: "Ventana", width: 160, height: 14 },
  { kind: "column", label: "Columna", width: 58, height: 58 },
  { kind: "corridor", label: "Pasillo", width: 220, height: 92 },
  { kind: "screen", label: "Televisor / Proyector", width: 160, height: 92 },
  { kind: "stairs", label: "Escalera", width: 132, height: 112 },
  { kind: "bathroom", label: "Baño", width: 112, height: 112 }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shapeClass(kind: EditorKind) {
  if (kind === "round") return "rounded-full";
  if (kind === "square" || kind === "rectangular") return "rounded-[22px]";
  if (kind === "column" || kind === "bathroom") return "rounded-[18px]";
  if (kind === "stairs" || kind === "corridor") return "rounded-[12px]";
  return "rounded-sm";
}

function staticItemClass(kind: EditorKind) {
  switch (kind) {
    case "wall":
      return "bg-[#1F1F21] border-[#1F1F21]";
    case "window":
      return "bg-[#CDEEFF] border-[#7EC8F8]";
    case "column":
      return "bg-[#E8E0D6] border-[#9A8B7B]";
    case "corridor":
      return "bg-[#F6F2EE] border-[#DDD1C5]";
    case "screen":
      return "bg-[#1B2431] border-[#475569]";
    case "stairs":
      return "bg-[repeating-linear-gradient(0deg,#F8EFE4_0,#F8EFE4_13px,#C98B50_14px,#C98B50_18px)] border-[#B77943]";
    case "bathroom":
      return "bg-[#E8F7F4] border-[#5AAEA1]";
    default:
      return "border-[#1F1F21] bg-[#FFF9F5]";
  }
}

function isTableKind(kind: EditorKind): kind is "round" | "square" | "rectangular" {
  return kind === "round" || kind === "square" || kind === "rectangular";
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

function getTableMaxPartySize(table: Pick<EditorItem, "seats" | "metadata">) {
  const metadata = (table.metadata || {}) as TableItemMetadata;
  return metadata.capacity?.maxPartySize || table.seats || 0;
}

function normalizeRotation(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function ResizeHandleIcon(_props: { mode: "x" | "xy" }) {
  return null;
}

function PalettePreview({
  kind,
  label,
  seats
}: {
  kind: EditorKind;
  label: string;
  seats?: number;
}) {
  const width = kind === "rectangular" ? "w-20" : kind === "wall" || kind === "corridor" || kind === "window" ? "w-24" : "w-14";
  const height = kind === "wall" || kind === "window" ? "h-2" : kind === "corridor" ? "h-10" : "h-14";

  return (
    <div className="flex items-center gap-4">
      <div className={`flex shrink-0 items-center justify-center border-2 ${shapeClass(kind)} ${staticItemClass(kind)} ${width} ${height}`}>
        {seats ? <span className="text-[10px] font-semibold text-brand-ink">{seats}</span> : null}
        {kind === "bathroom" ? <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#237C72]">WC</span> : null}
      </div>
      <div>
        <p className="text-sm font-semibold text-brand-ink">{label}</p>
        <p className="text-xs text-neutral-500">{seats ? `${seats} comensales` : "Elemento fijo"}</p>
      </div>
    </div>
  );
}

function getResizeHandles(kind: EditorKind): ResizeHandle[] {
  if (kind === "wall" || kind === "window") {
    return ["w", "e"];
  }

  return ["nw", "ne", "sw", "se", "w", "e"];
}

function canResize(_kind: EditorKind) {
  return false;
}

function isLinearResize(_kind: EditorKind) {
  return true;
}

function minimumWidth(kind: EditorKind) {
  if (kind === "column") return 40;
  if (kind === "wall" || kind === "window") return 80;
  if (kind === "stairs" || kind === "bathroom") return 64;
  return 60;
}

function minimumHeight(kind: EditorKind) {
  if (kind === "wall") return 16;
  if (kind === "window") return 14;
  if (kind === "stairs" || kind === "bathroom") return 64;
  return 40;
}

function resizeHandlePosition(handle: ResizeHandle) {
  switch (handle) {
    case "nw":
      return "-left-2 -top-2 cursor-nwse-resize";
    case "ne":
      return "-right-2 -top-2 cursor-nesw-resize";
    case "sw":
      return "-bottom-2 -left-2 cursor-nesw-resize";
    case "se":
      return "-bottom-2 -right-2 cursor-nwse-resize";
    case "w":
      return "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize";
    case "e":
      return "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize";
  }
}

function distanceBetweenRects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const dx = Math.max(0, a.x - bx2, b.x - ax2);
  const dy = Math.max(0, a.y - by2, b.y - ay2);

  return Math.sqrt(dx * dx + dy * dy);
}

function deriveTableMetadata(
  table: Pick<EditorItem, "x" | "y" | "width" | "height" | "metadata">,
  items: EditorItem[]
): TableItemMetadata {
  const fixedItems = items.filter((item) => !isTableKind(item.kind));
  const near = (kind: EditorItem["kind"], threshold: number) =>
    fixedItems
      .filter((item) => item.kind === kind)
      .some((item) => distanceBetweenRects(table, item) <= threshold);

  const source = (table.metadata || {}) as TableItemMetadata;

  return {
    manualFeatures: {
      hasTvView: Boolean(source.manualFeatures?.hasTvView)
    },
    capacity: {
      minPartySize: source.capacity?.minPartySize,
      maxPartySize: source.capacity?.maxPartySize
    },
    derivedFeatures: {
      nearWindow: near("window", 120),
      nearColumn: near("column", 90),
      nearWall: near("wall", 80),
      nearCorridor: near("corridor", 120)
    }
  };
}

function serializeSnapshot(snapshot: DesignSnapshot) {
  return JSON.stringify(snapshot);
}

function getRoomMetrics(room: Room) {
  const totalSeats = room.tables.reduce((sum, table) => sum + table.seats, 0);
  const reservableCount = room.tables.filter((table) => table.isReservable).length;
  const tvViewCount = room.tables.filter((table) => table.metadata?.manualFeatures?.hasTvView).length;
  const zoneCount = room.zones.length;

  return {
    totalSeats,
    reservableCount,
    tvViewCount,
    zoneCount
  };
}

function buildEditorItems(roomDetail: NonNullable<ReturnType<typeof useWorkspace>["roomDetail"]>) {
  const fixedItems: EditorItem[] = roomDetail.floorPlanItems
    .filter((item) => ["wall", "window", "column", "corridor", "screen", "stairs", "bathroom"].includes(item.kind))
    .map((item) => ({
      id: item.id,
      kind: item.kind as EditorKind,
      label: item.label || item.kind,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation || 0,
      metadata: item.metadata || undefined
    }));

  const tableItems: EditorItem[] = roomDetail.tables.map((table) => {
    return {
      id: `editor-${table.id}`,
      kind: table.shape as EditorKind,
      label: table.label,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      rotation: table.rotation || 0,
      seats: table.seats,
      tableId: table.id,
      zoneId: table.zoneId,
      metadata: table.metadata || undefined,
      isReservable: table.isReservable,
      isCombinable: roomDetail.combinations.some(
        (combo) => combo.parentTableId === table.id || combo.childTableId === table.id
      )
    };
  });

  const combinationKeys = roomDetail.combinations.map((combo) => pairKey(`editor-${combo.parentTableId}`, `editor-${combo.childTableId}`));

  return {
    items: [...fixedItems, ...tableItems],
    combinationKeys
  };
}

export function SalonPage() {
  const {
    bootstrap,
    selectedBranchId,
    selectedRoomId,
    setSelectedRoomId,
    setSelectedBranchId,
    roomDetail,
    createRoom,
    updateRoom,
    deleteRoom,
    saveRoomLayout,
    roomForm,
    setRoomForm
  } = useWorkspace();

  const selectedBranch = bootstrap?.branches.find((branch) => branch.id === selectedBranchId);
  const rooms = selectedBranch?.rooms || [];
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [editorItems, setEditorItems] = useState<EditorItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [zoom, setZoom] = useState(1);
  const [openedRoomId, setOpenedRoomId] = useState("");
  const [roomModalMode, setRoomModalMode] = useState<RoomModalMode>("");
  const [editingRoomId, setEditingRoomId] = useState("");
  const [roomEditor, setRoomEditor] = useState<RoomFormState>({ name: "", description: "", isOutdoor: false });
  const [roomPendingDelete, setRoomPendingDelete] = useState<Room | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [pendingTableDraft, setPendingTableDraft] = useState<PendingTableDraft | null>(null);
  const [editingTableItemId, setEditingTableItemId] = useState("");
  const [tableModal, setTableModal] = useState<TableModalState>({
    label: "",
    seats: "4",
    minPartySize: "1",
    maxPartySize: "4",
    isReservable: true,
    isCombinable: false,
    hasTvView: false,
    combinationTableIds: []
  });
  const [combinationKeys, setCombinationKeys] = useState<string[]>([]);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const dragMovedRef = useRef(false);
  const undoStackRef = useRef<DesignSnapshot[]>([]);
  const baselineSnapshotRef = useRef("");
  const [openItemMenuId, setOpenItemMenuId] = useState("");
  const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });

  const activeRoom = rooms.find((room) => room.id === openedRoomId) || null;
  const storageKey = selectedRoomId ? `${STORAGE_PREFIX}:${selectedRoomId}` : "";
  const isEditorOpen = Boolean(openedRoomId && activeRoom);
  const selectedItem = editorItems.find((item) => item.id === selectedItemId) || null;
  const workspaceWidth = Math.max(CANVAS_WIDTH, Math.floor(Math.max(0, canvasViewportSize.width - 40) / Math.max(zoom, 0.01)));
  const workspaceHeight = Math.max(CANVAS_HEIGHT, Math.floor(Math.max(0, canvasViewportSize.height - 40) / Math.max(zoom, 0.01)));
  const scaledWorkspaceWidth = workspaceWidth * zoom;
  const scaledWorkspaceHeight = workspaceHeight * zoom;
  const gridSize = Math.max(14, Math.round(GRID_UNIT * zoom));
  const gridBackground = {
    backgroundImage:
      "linear-gradient(rgba(31,31,33,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(31,31,33,0.08) 1px, transparent 1px)",
    backgroundSize: `${gridSize}px ${gridSize}px`
  };

  function createSnapshot(items = editorItems, nextCombinationKeys = combinationKeys): DesignSnapshot {
    return {
      items,
      combinationKeys: nextCombinationKeys
    };
  }

  function resetHistory(snapshot: DesignSnapshot) {
    undoStackRef.current = [];
    baselineSnapshotRef.current = serializeSnapshot(snapshot);
  }

  function pushUndoSnapshot(snapshot = createSnapshot()) {
    const serialized = serializeSnapshot(snapshot);
    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];

    if (lastSnapshot && serializeSnapshot(lastSnapshot) === serialized) {
      return;
    }

    undoStackRef.current.push(snapshot);
  }

  function undoLastChange() {
    const previousSnapshot = undoStackRef.current.pop();
    if (!previousSnapshot) return;

    setEditorItems(previousSnapshot.items);
    setCombinationKeys(previousSnapshot.combinationKeys);
    setSelectedItemId("");
    closeTableModal();
    setLastSavedAt("");
  }

  useEffect(() => {
    if (!roomDetail || !storageKey) {
      setEditorItems([]);
      setCombinationKeys([]);
      setSelectedItemId("");
      resetHistory({ items: [], combinationKeys: [] });
      setHasUnsavedChanges(false);
      setLastSavedAt("");
      return;
    }

    const fallback = buildEditorItems(roomDetail);
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      setEditorItems(fallback.items);
      setCombinationKeys(fallback.combinationKeys);
      setSelectedItemId("");
      resetHistory(fallback);
      setHasUnsavedChanges(false);
      setLastSavedAt("");
      return;
    }

    try {
      const parsed = JSON.parse(saved) as DesignState | EditorItem[];
      const normalizeItems = (items: EditorItem[]) =>
        items.map((item) => ({
          ...item,
          rotation: normalizeRotation(item.rotation || 0)
        }));
      if (Array.isArray(parsed)) {
        const snapshot = { items: normalizeItems(parsed), combinationKeys: [] };
        setEditorItems(snapshot.items);
        setCombinationKeys(snapshot.combinationKeys);
        resetHistory(snapshot);
      } else {
        const snapshot = {
          items: normalizeItems(parsed.items || fallback.items),
          combinationKeys: parsed.combinationKeys || []
        };
        setEditorItems(snapshot.items);
        setCombinationKeys(snapshot.combinationKeys);
        resetHistory(snapshot);
      }
      setSelectedItemId("");
      setHasUnsavedChanges(false);
      setLastSavedAt("Guardado");
    } catch {
      setEditorItems(fallback.items);
      setCombinationKeys(fallback.combinationKeys);
      setSelectedItemId("");
      resetHistory(fallback);
      setHasUnsavedChanges(false);
      setLastSavedAt("");
    }
  }, [roomDetail, storageKey]);

  useEffect(() => {
    if (!storageKey && !editorItems.length && !combinationKeys.length) {
      setHasUnsavedChanges(false);
      return;
    }

    setHasUnsavedChanges(serializeSnapshot(createSnapshot()) !== baselineSnapshotRef.current);
  }, [editorItems, combinationKeys, storageKey]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;

    const updateViewport = () => {
      setCanvasViewportSize({
        width: node.clientWidth,
        height: node.clientHeight
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    window.addEventListener("resize", updateViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, [isEditorOpen]);

  const activeCombinationKeys = useMemo(
    () =>
      combinationKeys.filter((key) => {
        const [a, b] = key.split("__");
        return editorItems.some((item) => item.id === a) && editorItems.some((item) => item.id === b);
      }),
    [combinationKeys, editorItems]
  );

  const combinableTables = useMemo(
    () => editorItems.filter((item) => item.isCombinable && isTableKind(item.kind)),
    [editorItems]
  );

  const possibleCombinationPairs = useMemo(() => {
    const pairs: Array<{ key: string; left: EditorItem; right: EditorItem }> = [];
    for (let i = 0; i < combinableTables.length; i += 1) {
      for (let j = i + 1; j < combinableTables.length; j += 1) {
        pairs.push({
          key: pairKey(combinableTables[i].id, combinableTables[j].id),
          left: combinableTables[i],
          right: combinableTables[j]
        });
      }
    }
    return pairs;
  }, [combinableTables]);

  const tableCombinationOptions = useMemo(
    () =>
      editorItems.filter(
        (item) =>
          isTableKind(item.kind) &&
          item.id !== editingTableItemId &&
          (!pendingTableDraft || item.id !== selectedItemId)
      ),
    [editorItems, editingTableItemId, pendingTableDraft, selectedItemId]
  );

  function resetRoomEditor() {
    setRoomModalMode("");
    setEditingRoomId("");
    setRoomEditor({ name: "", description: "", isOutdoor: false });
    setRoomForm({ name: "", description: "", isOutdoor: false });
  }

  function openCreateRoomModal() {
    setRoomModalMode("create");
    setEditingRoomId("");
    setRoomEditor({ name: "", description: "", isOutdoor: false });
    setRoomForm({ name: "", description: "", isOutdoor: false });
  }

  function closeRoomModal() {
    resetRoomEditor();
  }

  async function handleCreateRoom() {
    await createRoom();
    resetRoomEditor();
  }

  async function handleUpdateRoom() {
    if (!editingRoomId) return;
    await updateRoom(editingRoomId, roomEditor);
    resetRoomEditor();
  }

  async function handleDeleteRoom(roomId: string) {
    await deleteRoom(roomId);
    if (selectedRoomId === roomId) setSelectedRoomId("");
    if (openedRoomId === roomId) setOpenedRoomId("");
    if (editingRoomId === roomId) resetRoomEditor();
    setRoomPendingDelete(null);
  }

  function openEditor(roomId: string) {
    setOpenedRoomId(roomId);
    setSelectedRoomId(roomId);
    setZoom(1);
    setSelectedItemId("");
  }

  function startEditRoom(room: (typeof rooms)[number]) {
    setRoomModalMode("edit");
    setEditingRoomId(room.id);
    setRoomEditor({
      name: room.name,
      description: room.description || "",
      isOutdoor: room.isOutdoor
    });
  }

  function persistMove(itemId: string, nextX: number, nextY: number) {
    setEditorItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const x = clamp(nextX, 0, workspaceWidth - item.width);
        const y = clamp(nextY, 0, workspaceHeight - item.height);

        return item.x === x && item.y === y
          ? item
          : {
              ...item,
              x,
              y
            };
      })
    );
    setHasUnsavedChanges(true);
  }

  function openTableModal(item: EditorItem) {
    const metadata = (item.metadata || {}) as TableItemMetadata;
    const selectedCombinationIds = activeCombinationKeys
      .filter((key) => key.split("__").includes(item.id))
      .map((key) => key.split("__").find((id) => id !== item.id))
      .filter((id): id is string => Boolean(id));

    setEditingTableItemId(item.id);
    setTableModal({
      label: item.label,
      seats: String(item.seats || 4),
      minPartySize: String(metadata.capacity?.minPartySize || 1),
      maxPartySize: String(metadata.capacity?.maxPartySize || item.seats || 4),
      isReservable: item.isReservable ?? true,
      isCombinable: item.isCombinable ?? false,
      hasTvView: Boolean(metadata.manualFeatures?.hasTvView),
      combinationTableIds: selectedCombinationIds
    });
  }

  function closeTableModal() {
    setPendingTableDraft(null);
    setEditingTableItemId("");
    setTableModal({
      label: "",
      seats: "4",
      minPartySize: "1",
      maxPartySize: "4",
      isReservable: true,
      isCombinable: false,
      hasTvView: false,
      combinationTableIds: []
    });
  }

  function persistResize(itemId: string, nextX: number, nextY: number, nextWidth: number, nextHeight: number) {
    setEditorItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const width = clamp(nextWidth, minimumWidth(item.kind), workspaceWidth);
        const height = clamp(nextHeight, minimumHeight(item.kind), workspaceHeight);
        const x = clamp(nextX, 0, workspaceWidth - width);
        const y = clamp(nextY, 0, workspaceHeight - height);

        if (item.x === x && item.y === y && item.width === width && item.height === height) {
          return item;
        }

        return {
          ...item,
          x,
          y,
          width,
          height
        };
      })
    );
    setHasUnsavedChanges(true);
  }

  function rotateItem(itemId: string, delta: number) {
    pushUndoSnapshot();
    setEditorItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              rotation: normalizeRotation(item.rotation + delta)
            }
          : item
      )
    );
    setHasUnsavedChanges(true);
  }

  function setItemRotation(itemId: string, value: number) {
    setEditorItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              rotation: normalizeRotation(value)
            }
          : item
      )
    );
    setHasUnsavedChanges(true);
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const surface = canvasSurfaceRef.current;
    if (!surface) return null;

    const rect = surface.getBoundingClientRect();

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  function beginPointerDrag(event: React.PointerEvent<HTMLButtonElement>, item: EditorItem) {
    if (!canvasSurfaceRef.current) return;

    event.preventDefault();
    pushUndoSnapshot();
    dragMovedRef.current = false;
    const startPoint = getCanvasPoint(event.clientX, event.clientY);
    if (!startPoint) return;

    const offsetX = startPoint.x - item.x;
    const offsetY = startPoint.y - item.y;

    const move = (pointerEvent: PointerEvent) => {
      const point = getCanvasPoint(pointerEvent.clientX, pointerEvent.clientY);
      if (!point) return;

      const nextX = point.x - offsetX;
      const nextY = point.y - offsetY;
      if (Math.abs(nextX - item.x) > 2 || Math.abs(nextY - item.y) > 2) {
        dragMovedRef.current = true;
      }
      persistMove(item.id, nextX, nextY);
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.setTimeout(() => {
        dragMovedRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function beginResize(event: React.PointerEvent<HTMLButtonElement>, item: EditorItem) {
    if (!canvasRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedItemId(item.id);
  }

  function beginRotate(event: React.PointerEvent<HTMLButtonElement>, item: EditorItem) {
    if (!canvasSurfaceRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    pushUndoSnapshot();
    setSelectedItemId(item.id);
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;

    const move = (pointerEvent: PointerEvent) => {
      const point = getCanvasPoint(pointerEvent.clientX, pointerEvent.clientY);
      if (!point) return;

      const pointerX = point.x;
      const pointerY = point.y;
      const angle = Math.atan2(pointerY - centerY, pointerX - centerX) * (180 / Math.PI) + 90;

      setItemRotation(item.id, angle);
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function beginResizeHandle(event: React.PointerEvent<HTMLButtonElement>, item: EditorItem, handle: ResizeHandle) {
    if (!canvasRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    pushUndoSnapshot();
    setSelectedItemId(item.id);

    const angle = (item.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = item.width;
    const startHeight = item.height;
    const startCenterX = item.x + item.width / 2;
    const startCenterY = item.y + item.height / 2;

    const horizontalSign = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const verticalSign = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;

    const move = (pointerEvent: PointerEvent) => {
      const deltaCanvasX = (pointerEvent.clientX - startX) / zoom;
      const deltaCanvasY = (pointerEvent.clientY - startY) / zoom;
      const localDeltaX = deltaCanvasX * cos + deltaCanvasY * sin;
      const localDeltaY = -deltaCanvasX * sin + deltaCanvasY * cos;

      const proposedWidth =
        horizontalSign === 0 ? startWidth : startWidth + horizontalSign * localDeltaX;
      const proposedHeight =
        verticalSign === 0 ? startHeight : startHeight + verticalSign * localDeltaY;

      const width = Math.max(minimumWidth(item.kind), proposedWidth);
      const height = Math.max(minimumHeight(item.kind), proposedHeight);
      const appliedDeltaX = horizontalSign === 0 ? 0 : horizontalSign * (width - startWidth);
      const appliedDeltaY = verticalSign === 0 ? 0 : verticalSign * (height - startHeight);
      const centerX = startCenterX + cos * (appliedDeltaX / 2) - sin * (appliedDeltaY / 2);
      const centerY = startCenterY + sin * (appliedDeltaX / 2) + cos * (appliedDeltaY / 2);

      persistResize(
        item.id,
        centerX - width / 2,
        centerY - height / 2,
        width,
        height
      );
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function submitTableModal() {
    const seats = Number(tableModal.seats) || pendingTableDraft?.seats || 4;
    const minPartySize = Math.max(1, Number(tableModal.minPartySize) || 1);
    const maxPartySize = Math.max(minPartySize, Number(tableModal.maxPartySize) || seats);
    const currentTableId = editingTableItemId || "";
    const nextCombinationKeys = tableModal.isCombinable && currentTableId
      ? tableModal.combinationTableIds.map((otherId) => pairKey(currentTableId, otherId))
      : [];
    pushUndoSnapshot();

    if (editingTableItemId) {
      setEditorItems((current) =>
        current.map((item) =>
          item.id === editingTableItemId
            ? {
                ...item,
                label: tableModal.label.trim() || item.label,
                seats,
                isReservable: tableModal.isReservable,
                isCombinable: tableModal.isCombinable,
                metadata: {
                  ...((item.metadata || {}) as TableItemMetadata),
                  capacity: {
                    minPartySize,
                    maxPartySize
                  },
                  manualFeatures: {
                    hasTvView: tableModal.hasTvView
                  }
                }
              }
            : item
        )
      );
      setCombinationKeys((current) => [
        ...current.filter((key) => !key.split("__").includes(editingTableItemId)),
        ...nextCombinationKeys
      ]);
      setHasUnsavedChanges(true);
      closeTableModal();
      return;
    }

    if (!pendingTableDraft) return;

    const itemId = `local-table-${Date.now()}`;
    const draftCombinationKeys = tableModal.isCombinable
      ? tableModal.combinationTableIds.map((otherId) => pairKey(itemId, otherId))
      : [];
    setEditorItems((current) => [
      ...current,
      {
        id: itemId,
        kind: pendingTableDraft.kind,
        label: tableModal.label.trim() || pendingTableDraft.label,
        x: pendingTableDraft.x,
        y: pendingTableDraft.y,
        width: pendingTableDraft.width,
        height: pendingTableDraft.height,
        rotation: 0,
        seats,
        isReservable: tableModal.isReservable,
        isCombinable: tableModal.isCombinable,
        metadata: {
          capacity: {
            minPartySize,
            maxPartySize
          },
          manualFeatures: {
            hasTvView: tableModal.hasTvView
          }
        }
      }
    ]);
    setCombinationKeys((current) => [...current, ...draftCombinationKeys]);
    setSelectedItemId(itemId);
    setHasUnsavedChanges(true);
    closeTableModal();
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!canvasSurfaceRef.current) return;

    const raw = event.dataTransfer.getData("application/foodie-item");
    if (!raw) return;

    const palette = JSON.parse(raw) as (typeof paletteItems)[number];
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    const nextX = clamp(point.x - palette.width / 2, 0, workspaceWidth - palette.width);
    const nextY = clamp(point.y - palette.height / 2, 0, workspaceHeight - palette.height);

    if (isTableKind(palette.kind)) {
      setPendingTableDraft({
        kind: palette.kind,
        label: palette.label,
        x: nextX,
        y: nextY,
        width: palette.width,
        height: palette.height,
        seats: palette.seats || 4
      });
      setTableModal({
        label: "",
        seats: String(palette.seats || 4),
        minPartySize: "1",
        maxPartySize: String(palette.seats || 4),
        isReservable: true,
        isCombinable: false,
        hasTvView: false,
        combinationTableIds: []
      });
      return;
    }

    pushUndoSnapshot();
    const itemId = `local-${palette.kind}-${Date.now()}`;
    setEditorItems((current) => [
      ...current,
      {
        id: itemId,
        kind: palette.kind,
        label: palette.label,
        x: nextX,
        y: nextY,
        width: palette.width,
        height: palette.height,
        rotation: 0
      }
    ]);
    setSelectedItemId(itemId);
    setHasUnsavedChanges(true);
  }

  function deleteItem(itemId: string) {
    pushUndoSnapshot();
    setEditorItems((current) => current.filter((item) => item.id !== itemId));
    if (selectedItemId === itemId) {
      setSelectedItemId("");
    }
    if (openItemMenuId === itemId) {
      setOpenItemMenuId("");
    }
    setHasUnsavedChanges(true);
  }

  function toggleCombination(key: string) {
    pushUndoSnapshot();
    setCombinationKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
    setHasUnsavedChanges(true);
  }

  async function saveDesignChanges() {
    if (!storageKey || !selectedRoomId || !roomDetail) return;

    const tableItems = editorItems.filter((item) => isTableKind(item.kind));
    const fixedItems = editorItems.filter((item) => !isTableKind(item.kind));
    const combinations = activeCombinationKeys
      .map((key, index) => {
        const [leftId, rightId] = key.split("__");
        const left = tableItems.find((item) => item.id === leftId);
        const right = tableItems.find((item) => item.id === rightId);

        if (!left || !right) return null;

        const parentTableId = left.tableId || left.id;
        const childTableId = right.tableId || right.id;

        return {
          id: `${selectedRoomId}-combo-${index + 1}`,
          parentTableId,
          childTableId,
          combinedSeats: Math.max(1, getTableMaxPartySize(left) + getTableMaxPartySize(right) - 2)
        };
      })
      .filter((item): item is { id: string; parentTableId: string; childTableId: string; combinedSeats: number } => Boolean(item));

    const payload = {
      zones: roomDetail.zones,
      items: fixedItems.map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        metadata: item.metadata || {}
      })),
      tables: tableItems.map((item) => ({
        id: item.tableId || item.id,
        label: item.label,
        shape: item.kind,
        seats: item.seats || 1,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        isReservable: item.isReservable ?? true,
        metadata: deriveTableMetadata(item, editorItems),
        zoneId: item.zoneId || null
      })),
      combinations
    };
    const localPayload: DesignState = { items: editorItems, combinationKeys: activeCombinationKeys };

    setIsSavingLayout(true);

    try {
      await saveRoomLayout(selectedRoomId, payload);
      window.localStorage.setItem(storageKey, JSON.stringify(localPayload));
      baselineSnapshotRef.current = serializeSnapshot(localPayload);
      setHasUnsavedChanges(false);
      setLastSavedAt(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      );
    } catch {
      setLastSavedAt("Error al guardar en backend");
    } finally {
      setIsSavingLayout(false);
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastChange();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedItemId) {
        event.preventDefault();
        deleteItem(selectedItemId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItemId, editorItems, combinationKeys]);

  return (
    <WorkspaceShell
      title="Salones y plano."
      description="Disena el layout por salon. Aqui solo se define el espacio, las mesas, sus reglas de reserva y las combinaciones posibles."
    >
      {!isEditorOpen ? (
        <section className="rounded-[28px] border border-brand-line bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-line pb-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-400">Branch</label>
                <FoodieSelect
                  value={selectedBranchId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSelectedBranchId(next);
                    setSelectedRoomId("");
                    setOpenedRoomId("");
                    resetRoomEditor();
                    setRoomPendingDelete(null);
                  }}
                  className="min-w-[240px] font-medium"
                >
                  {bootstrap?.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </FoodieSelect>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-ink">Salones creados</p>
              <p className="mt-1 text-sm text-neutral-500">{rooms.length} salones en esta branch.</p>
            </div>

            <button
              type="button"
              onClick={openCreateRoomModal}
              className="rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white"
            >
              Agregar salon
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {rooms.map((room) => {
              const metrics = getRoomMetrics(room);

              return (
                <article
                  key={room.id}
                  className="rounded-[26px] border border-brand-line bg-[#FCFAF7] p-5 transition hover:border-brand-orange hover:shadow-[0_18px_40px_rgba(31,31,33,0.07)]"
                >
                  <button type="button" onClick={() => openEditor(room.id)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-brand-ink">{room.name}</p>
                        <p className="mt-2 text-sm text-neutral-500">{room.description || "Sin descripcion"}</p>
                      </div>
                      <span className="rounded-full border border-brand-line px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                        {room.isOutdoor ? "Exterior" : "Interior"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[20px] border border-brand-line bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Mesas</p>
                        <p className="mt-2 text-xl font-semibold text-brand-ink">{room.tables.length}</p>
                      </div>
                      <div className="rounded-[20px] border border-brand-line bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Capacidad</p>
                        <p className="mt-2 text-xl font-semibold text-brand-ink">{metrics.totalSeats} pax</p>
                      </div>
                      <div className="rounded-[20px] border border-brand-line bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Reservables</p>
                        <p className="mt-2 text-xl font-semibold text-brand-ink">{metrics.reservableCount}</p>
                      </div>
                      <div className="rounded-[20px] border border-brand-line bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Zonas</p>
                        <p className="mt-2 text-xl font-semibold text-brand-ink">{metrics.zoneCount}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-medium text-brand-ink">
                        {metrics.tvViewCount} mesas con vista a tele
                      </span>
                      <span className="rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-medium text-brand-ink">
                        {room.isOutdoor ? "Apto exterior" : "Sector interior"}
                      </span>
                    </div>
                  </button>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditRoom(room)}
                      className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-orange hover:bg-[#FFF4ED] hover:text-brand-orange hover:shadow-[0_10px_24px_rgba(244,81,30,0.14)] focus:outline-none focus:ring-4 focus:ring-brand-orange/20"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomPendingDelete(room)}
                      className="rounded-full border border-[#F0C7B2] px-4 py-3 text-sm font-semibold text-[#B65221] transition hover:border-[#D94B2B] hover:bg-[#FDE9E3] hover:text-[#A83418] hover:shadow-[0_10px_24px_rgba(217,75,43,0.16)] focus:outline-none focus:ring-4 focus:ring-[#D94B2B]/20"
                    >
                      Borrar
                    </button>
                  </div>
                </article>
              );
            })}

            {!rooms.length ? (
              <div className="rounded-[26px] border border-dashed border-brand-line bg-[#FCFAF7] p-6 text-sm text-neutral-500">
                Todavia no hay salones para esta branch.
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[30px] border border-brand-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-line px-5 py-4">
            <div>
              <button
                onClick={() => {
                  setOpenedRoomId("");
                  setSelectedRoomId("");
                }}
                className="text-xs uppercase tracking-[0.18em] text-neutral-400 hover:text-brand-orange"
              >
                Volver a salones
              </button>
              <h2 className="mt-2 text-2xl font-semibold text-brand-ink">{activeRoom?.name || "Salon"}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <FoodieSelect
                value={selectedBranchId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedBranchId(next);
                  setOpenedRoomId("");
                  setSelectedRoomId("");
                  setSelectedItemId("");
                }}
                className="min-w-[220px] font-medium"
              >
                {bootstrap?.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </FoodieSelect>

              <div className="flex items-center gap-3 rounded-2xl border border-brand-line px-4 py-3">
                <input
                  type="range"
                  min="0.3"
                  max="1.8"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-36 accent-[#FF5A00]"
                />
                <span className="w-12 text-right text-sm font-medium text-brand-ink">{Math.round(zoom * 100)}%</span>
              </div>

              <button
                onClick={() => void saveDesignChanges()}
                disabled={isSavingLayout || !hasUnsavedChanges}
                className={`rounded-full px-4 py-3 text-sm font-medium text-white ${
                  isSavingLayout || !hasUnsavedChanges ? "cursor-not-allowed bg-[#F0C7B2]" : "bg-brand-orange"
                }`}
              >
                {isSavingLayout ? "Guardando..." : "Guardar cambios"}
              </button>

              <span className={`text-sm ${hasUnsavedChanges ? "text-[#B65221]" : "text-neutral-500"}`}>
                {hasUnsavedChanges ? "Cambios sin guardar" : lastSavedAt ? `Guardado ${lastSavedAt}` : "Sin cambios pendientes"}
              </span>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
            <div
              ref={canvasRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleCanvasDrop}
              className="h-[78vh] min-h-[720px] min-w-0 overflow-scroll overscroll-contain bg-[#EFE9E0] p-5"
              style={{ scrollbarGutter: "stable both-edges" }}
            >
              <div className="flex min-h-full items-start justify-start" style={{ minWidth: scaledWorkspaceWidth, minHeight: scaledWorkspaceHeight }}>
                <div
                  className="relative origin-top-left overflow-hidden rounded-[28px] border border-[#D7CCBF] bg-[#F7F4EF] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                  style={{ width: scaledWorkspaceWidth, height: scaledWorkspaceHeight, ...gridBackground }}
                  onClick={() => setSelectedItemId("")}
                >
                  <div
                    ref={canvasSurfaceRef}
                    className="absolute inset-0 origin-top-left"
                    style={{ width: workspaceWidth, height: workspaceHeight, transform: `scale(${zoom})`, transformOrigin: "top left" }}
                  >
                  {editorItems.map((item) => (
                    <div
                      key={item.id}
                      className="group absolute"
                      style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
                    >
                      {false ? (
                        <div
                          className="absolute left-1/2 top-0 z-20 flex w-44 -translate-x-1/2 -translate-y-[calc(100%+12px)] items-center gap-2 rounded-2xl border border-brand-line bg-white px-3 py-2 shadow-[0_14px_28px_rgba(31,31,33,0.14)]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Rotar</span>
                          <input
                            type="range"
                            min="0"
                            max="359"
                            step="1"
                            value={Math.round(item.rotation)}
                            onChange={(event) => setItemRotation(item.id, Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            className="w-full accent-[#FF5A00]"
                            aria-label="Rotacion del elemento"
                          />
                          <span className="w-10 text-right text-xs font-semibold text-brand-ink">{Math.round(item.rotation)}°</span>
                        </div>
                      ) : null}

                      <div
                        className={`relative h-full w-full ${
                          selectedItemId === item.id ? "ring-4 ring-[#FFB088]" : ""
                        } ${shapeClass(item.kind)}`}
                        style={{ transform: `rotate(${item.rotation}deg)`, transformOrigin: "center" }}
                      >
                        {selectedItemId === item.id ? (
                          <>
                            <div className="pointer-events-none absolute inset-[-8px] border border-[#6C63FF]" />
                            <div className="pointer-events-none absolute left-1/2 top-[-32px] h-6 w-px -translate-x-1/2 bg-[#6C63FF]" />
                            <button
                              type="button"
                              onPointerDown={(event) => beginRotate(event, item)}
                              className="absolute left-1/2 top-[-46px] z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-[#6C63FF] bg-white text-sm text-[#6C63FF] shadow-sm"
                              aria-label="Rotar elemento"
                            >
                              ↻
                            </button>
                            {getResizeHandles(item.kind).map((handle) => (
                              <button
                                key={handle}
                                type="button"
                                onPointerDown={(event) => beginResizeHandle(event, item, handle)}
                                className={`absolute z-20 h-4 w-4 rounded-full border border-[#6C63FF] bg-white shadow-sm ${resizeHandlePosition(handle)}`}
                                aria-label={`Redimensionar ${item.label}`}
                              />
                            ))}
                          </>
                        ) : null}

                        {isTableKind(item.kind) ? (
                          <div className="absolute -left-2 -top-2 z-20">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedItemId(item.id);
                                setOpenItemMenuId((current) => (current === item.id ? "" : item.id));
                              }}
                              className="pointer-events-none flex h-7 w-7 items-center justify-center rounded-full border border-brand-line bg-white text-sm font-bold text-brand-ink opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
                              aria-label="Acciones de mesa"
                            >
                              ⋯
                            </button>

                            {openItemMenuId === item.id ? (
                              <div className="absolute left-0 top-8 flex flex-col gap-2 rounded-[18px] border border-brand-line bg-white p-2 shadow-[0_12px_24px_rgba(31,31,33,0.12)]">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenItemMenuId("");
                                    openTableModal(item);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-line text-sm text-brand-ink hover:border-brand-orange"
                                  aria-label="Editar mesa"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteItem(item.id);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#F0C7B2] text-sm text-[#B65221] hover:bg-[#FFF4ED]"
                                  aria-label="Borrar mesa"
                                >
                                  🗑
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="pointer-events-none absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[#F0C7B2] bg-white text-xs font-bold text-[#B65221] opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
                            aria-label="Borrar elemento"
                          >
                            x
                          </button>
                        )}

                        <button
                          type="button"
                          onPointerDown={(event) => beginPointerDrag(event, item)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedItemId(item.id);
                            setOpenItemMenuId("");
                            if (dragMovedRef.current) {
                              dragMovedRef.current = false;
                              return;
                            }
                          }}
                          className={`flex h-full w-full items-center justify-center border-2 text-center shadow-sm ${
                            shapeClass(item.kind)
                          } ${staticItemClass(item.kind)}`}
                        >
                          <span className={`px-2 text-xs font-semibold ${item.kind === "wall" || item.kind === "screen" ? "text-white" : "text-brand-ink"}`}>
                            {item.label}
                            {item.seats ? (
                              <>
                                <br />
                                {item.seats} pax
                                <br />
                                {item.isReservable ? "reservable" : "sin reserva"}
                              </>
                            ) : null}
                          </span>
                        </button>

                        {canResize(item.kind) ? (
                          <button
                            type="button"
                            onPointerDown={(event) => beginResize(event, item)}
                            className={`pointer-events-none absolute flex items-center justify-center border border-brand-line bg-white text-[10px] text-brand-ink opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 ${
                              item.kind === "corridor"
                                ? "-bottom-2 -right-2 h-6 w-6 rounded-full cursor-nwse-resize"
                                : "right-[-10px] top-1/2 h-16 w-4 -translate-y-1/2 rounded-full cursor-ew-resize"
                            }`}
                            aria-label="Estirar elemento"
                          >
                            {isLinearResize(item.kind) ? (
                              <span className="flex items-center gap-[2px]">
                                <span className="h-8 w-[2px] rounded-full bg-[#1F1F21]" />
                                <span className="h-8 w-[2px] rounded-full bg-[#1F1F21]" />
                              </span>
                            ) : (
                              <ResizeHandleIcon mode="xy" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-brand-line bg-[#FCFAF7] xl:border-l xl:border-t-0">
              <div className="border-b border-brand-line px-5 py-5">
                <p className="text-sm font-semibold text-brand-ink">Paleta visual</p>
                <p className="mt-1 text-sm text-neutral-500">Arrastra elementos desde aqui hacia el plano.</p>
              </div>

              <div className="max-h-[42vh] overflow-y-auto px-5 py-5">
                <div className="grid gap-3">
                  {paletteItems.map((item) => (
                    <button
                      key={item.kind}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/foodie-item", JSON.stringify(item));
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      className="rounded-[24px] border border-brand-line bg-white px-4 py-4 text-left transition hover:border-brand-orange"
                    >
                      <PalettePreview kind={item.kind} label={item.label} seats={item.seats} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-brand-line px-5 py-5">
                <div className="rounded-[24px] border border-brand-line bg-white p-4">
                  <p className="text-sm font-semibold text-brand-ink">Elemento seleccionado</p>
                  {selectedItem ? (
                    <>
                      <p className="mt-2 text-sm text-neutral-500">{selectedItem.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">{selectedItem.kind}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => rotateItem(selectedItem.id, -90)}
                          className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
                        >
                          Girar -90
                        </button>
                        <span className="w-16 text-center text-sm font-semibold text-brand-ink">{selectedItem.rotation}°</span>
                        <button
                          type="button"
                          onClick={() => rotateItem(selectedItem.id, 90)}
                          className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
                        >
                          Girar +90
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">Selecciona un elemento del plano para rotarlo.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-brand-line px-5 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">Combinaciones posibles</p>
                    <p className="mt-1 text-sm text-neutral-500">Solo entre mesas marcadas como combinables.</p>
                  </div>
                </div>

                <div className="mt-4 max-h-[28vh] overflow-y-auto space-y-3 pr-1">
                  {possibleCombinationPairs.length ? (
                    possibleCombinationPairs.map((pair) => {
                      const active = activeCombinationKeys.includes(pair.key);
                      const combinedSeats = Math.max(1, getTableMaxPartySize(pair.left) + getTableMaxPartySize(pair.right) - 2);
                      return (
                        <button
                          key={pair.key}
                          onClick={() => toggleCombination(pair.key)}
                          className={`w-full rounded-[20px] border px-4 py-4 text-left transition ${
                            active ? "border-brand-orange bg-[#FFF4ED]" : "border-brand-line bg-white"
                          }`}
                        >
                          <p className="text-sm font-semibold text-brand-ink">
                            {pair.left.label} + {pair.right.label}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {getTableMaxPartySize(pair.left)} + {getTableMaxPartySize(pair.right)} - 2 = {combinedSeats} pax
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-neutral-500">Marca dos o mas mesas como combinables para definir parejas.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}

      <AppModal
        open={roomModalMode === "create" || roomModalMode === "edit"}
        title={roomModalMode === "edit" ? "Editar salon" : "Crear salon"}
        description="Completa los datos base del salon. El layout se configura despues desde su plano."
        onClose={closeRoomModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeRoomModal}
              className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void (roomModalMode === "edit" ? handleUpdateRoom() : handleCreateRoom())}
              className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white"
            >
              {roomModalMode === "edit" ? "Guardar cambios" : "Crear salon"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white">Nombre del salon</span>
            <input
              value={roomModalMode === "edit" ? roomEditor.name : roomForm.name}
              onChange={(event) =>
                roomModalMode === "edit"
                  ? setRoomEditor((current) => ({ ...current, name: event.target.value }))
                  : setRoomForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ej: Terraza"
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-white">Descripcion</span>
            <input
              value={roomModalMode === "edit" ? roomEditor.description : roomForm.description}
              onChange={(event) =>
                roomModalMode === "edit"
                  ? setRoomEditor((current) => ({ ...current, description: event.target.value }))
                  : setRoomForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Ej: Sector exterior con mesas altas"
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
            <input
              type="checkbox"
              checked={roomModalMode === "edit" ? roomEditor.isOutdoor : roomForm.isOutdoor}
              onChange={(event) =>
                roomModalMode === "edit"
                  ? setRoomEditor((current) => ({ ...current, isOutdoor: event.target.checked }))
                  : setRoomForm((current) => ({ ...current, isOutdoor: event.target.checked }))
              }
              className="h-4 w-4 accent-brand-orange"
            />
            Salon exterior
          </label>
        </div>
      </AppModal>

      <ConfirmDialog
        open={Boolean(roomPendingDelete)}
        title="Eliminar salon"
        description={`Vas a eliminar ${roomPendingDelete?.name || "este salon"}. Esta accion no usa alertas del navegador y requiere confirmacion propia.`}
        confirmLabel="Eliminar salon"
        tone="danger"
        onCancel={() => setRoomPendingDelete(null)}
        onConfirm={() => {
          if (!roomPendingDelete) return;
          void handleDeleteRoom(roomPendingDelete.id);
        }}
      />

      <AppModal
        open={Boolean(pendingTableDraft || editingTableItemId)}
        title={editingTableItemId ? "Editar mesa" : "Configurar mesa"}
        description="Define si la mesa acepta reservas, si puede entrar en combinaciones y si tiene vista a la tele."
        onClose={closeTableModal}
        widthClassName="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={closeTableModal}
              className="flex-1 rounded-full border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitTableModal}
              className="flex-1 rounded-full bg-brand-orange px-4 py-3 text-sm font-medium text-white"
            >
              {editingTableItemId ? "Guardar mesa" : "Crear mesa"}
            </button>
          </>
        }
      >
        <>
            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white">Nombre de la mesa</span>
                <input
                  value={tableModal.label}
                  onChange={(event) => setTableModal((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ej: M1"
                  className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-white">Comensales base</span>
                <input
                  type="number"
                  min="1"
                  value={tableModal.seats}
                  onChange={(event) => setTableModal((current) => ({ ...current, seats: event.target.value }))}
                  placeholder="Ej: 4"
                  className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white">Minimo de comensales</span>
                  <input
                    type="number"
                    min="1"
                    value={tableModal.minPartySize}
                    onChange={(event) => setTableModal((current) => ({ ...current, minPartySize: event.target.value }))}
                    placeholder="Ej: 2"
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white">Maximo de comensales</span>
                  <input
                    type="number"
                    min="1"
                    value={tableModal.maxPartySize}
                    onChange={(event) => setTableModal((current) => ({ ...current, maxPartySize: event.target.value }))}
                    placeholder="Ej: 3"
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-brand-ink outline-none placeholder:text-neutral-400 focus:border-brand-orange"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={tableModal.isReservable}
                  onChange={(event) => setTableModal((current) => ({ ...current, isReservable: event.target.checked }))}
                  className="h-4 w-4 accent-brand-orange"
                />
                Reservable
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={tableModal.isCombinable}
                  onChange={(event) =>
                    setTableModal((current) => ({
                      ...current,
                      isCombinable: event.target.checked,
                      combinationTableIds: event.target.checked ? current.combinationTableIds : []
                    }))
                  }
                  className="h-4 w-4 accent-brand-orange"
                />
                Combinable
              </label>

              {tableModal.isCombinable ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Se puede combinar con</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">Selecciona manualmente las mesas compatibles. No se elige automaticamente.</p>
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                    {tableCombinationOptions.length ? (
                      tableCombinationOptions.map((table) => (
                        <label key={table.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white px-3 py-2 text-sm font-semibold text-brand-ink">
                          <span>{table.label} - {table.seats || 0} pax</span>
                          <input
                            type="checkbox"
                            checked={tableModal.combinationTableIds.includes(table.id)}
                            onChange={(event) =>
                              setTableModal((current) => ({
                                ...current,
                                combinationTableIds: event.target.checked
                                  ? [...current.combinationTableIds, table.id]
                                  : current.combinationTableIds.filter((id) => id !== table.id)
                              }))
                            }
                            className="h-4 w-4 accent-brand-orange"
                          />
                        </label>
                      ))
                    ) : (
                      <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/70">
                        Agrega otra mesa al plano para poder seleccionarla como combinable.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <label className="flex items-center gap-3 text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={tableModal.hasTvView}
                  onChange={(event) => setTableModal((current) => ({ ...current, hasTvView: event.target.checked }))}
                  className="h-4 w-4 accent-brand-orange"
                />
                Vista a tele
              </label>

              {editingTableItemId && selectedItem && isTableKind(selectedItem.kind) ? (
                <div className="rounded-2xl border border-brand-line bg-[#FCFAF7] p-4 text-sm text-neutral-600">
                  <p className="font-semibold text-brand-ink">Deteccion automatica</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(deriveTableMetadata(selectedItem, editorItems).derivedFeatures || {})
                      .filter(([, active]) => active)
                      .map(([key]) => (
                        <span key={key} className="rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-medium text-brand-ink">
                          {key === "nearWindow"
                            ? "Cerca de ventana"
                            : key === "nearColumn"
                              ? "Cerca de columna"
                              : key === "nearWall"
                                ? "Cerca de pared"
                                : "Cerca de pasillo"}
                        </span>
                      ))}
                    {!Object.values(deriveTableMetadata(selectedItem, editorItems).derivedFeatures || {}).some(Boolean) ? (
                      <span className="text-xs text-neutral-500">Sin cercanias detectadas</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
        </>
      </AppModal>
    </WorkspaceShell>
  );
}
