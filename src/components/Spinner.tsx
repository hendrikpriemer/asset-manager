import { Icon } from "@/components/Icon";

export function Spinner({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label}>
      <Icon name="progress_activity" className={`animate-spin ${className}`.trim()} />
    </span>
  );
}
