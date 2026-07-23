"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  deleteVisionProviderSetting,
  saveVisionProviderSetting,
  testVisionProviderConnection,
} from "@/lib/vision-provider-actions";
import type { VisionProviderType } from "@/lib/vision-providers/types";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

const FIELD_CLASSES =
  "rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const PROVIDER_LABELS: Record<VisionProviderType, string> = {
  ANTHROPIC: "Claude (Anthropic)",
  OPENAI: "ChatGPT (OpenAI)",
  MISTRAL: "Mistral",
};

export function VisionProviderWizard({
  existingSetting,
}: {
  existingSetting: { provider: VisionProviderType; model: string } | null;
}) {
  const isConfigured = existingSetting !== null;
  const router = useRouter();
  const [provider, setProvider] = useState<VisionProviderType>(
    existingSetting?.provider ?? "ANTHROPIC"
  );
  const [model, setModel] = useState(existingSetting?.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<"reachable" | "unreachable" | null>(null);
  const [isTesting, startTest] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  const [state, formAction, pending] = useActionState(saveVisionProviderSetting, {
    error: null,
  });
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setApiKey("");
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state, router]);

  function handleProviderChange(value: VisionProviderType) {
    setProvider(value);
    setTestResult(null);
  }

  function handleModelChange(value: string) {
    setModel(value);
    setTestResult(null);
  }

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setTestResult(null);
  }

  function handleTest() {
    startTest(async () => {
      const result = await testVisionProviderConnection(provider, model, apiKey);
      setTestResult(result.status);
    });
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("provider", provider);
    formData.set("model", model);
    formData.set("apiKey", apiKey);
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleRemove() {
    if (!window.confirm("Disable the vision-API fallback and remove the stored API key?")) {
      return;
    }
    startRemove(async () => {
      await deleteVisionProviderSetting();
      router.refresh();
    });
  }

  const hasUsableKey = apiKey.trim().length > 0 || isConfigured;
  const canSubmit = model.trim().length > 0 && hasUsableKey;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="md-headline-small text-on-surface">Vision Provider</h1>
        <p className="md-body-medium text-on-surface-variant">
          When plain OCR can&apos;t read a nameplate photo&apos;s article number, this
          vision-capable AI model is asked to read it instead. Optional - without a configured
          provider, only OCR is used.
        </p>
      </div>

      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Provider
        <select
          value={provider}
          onChange={(event) => handleProviderChange(event.target.value as VisionProviderType)}
          className={FIELD_CLASSES}
        >
          {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Model
        <input
          value={model}
          onChange={(event) => handleModelChange(event.target.value)}
          placeholder="e.g. claude-sonnet-5"
          className={FIELD_CLASSES}
        />
      </label>

      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        API key
        <input
          type="password"
          value={apiKey}
          onChange={(event) => handleApiKeyChange(event.target.value)}
          placeholder={isConfigured ? "Configured - leave blank to keep it" : "Paste your API key"}
          className={FIELD_CLASSES}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="text"
          onClick={handleTest}
          disabled={isTesting || !canSubmit}
        >
          <span className="flex items-center gap-2">
            {isTesting && <Spinner label="Checking connection" />}
            {isTesting ? "Checking…" : "Test connection"}
          </span>
        </Button>
        {testResult === "reachable" && (
          <p role="status" className="md-body-small text-on-surface">
            Connection successful.
          </p>
        )}
        {testResult === "unreachable" && (
          <p role="alert" className="md-body-small text-error">
            Could not connect with this provider/model/key.
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="md-body-small text-error">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSubmit || pending}
          className="w-fit"
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        {isConfigured && (
          <Button
            type="button"
            variant="text"
            color="error"
            onClick={handleRemove}
            disabled={isRemoving}
            className="w-fit"
          >
            {isRemoving ? "Removing…" : "Disable vision fallback"}
          </Button>
        )}
      </div>
    </div>
  );
}
