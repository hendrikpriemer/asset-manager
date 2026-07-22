import type { AasElementGroup, AasSubmodelFile } from "@/lib/aas";
import { isImageContentType, isPreviewableContentType } from "@/lib/file-preview";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";

function groupTitle(group: AasElementGroup): string {
  return group.displayName || group.idShort;
}

export function AasElementGroupView({
  group,
  depth,
  groupPath = [],
  onPreview,
  getFileUrl,
}: {
  group: AasElementGroup;
  depth: number;
  groupPath?: string[];
  onPreview?: (file: AasSubmodelFile, groupPath: string[]) => void;
  getFileUrl?: (file: AasSubmodelFile, groupPath: string[]) => string;
}) {
  const indent = { paddingLeft: `${depth * 16}px` };

  return (
    <>
      {(group.properties.length > 0 || group.files.length > 0) && (
        <dl className="grid grid-cols-[max-content_1fr]">
          {group.properties.map((property, index) => (
            <div
              key={`${property.idShort}-${index}`}
              className="contents odd:bg-surface-container-low"
            >
              <dt
                style={indent}
                className="py-2 pr-4 md-body-small text-on-surface-variant"
              >
                {property.idShort || "Property"}
              </dt>
              <dd className="py-2 pr-2 md-body-small text-on-surface">
                {property.value ?? "—"}
              </dd>
            </div>
          ))}
          {group.files.map((file, index) => (
            <div
              key={`${file.idShort}-${index}`}
              className="contents odd:bg-surface-container-low"
            >
              <dt
                style={indent}
                className="py-2 pr-4 md-body-small text-on-surface-variant"
              >
                {file.idShort || "File"}
              </dt>
              <dd className="flex items-center gap-3 py-2 pr-2 md-body-small">
                {file.value ? (
                  <>
                    {getFileUrl && isImageContentType(file.contentType) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getFileUrl(file, groupPath)}
                        alt={file.idShort || "Image"}
                        className="h-16 w-16 rounded-xs object-cover"
                      />
                    )}
                    <a
                      href={file.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {file.contentType ?? "Download"}
                    </a>
                    {onPreview && isPreviewableContentType(file.contentType) && (
                      <Button
                        type="button"
                        variant="text"
                        onClick={() => onPreview(file, groupPath)}
                      >
                        Preview
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-on-surface-variant">
                    {file.contentType ?? "—"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {group.groups.map((child, index) => (
        <div key={`${child.idShort}-${index}`}>
          <div
            style={indent}
            className="flex items-center gap-2 border-t border-outline-variant bg-surface-container-low py-2"
          >
            <Icon name="folder" className="text-on-surface-variant" />
            <span className="md-title-small text-on-surface">
              {groupTitle(child)}
            </span>
          </div>
          <AasElementGroupView
            group={child}
            depth={depth + 1}
            groupPath={[...groupPath, child.idShort]}
            onPreview={onPreview}
            getFileUrl={getFileUrl}
          />
        </div>
      ))}
    </>
  );
}
