import { Icon } from "@/components/Icon";

export type ToastVariant = "success" | "error";

export function Toast({
  message,
  variant = "success",
  onDismiss,
}: {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-3 rounded-xs px-4 py-3 shadow-elevation-3 md-body-medium ${
        variant === "error"
          ? "bg-error-container text-on-error-container"
          : "bg-inverse-surface text-inverse-on-surface"
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex min-h-11 min-w-11 items-center justify-center opacity-70 hover:opacity-100"
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
