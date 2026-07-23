import { notFound } from "next/navigation";
import { Modal } from "@/components/Modal";
import { getVisionProviderSetting } from "@/lib/vision-provider-settings";
import { EditVisionProviderSection } from "@/components/EditVisionProviderSection";

export default async function EditVisionProviderModal() {
  const existingSetting = await getVisionProviderSetting();
  if (!existingSetting) {
    notFound();
  }

  return (
    <Modal>
      <EditVisionProviderSection
        provider={existingSetting.provider}
        model={existingSetting.model}
      />
    </Modal>
  );
}
