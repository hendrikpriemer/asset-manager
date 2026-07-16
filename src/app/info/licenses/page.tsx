import { InfoTabs } from "@/components/InfoTabs";
import { OpenSourceLicensesSection } from "@/components/OpenSourceLicensesSection";
import { OPEN_SOURCE_LICENSES } from "@/lib/open-source-licenses";

export default function InfoLicensesPage() {
  return (
    <main className="flex w-full flex-col gap-6 p-8">
      <h1 className="md-headline-medium text-on-background">Info</h1>
      <InfoTabs />
      <OpenSourceLicensesSection licenses={OPEN_SOURCE_LICENSES} />
    </main>
  );
}
