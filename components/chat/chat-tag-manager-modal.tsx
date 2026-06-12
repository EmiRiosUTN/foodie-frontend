"use client";

import { Check, Edit2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppModal } from "../app-modal";
import { ConfirmDialog } from "../confirm-dialog";
import { ChatTagBadge } from "./chat-tag-badge";

type ChatTag = {
  name: string;
  color: string;
  _id?: string;
};

export function ChatTagManagerModal({
  open,
  onClose,
  tags,
  onCreateTag,
  onDeleteTag,
  onUpdateTagColor,
  readOnly = false
}: {
  open: boolean;
  onClose: () => void;
  tags: ChatTag[];
  onCreateTag: (name: string, color: string) => Promise<void>;
  onDeleteTag: (tagName: string) => Promise<void>;
  onUpdateTagColor: (tagName: string, color: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#F97316");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editColor, setEditColor] = useState("#F97316");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagPendingDelete, setTagPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNewTagName("");
      setNewTagColor("#F97316");
      setEditingTag(null);
      setEditColor("#F97316");
      setError(null);
      setTagPendingDelete(null);
    }
  }, [open]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError("El nombre de la tag es requerido");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setNewTagColor("#F97316");
    } catch (err: any) {
      setError(err.message || "No se pudo crear la tag");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateColor = async (tagName: string) => {
    try {
      setLoading(true);
      setError(null);
      await onUpdateTagColor(tagName, editColor);
      setEditingTag(null);
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar el color");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tagPendingDelete) return;
    try {
      setLoading(true);
      setError(null);
      await onDeleteTag(tagPendingDelete);
      setTagPendingDelete(null);
    } catch (err: any) {
      setError(err.message || "No se pudo eliminar la tag");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppModal
        open={open}
        onClose={onClose}
        title="Gestionar etiquetas"
        description="Crea, ajusta colores y limpia etiquetas del sistema de chat."
        widthClassName="max-w-3xl"
        footer={
          <button type="button" onClick={onClose} className="ml-auto rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white">
            Cerrar
          </button>
        }
      >
        <div className="space-y-6">
          {!readOnly ? (
            <div className="rounded-[24px] border border-brand-line bg-[#FCFAF7] p-4">
              <p className="text-sm font-semibold text-brand-ink">Crear nueva etiqueta</p>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="Nombre de la etiqueta"
                  maxLength={30}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  disabled={loading}
                  className="h-12 w-full cursor-pointer rounded-2xl border border-brand-line bg-white md:w-20"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateTag()}
                  disabled={loading || !newTagName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Crear
                </button>
              </div>
              {error ? <p className="mt-3 text-sm text-[#B65221]">{error}</p> : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-brand-ink">Etiquetas existentes ({tags.length})</p>
            {tags.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-brand-line bg-[#FCFAF7] px-6 py-10 text-center text-sm text-neutral-500">
                No hay etiquetas cargadas todavia.
              </div>
            ) : (
              tags.map((tag) => (
                <div key={tag.name} className="flex items-center justify-between gap-4 rounded-[24px] border border-brand-line bg-white px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {editingTag === tag.name ? (
                      <>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(event) => setEditColor(event.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-xl border border-brand-line bg-white"
                        />
                        <ChatTagBadge name={tag.name} color={editColor} />
                      </>
                    ) : (
                      <ChatTagBadge name={tag.name} color={tag.color} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingTag === tag.name ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleUpdateColor(tag.name)}
                          disabled={loading}
                          className="rounded-full border border-[#CFE3D7] bg-[#F4FBF7] p-2 text-[#2E6A46]"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setEditingTag(null)} className="rounded-full border border-brand-line p-2 text-neutral-500">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTag(tag.name);
                            setEditColor(tag.color);
                          }}
                          disabled={loading}
                          className="rounded-full border border-brand-line p-2 text-brand-ink"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => setTagPendingDelete(tag.name)}
                            disabled={loading}
                            className="rounded-full border border-[#F0C7B2] bg-[#FFF1EA] p-2 text-[#B65221]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AppModal>

      <ConfirmDialog
        open={Boolean(tagPendingDelete)}
        title="Eliminar etiqueta"
        description={`Se va a eliminar la etiqueta "${tagPendingDelete || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setTagPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
