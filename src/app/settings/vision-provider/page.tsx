import { getVisionProviderSetting } from "@/lib/vision-provider-settings";
import { VisionProviderSection } from "@/components/VisionProviderSection";

export default async function VisionProviderPage() {
  const existingSetting = await getVisionProviderSetting();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <VisionProviderSection existingSetting={existingSetting} />
    </main>
  );
}
