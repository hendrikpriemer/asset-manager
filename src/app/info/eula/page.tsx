import { EulaSection } from "@/components/EulaSection";
import { InfoTabs } from "@/components/InfoTabs";

export default function InfoEulaPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="md-headline-medium text-on-background">Info</h1>
      <InfoTabs />
      <EulaSection />
    </main>
  );
}
