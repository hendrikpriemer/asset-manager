import Link from "next/link";
import { deleteVisionProviderSetting } from "@/lib/vision-provider-actions";
import type { VisionProviderType } from "@/lib/vision-providers/types";
import { BackLink } from "@/components/BackLink";
import { DeleteVisionProviderButton } from "@/components/DeleteVisionProviderButton";
import { Icon } from "@/components/Icon";
import { Tooltip } from "@/components/Tooltip";

const PROVIDER_LABELS: Record<VisionProviderType, string> = {
  ANTHROPIC: "Claude (Anthropic)",
  OPENAI: "ChatGPT (OpenAI)",
  MISTRAL: "Mistral",
};

export function VisionProviderSection({
  existingSetting,
}: {
  existingSetting: { provider: VisionProviderType; model: string } | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/settings" label="Settings" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="md-headline-small text-on-surface">Vision Provider</h1>
          <p className="md-body-medium text-on-surface-variant">
            When plain OCR can&apos;t read a nameplate photo&apos;s article number, this
            vision-capable AI model is asked to read it instead. Optional - without a configured
            provider, only OCR is used.
          </p>
        </div>
        {!existingSetting && (
          <Tooltip label="Add vision provider">
            <Link
              href="/settings/vision-provider/new"
              aria-label="Add vision provider"
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-on-primary lg:px-6"
            >
              <Icon name="add" />
              <span className="hidden md-label-large lg:inline">Add vision provider</span>
            </Link>
          </Tooltip>
        )}
      </div>

      {!existingSetting ? (
        <p className="md-body-medium text-on-surface-variant">
          No vision provider configured yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          <li className="flex items-center justify-between gap-4 rounded-xs border border-outline-variant px-4 py-3">
            <div className="flex flex-col">
              <span className="md-label-large text-on-surface">
                {PROVIDER_LABELS[existingSetting.provider]}
              </span>
              <span className="md-body-small text-on-surface-variant">
                {existingSetting.model}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip label="Edit">
                <Link
                  href="/settings/vision-provider/edit"
                  aria-label="Edit vision provider"
                  className="inline-flex items-center justify-center rounded-full p-2 text-on-surface-variant hover:bg-on-surface/8"
                >
                  <Icon name="edit" />
                </Link>
              </Tooltip>
              <Tooltip label="Delete">
                <DeleteVisionProviderButton
                  deleteVisionProviderAction={deleteVisionProviderSetting}
                />
              </Tooltip>
            </div>
          </li>
        </ul>
      )}
    </div>
  );
}
