import { create } from 'zustand';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

let nextId = 1;

interface ToastState {
  toasts: Toast[];
  push: (kind: Toast['kind'], message: string, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message, ttlMs = 4000) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, kind, message }] }));
    window.setTimeout(() => get().dismiss(id), ttlMs);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toastSuccess(message: string): void {
  useToastStore.getState().push('success', message);
}
export function toastError(message: string): void {
  useToastStore.getState().push('error', message);
}
export function toastInfo(message: string): void {
  useToastStore.getState().push('info', message);
}
