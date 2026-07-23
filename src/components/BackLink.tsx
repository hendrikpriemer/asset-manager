import Link from "next/link";
import { Icon } from "@/components/Icon";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-2 md-label-large text-on-surface-variant hover:text-on-surface"
    >
      <Icon name="arrow_back" />
      {label}
    </Link>
  );
}
