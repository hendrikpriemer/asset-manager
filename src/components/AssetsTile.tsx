import Link from "next/link";

export function AssetsTile({ count }: { count: number }) {
  return (
    <Link
      href="/assets"
      className="block w-fit rounded-lg bg-surface-container p-6 shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
    >
      <p className="md-title-medium text-on-surface-variant">Assets</p>
      <p className="md-display-small text-on-surface">{count}</p>
    </Link>
  );
}
