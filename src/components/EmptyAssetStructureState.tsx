import Link from "next/link";
import { Icon } from "@/components/Icon";

export function EmptyAssetStructureState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Icon
        name="account_tree"
        className="text-6xl text-on-surface-variant/40"
      />
      <h1 className="md-title-large text-on-surface">No asset structure yet</h1>
      <p className="md-body-medium max-w-md text-on-surface-variant">
        The asset structure allows you to efficiently organize your assets in
        alignment with your enterprise&apos;s structure.
      </p>
      <Link
        href="/asset-structure/new"
        className="rounded-full bg-primary px-6 py-2.5 md-label-large text-on-primary"
      >
        Create asset structure
      </Link>
    </div>
  );
}
