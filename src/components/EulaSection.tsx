const PLACEHOLDER_PARAGRAPHS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
];

export function EulaSection() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="md-title-large text-on-surface">
        End user license agreement
      </h1>
      <div className="max-h-[70vh] overflow-y-auto rounded-lg bg-surface-container-low p-6">
        <h2 className="md-title-small text-on-surface">
          ASSET MANAGER END USER LICENSE AGREEMENT
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {PLACEHOLDER_PARAGRAPHS.map((paragraph, index) => (
            <p key={index} className="md-body-medium text-on-surface-variant">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
