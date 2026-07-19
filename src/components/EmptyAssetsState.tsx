import Link from "next/link";
import { Icon } from "@/components/Icon";

export function EmptyAssetsState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Icon name="inventory_2" className="text-6xl text-on-surface-variant/40" />
      <h1 className="md-title-large text-on-surface">No assets yet</h1>
      <p className="md-body-medium max-w-md text-on-surface-variant">
        Assets represent the equipment and resources in your organization.
        Add your first asset to start tracking it.
      </p>
      <Link
        href="/assets/new"
        className="rounded-full bg-primary px-6 py-2.5 md-label-large text-on-primary"
      >
        New asset
      </Link>
    </div>
  );
}
