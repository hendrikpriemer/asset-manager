import { notFound } from "next/navigation";
import { getVisionProviderSetting } from "@/lib/vision-provider-settings";
import { EditVisionProviderSection } from "@/components/EditVisionProviderSection";

export default async function EditVisionProviderPage() {
  const existingSetting = await getVisionProviderSetting();
  if (!existingSetting) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <EditVisionProviderSection
        provider={existingSetting.provider}
        model={existingSetting.model}
      />
    </main>
  );
}
