import type { OpenSourceLicense } from "@/lib/open-source-licenses";

export function OpenSourceLicensesSection({
  licenses,
}: {
  licenses: OpenSourceLicense[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="md-title-large text-on-surface">Open source licenses</h1>
      <p className="md-body-medium text-on-surface-variant">
        Asset Manager is built with the help of the open source community. The
        table below lists the open source software components used in this
        application and their respective licenses.
      </p>
      <table className="w-full border-collapse rounded-lg text-left md-body-medium">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container">
            <th className="py-3 pr-4 pl-4 md-title-small text-on-surface-variant">
              Name
            </th>
            <th className="py-3 pr-4 md-title-small text-on-surface-variant">
              Version
            </th>
            <th className="py-3 pr-4 md-title-small text-on-surface-variant">
              License
            </th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((entry) => (
            <tr
              key={entry.name}
              className="border-b border-outline-variant hover:bg-on-surface/[0.04]"
            >
              <td className="py-3 pr-4 pl-4 text-on-surface">{entry.name}</td>
              <td className="py-3 pr-4 text-on-surface-variant">
                {entry.version}
              </td>
              <td className="py-3 pr-4 text-on-surface-variant">
                {entry.license}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
