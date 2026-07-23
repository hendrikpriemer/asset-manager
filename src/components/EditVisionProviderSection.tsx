import { VisionProviderWizard } from "@/components/VisionProviderWizard";
import type { VisionProviderType } from "@/lib/vision-providers/types";

export function EditVisionProviderSection({
  provider,
  model,
}: {
  provider: VisionProviderType;
  model: string;
}) {
  return <VisionProviderWizard mode="edit" initialProvider={provider} initialModel={model} />;
}
