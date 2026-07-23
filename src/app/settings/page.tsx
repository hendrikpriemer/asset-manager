import Link from "next/link";
import { Icon } from "@/components/Icon";

const SETTINGS_SECTIONS = [
  {
    href: "/settings/aas-repositories",
    icon: "dns",
    title: "AAS Repositories",
    description:
      "Register Asset Administration Shell (AAS) repositories to search when an asset is linked by global asset ID.",
  },
  {
    href: "/settings/vision-provider",
    icon: "visibility",
    title: "Vision Provider",
    description:
      "Configure an AI vision provider as a fallback for reading nameplate photos when plain OCR can't extract an article number.",
  },
];

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="md-headline-small text-on-surface">Settings</h1>
      <ul className="flex flex-col gap-2">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center gap-4 rounded-xs border border-outline-variant px-4 py-3 hover:bg-on-surface/8"
            >
              <Icon name={section.icon} className="text-on-surface-variant" />
              <div className="flex flex-col">
                <span className="md-label-large text-on-surface">{section.title}</span>
                <span className="md-body-small text-on-surface-variant">
                  {section.description}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
