"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  wide?: boolean;
} & HTMLMotionProps<"div">;

export function GlassPanel({
  children,
  className = "",
  title,
  subtitle,
  onClose,
  wide,
  ...rest
}: PanelProps) {
  return (
    <motion.div
      className={`sim-glass ${wide ? "sim-glass--wide" : ""} ${className}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {(title || onClose) && (
        <header className="sim-glass__head">
          <div>
            {title && <h2 className="sim-glass__title">{title}</h2>}
            {subtitle && <p className="sim-glass__sub">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="sim-chip" onClick={onClose}>
              Close
            </button>
          )}
        </header>
      )}
      {children}
    </motion.div>
  );
}

export function SimButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "accent";
}) {
  return (
    <button
      type="button"
      className={`sim-btn sim-btn--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SimChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "crit" | "cyan";
}) {
  return <span className={`sim-tag sim-tag--${tone}`}>{children}</span>;
}

export function SimStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="sim-stat">
      <span>{label}</span>
      <strong>
        {value}
        {unit && <em>{unit}</em>}
      </strong>
    </div>
  );
}
