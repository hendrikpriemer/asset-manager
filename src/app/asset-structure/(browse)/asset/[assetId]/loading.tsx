import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Loading asset" className="text-4xl" />
    </div>
  );
}
