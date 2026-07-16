export function AboutSection({
  appName,
  version,
}: {
  appName: string;
  version: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="md-title-large text-on-surface">About</h1>
      <div className="flex flex-col gap-1">
        <span className="md-label-large text-on-surface">Application name</span>
        <span className="md-body-medium text-on-surface-variant">{appName}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="md-label-large text-on-surface">Version</span>
        <span className="md-body-medium text-on-surface-variant">{version}</span>
      </div>
    </div>
  );
}
