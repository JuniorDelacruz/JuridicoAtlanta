import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    danger: false,
    resolve: null,
  });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || "Confirmar ação",
        message: opts.message || "Tem certeza?",
        confirmText: opts.confirmText || "Confirmar",
        cancelText: opts.cancelText || "Cancelar",
        danger: Boolean(opts.danger),
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setState((s) => {
      s.resolve?.(result);
      return { ...s, open: false, resolve: null };
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmCtx.Provider value={value}>
      {children}

      {state.open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => close(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b">
              <div className="text-lg font-bold text-gray-900">{state.title}</div>
              {state.message ? <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{state.message}</div> : null}
            </div>

            <div className="p-5 flex justify-end gap-3">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 transition"
              >
                {state.cancelText}
              </button>

              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-md text-white transition ${
                  state.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}