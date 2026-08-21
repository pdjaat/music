import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (m: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (m) => {
    set({ message: m });
    setTimeout(() => set({ message: null }), 2400);
  },
}));

export function ToastHost() {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed top-4 right-4 z-[80] rounded-2xl bg-white text-ink px-4 py-3 text-sm font-semibold shadow-glow"
    >
      {message}
    </div>
  );
}
