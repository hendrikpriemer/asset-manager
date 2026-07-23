import { getVisionProviderSetting } from "@/lib/vision-provider-settings";
import { VisionProviderWizard } from "@/components/VisionProviderWizard";

export default async function VisionProviderPage() {
  const existingSetting = await getVisionProviderSetting();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <VisionProviderWizard existingSetting={existingSetting} />
    </main>
  );
}
