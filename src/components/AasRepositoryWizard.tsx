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
  createAasRepository,
  testAasRepositoryConnection,
  updateAasRepository,
} from "@/lib/aas-repository-actions";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

const FIELD_CLASSES =
  "rounded-xs border border-outline bg-surface px-3 py-2 md-body-large text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

type AasRepositoryWizardProps =
  | { mode: "create" }
  | {
      mode: "edit";
      repositoryId: string;
      initialName: string;
      initialBaseUrl: string;
    };

export function AasRepositoryWizard(props: AasRepositoryWizardProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const [name, setName] = useState(isEdit ? props.initialName : "");
  const [baseUrl, setBaseUrl] = useState(isEdit ? props.initialBaseUrl : "");
  const [testResult, setTestResult] = useState<
    "reachable" | "unreachable" | null
  >(null);
  const [isTesting, startTest] = useTransition();

  const action = isEdit
    ? updateAasRepository.bind(null, props.repositoryId)
    : createAasRepository;
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      router.back();
    }
    wasPending.current = pending;
  }, [pending, state, router]);

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    setTestResult(null);
  }

  function handleTest() {
    startTest(async () => {
      const result = await testAasRepositoryConnection(baseUrl);
      setTestResult(result.status);
    });
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("baseUrl", baseUrl);
    startTransition(() => {
      formAction(formData);
    });
  }

  const canSave = name.trim().length > 0 && testResult === "reachable" && !pending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="md-title-medium text-on-surface">
          {isEdit ? "Edit repository" : "Add repository"}
        </h2>
        <p className="md-body-medium text-on-surface-variant">
          {isEdit
            ? "Update this repository's details. Test the connection before saving."
            : "Register another Asset Administration Shell (AAS) repository to search when an asset is linked by global asset ID. Test the connection before saving."}
        </p>
      </div>

      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          placeholder="e.g. WAGO"
          className={FIELD_CLASSES}
        />
      </label>

      <label className="flex flex-col gap-1 md-body-small text-on-surface-variant">
        Base URL
        <input
          value={baseUrl}
          onChange={(event) => handleBaseUrlChange(event.target.value)}
          placeholder="https://c1.api.wago.com/smartdata-aas-env"
          className={FIELD_CLASSES}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="text"
          onClick={handleTest}
          disabled={isTesting || !baseUrl.trim()}
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
            Could not connect to this repository.
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="md-body-small text-error">
          {state.error}
        </p>
      )}

      <Button type="button" onClick={handleSave} disabled={!canSave} className="w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
