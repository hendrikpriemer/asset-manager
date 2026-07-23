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

// Fixed-length, not derived from the real key's length (which never reaches
// the client) - purely a visual "a key is stored" cue, masked like any other
// password field. Focusing the field clears it so the user starts a genuine
// new value instead of editing this placeholder.
const STORED_KEY_PLACEHOLDER = "•".repeat(16);

type VisionProviderWizardProps =
  | { mode: "create" }
  | {
      mode: "edit";
      initialProvider: VisionProviderType;
      initialModel: string;
    };

export function VisionProviderWizard(props: VisionProviderWizardProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [provider, setProvider] = useState<VisionProviderType>(
    isEdit ? props.initialProvider : "ANTHROPIC"
  );
  const [model, setModel] = useState(isEdit ? props.initialModel : "");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEdited, setApiKeyEdited] = useState(false);
  const [testResult, setTestResult] = useState<"reachable" | "unreachable" | null>(null);
  const [isTesting, startTest] = useTransition();

  const [state, formAction, pending] = useActionState(saveVisionProviderSetting, {
    error: null,
  });
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      router.back();
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
    setApiKeyEdited(true);
    setTestResult(null);
  }

  /** Clears the placeholder dots on focus so the user types a genuine new key instead of editing them. */
  function handleApiKeyFocus() {
    if (isEdit && !apiKeyEdited) {
      setApiKey("");
      setApiKeyEdited(true);
      setTestResult(null);
    }
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

  const hasUsableKey = apiKey.trim().length > 0 || isEdit;
  const canSubmit = model.trim().length > 0 && hasUsableKey;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="md-title-medium text-on-surface">
          {isEdit ? "Edit vision provider" : "Add vision provider"}
        </h2>
        <p className="md-body-medium text-on-surface-variant">
          {isEdit
            ? "Update this vision provider's details. Test the connection before saving."
            : "Configure a vision-capable AI model as a fallback for reading nameplate photos when plain OCR can't extract an article number."}
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
          value={isEdit && !apiKeyEdited ? STORED_KEY_PLACEHOLDER : apiKey}
          onChange={(event) => handleApiKeyChange(event.target.value)}
          onFocus={handleApiKeyFocus}
          placeholder="Paste your API key"
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

      <Button type="button" onClick={handleSave} disabled={!canSubmit || pending} className="w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
