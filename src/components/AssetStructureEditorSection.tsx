import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureTreeEditor } from "@/components/StructureTreeEditor";

export function AssetStructureEditorSection({
  tree,
}: {
  tree: StructureTreeNode;
}) {
  return (
    <>
      <h1 className="md-headline-small text-on-surface">
        Edit asset structure
      </h1>
      <p className="md-body-medium text-on-surface-variant">
        Add and delete levels, change their positions or modify their names
        and descriptions as desired.
      </p>
      <StructureTreeEditor tree={tree} />
    </>
  );
}
