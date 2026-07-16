import Link from "next/link";
import type { FlattenedStructureRow } from "@/lib/asset-structure";
import { LevelBadge } from "@/components/LevelBadge";

export function StructureTable({ rows }: { rows: FlattenedStructureRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="md-body-large text-on-surface-variant">
        No asset structure yet.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse rounded-lg text-left md-body-medium">
      <thead>
        <tr className="border-b border-outline-variant bg-surface-container">
          <th className="py-3 pr-4 pl-4 md-title-small text-on-surface-variant">
            Name
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Level
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Description
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Path
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Assigned Assets
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Updated
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="border-b border-outline-variant hover:bg-on-surface/[0.04]"
          >
            <td className="py-3 pr-4 pl-4">
              <Link
                href={`/asset-structure/${row.id}`}
                className="text-primary hover:underline"
              >
                {row.name}
              </Link>
            </td>
            <td className="py-3 pr-4">
              <LevelBadge level={row.level} />
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {row.description ?? "—"}
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {row.path || "—"}
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {row.assetCount}
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {row.updatedAt.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
