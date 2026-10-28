import { useCallback, useEffect, useState } from "react";
import { usePanelAccess } from "../hooks/usePanelAccess";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

type ConfirmListener = (pending: PendingConfirm | null) => void;

let currentPending: PendingConfirm | null = null;
const listeners = new Set<ConfirmListener>();

function emit(next: PendingConfirm | null): void {
  currentPending = next;
  for (const listener of listeners) listener(next);
}

/**
 * M-33: Tarayıcının ana iş parçacığını kilitleyen yerel `window.confirm()` yerine
 * tema-uyumlu, klavye tuzağı (`usePanelAccess`) ve `role="alertdialog"` taşıyan
 * erişilebilir onay penceresi açar.
 */
export function requestConfirm(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions =
    typeof options === "string" ? { message: options } : options;
  if (listeners.size === 0 && typeof window !== "undefined" && typeof window.confirm === "function") {
    return Promise.resolve(window.confirm(normalized.message));
  }
  if (currentPending) {
    currentPending.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    emit({ ...normalized, resolve });
  });
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "İşlemi onayla",
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = usePanelAccess(open, onCancel, true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4">
      <button
        type="button"
        aria-label="Onay penceresini kapat"
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="atlasia-confirm-title"
        aria-describedby="atlasia-confirm-desc"
        className="panel relative w-full max-w-[380px] rounded-3xl border border-white/15 p-5 text-mint shadow-2xl"
      >
        <h2
          id="atlasia-confirm-title"
          className="font-display text-[19px] leading-snug font-semibold text-mint"
        >
          {title}
        </h2>
        <p
          id="atlasia-confirm-desc"
          className="mt-2 text-[13.5px] leading-relaxed text-mint/85"
        >
          {message}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-white/15 px-4 text-[13px] font-semibold text-mint/85 transition hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 rounded-full px-5 text-[13px] font-semibold transition ${
              danger
                ? "bg-rose-400 text-[#1b090c] hover:bg-rose-300"
                : "bg-sun text-ink hover:brightness-105"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(() => currentPending);

  useEffect(() => {
    listeners.add(setPending);
    return () => {
      listeners.delete(setPending);
    };
  }, []);

  const settle = useCallback((accepted: boolean) => {
    const active = currentPending;
    emit(null);
    active?.resolve(accepted);
  }, []);

  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={pending?.title}
      message={pending?.message ?? ""}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      danger={pending?.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}
