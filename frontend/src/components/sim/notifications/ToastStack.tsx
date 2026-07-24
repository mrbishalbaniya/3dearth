"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSimUiStore } from "../stores/uiStore";

export function ToastStack() {
  const toasts = useSimUiStore((s) => s.toasts);
  const dismiss = useSimUiStore((s) => s.dismissToast);

  return (
    <div className="sim-toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            className={`sim-toast sim-toast--${t.kind}`}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
            onClick={() => dismiss(t.id)}
          >
            <strong>{t.title}</strong>
            {t.body && <span>{t.body}</span>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
