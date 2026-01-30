import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastCtx = createContext(null);

function iconByType(type) {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    default:
      return Info;
  }
}

function colorsByType(type) {
  switch (type) {
    case "success":
      return "bg-green-50 border-green-200 text-green-900";
    case "error":
      return "bg-red-50 border-red-200 text-red-900";
    case "warning":
      return "bg-yellow-50 border-yellow-200 text-yellow-900";
    default:
      return "bg-blue-50 border-blue-200 text-blue-900";
  }
}

export function ToastProvider({ children, position = "top-right" }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (opts) => {
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
      const toast = {
        id,
        type: opts?.type || "info",
        title: opts?.title || "",
        message: opts?.message || "",
        duration: Number.isFinite(opts?.duration) ? opts.duration : 3500,
      };

      setToasts((prev) => [toast, ...prev].slice(0, 6));

      if (toast.duration > 0) {
        const timer = setTimeout(() => remove(id), toast.duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [remove]
  );

  useEffect(() => {
    return () => {
      // cleanup
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  const posClass =
    position === "top-left"
      ? "top-4 left-4"
      : position === "bottom-left"
      ? "bottom-4 left-4"
      : position === "bottom-right"
      ? "bottom-4 right-4"
      : "top-4 right-4";

  return (
    <ToastCtx.Provider value={value}>
      {children}

      <div className={`fixed z-[9999] ${posClass} w-[92vw] max-w-sm space-y-3`}>
        {toasts.map((t) => {
          const Icon = iconByType(t.type);
          return (
            <div
              key={t.id}
              className={`border rounded-xl shadow-md px-4 py-3 ${colorsByType(t.type)} animate-[fadeIn_160ms_ease-out]`}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5" />
                <div className="flex-1">
                  {t.title ? <div className="font-semibold">{t.title}</div> : null}
                  {t.message ? <div className="text-sm opacity-90 mt-0.5 whitespace-pre-wrap">{t.message}</div> : null}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="p-1 rounded hover:bg-black/10 transition"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}