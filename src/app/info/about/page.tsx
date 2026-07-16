import { AboutSection } from "@/components/AboutSection";
import { InfoTabs } from "@/components/InfoTabs";
import packageJson from "../../../../package.json";

export default function InfoAboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="md-headline-medium text-on-background">Info</h1>
      <InfoTabs />
      <AboutSection appName="Asset Manager" version={packageJson.version} />
    </main>
  );
}
