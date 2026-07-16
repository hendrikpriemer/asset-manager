import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "filled" | "text" | "icon";
type Color = "primary" | "error";

const VARIANT_CLASSES: Record<Variant, string> = {
  filled: "rounded-full px-6 py-2.5 md-label-large",
  text: "rounded-full px-3 py-2.5 md-label-large",
  icon: "rounded-full p-2 inline-flex items-center justify-center",
};

const COLOR_CLASSES: Record<Variant, Record<Color, string>> = {
  filled: {
    primary: "bg-primary text-on-primary",
    error: "bg-error text-on-error",
  },
  text: {
    primary: "text-primary hover:bg-primary/8",
    error: "text-error hover:bg-error/8",
  },
  icon: {
    primary: "text-on-surface-variant hover:bg-on-surface/8",
    error: "text-error hover:bg-error/8",
  },
};

export function Button({
  variant = "filled",
  color = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  color?: Color;
  children: ReactNode;
}) {
  return (
    <button
      className={`${VARIANT_CLASSES[variant]} ${COLOR_CLASSES[variant][color]} transition-colors disabled:opacity-[0.38] ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
