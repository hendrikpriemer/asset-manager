import type { Asset, AssetStructureNode } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureNavTree } from "@/components/StructureNavTree";
import { StructureNodeDetail } from "@/components/StructureNodeDetail";

export function StructureBrowserSection({
  tree,
  node,
  breadcrumb,
  assets,
}: {
  tree: StructureTreeNode;
  node: AssetStructureNode;
  breadcrumb: string[];
  assets: Asset[];
}) {
  return (
    <div className="flex gap-8">
      <div className="w-64 shrink-0">
        <StructureNavTree tree={tree} />
      </div>
      <div className="flex-1">
        <StructureNodeDetail node={node} breadcrumb={breadcrumb} assets={assets} />
      </div>
    </div>
  );
}
