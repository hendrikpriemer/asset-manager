import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetWizard } from "./AssetWizard";
import type { ActionState } from "@/lib/actions";
import type { AasCheckResult } from "@/lib/aas-actions";
import type { StructureOption } from "@/lib/asset-structure";

const { createAsset, updateAsset } = vi.hoisted(() => ({
  createAsset:
    vi.fn<
      (prevState: ActionState, formData: FormData) => Promise<ActionState>
    >(),
  updateAsset:
    vi.fn<
      (
        id: string,
        prevState: ActionState,
        formData: FormData
      ) => Promise<ActionState>
    >(),
}));
const { checkAasReference } = vi.hoisted(() => ({
  checkAasReference: vi.fn<
    (reference: {
      aasEndpointUrl: string | null;
      aasGlobalAssetId: string | null;
    }) => Promise<AasCheckResult>
  >(),
}));
const back = vi.fn();
const push = vi.fn();

vi.mock("@/lib/actions", () => ({ createAsset, updateAsset }));
vi.mock("@/lib/aas-actions", () => ({ checkAasReference }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

const structureOptions: StructureOption[] = [
  { id: "site-1", label: "Acme / Plant A" },
  { id: "equip-1", label: "Acme / Plant A / Lathe" },
];

beforeEach(() => {
  vi.clearAllMocks();
  createAsset.mockResolvedValue({ error: null });
  updateAsset.mockResolvedValue({ error: null });
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview-url"),
    revokeObjectURL: vi.fn(),
  });
});

async function fillIdentifyStep(name = "Sensor", description = "A sensor") {
  const user = userEvent.setup();
  const nameField = screen.getByLabelText("Name");
  const descriptionField = screen.getByLabelText("Description");
  await user.clear(nameField);
  if (name) await user.type(nameField, name);
  await user.clear(descriptionField);
  if (description) await user.type(descriptionField, description);
  return user;
}

async function goToAssignStep(name = "Sensor", description = "A sensor") {
  const user = await fillIdentifyStep(name, description);
  await user.click(screen.getByRole("button", { name: "Next step" }));
  await user.click(screen.getByRole("button", { name: "Next step" }));
  return user;
}

async function goToAasStep(name = "Sensor", description = "A sensor") {
  const user = await goToAssignStep(name, description);
  await user.click(screen.getByRole("button", { name: "Next step" }));
  return user;
}

async function goToSummaryStep(name = "Sensor", description = "A sensor") {
  const user = await goToAasStep(name, description);
  await user.click(screen.getByRole("button", { name: "Next step" }));
  return user;
}

describe("AssetWizard (create mode)", () => {
  it("renders the left panel heading, description, and step list", () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);

    expect(
      screen.getByRole("heading", { name: "Add new asset" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add a new asset, enter the required details, and assign it to a level in the asset structure."
      )
    ).toBeInTheDocument();
    const stepList = screen.getByRole("list");
    expect(within(stepList).getByText("Identify")).toBeInTheDocument();
    expect(within(stepList).getByText("Photos")).toBeInTheDocument();
    expect(
      within(stepList).getByText("Assign to asset structure")
    ).toBeInTheDocument();
    expect(within(stepList).getByText("AAS reference")).toBeInTheDocument();
    expect(within(stepList).getByText("Summary")).toBeInTheDocument();
  });

  it("shows the Identify step first, with Name and Description empty", () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);

    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Go back" })
    ).not.toBeInTheDocument();
  });

  it("disables Next step until both Name and Description are filled", async () => {
    const user = userEvent.setup();
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const nextButton = screen.getByRole("button", { name: "Next step" });

    expect(nextButton).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "Sensor");
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByLabelText("Description"), "A sensor");
    expect(nextButton).toBeEnabled();
  });

  it("treats whitespace-only input as not filled", async () => {
    const user = userEvent.setup();
    render(<AssetWizard mode="create" structureOptions={[]} />);

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.type(screen.getByLabelText("Description"), "   ");

    expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
  });

  it("advances to the Photos step, which is optional and shows the item name", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await fillIdentifyStep("Sensor", "A sensor");
    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getByText("Sensor")).toBeInTheDocument();
    expect(screen.getByText("Asset photo")).toBeInTheDocument();
    expect(screen.getByText("Nameplate photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next step" })).toBeEnabled();
  });

  it("skips the Photos step without selecting any image", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    await goToAssignStep();

    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Assign to asset structure" })
    ).toBeInTheDocument();
  });

  it("shows a structure select with an Unassigned default when a structure exists", async () => {
    render(<AssetWizard mode="create" structureOptions={structureOptions} />);
    await goToAssignStep();

    const select = screen.getByLabelText("Structure");
    expect(select).toHaveValue("");
    const optionLabels = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent
    );
    expect(optionLabels).toEqual([
      "Unassigned",
      "Acme / Plant A",
      "Acme / Plant A / Lathe",
    ]);
  });

  it("shows an explanatory message instead of a select when no structure exists", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    await goToAssignStep();

    expect(
      screen.getByText(
        "No asset structure exists yet, so the asset will be added to Unassigned Assets."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Structure")).not.toBeInTheDocument();
  });

  it("advances to the AAS reference step, which is optional and empty by default", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    await goToAasStep();

    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AAS reference" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("AAS endpoint URL or global asset ID")
    ).toHaveValue("");
    expect(screen.getByRole("button", { name: "Next step" })).toBeEnabled();
  });

  it("disables Test connection until the AAS reference field is filled", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    await goToAasStep();

    expect(
      screen.getByRole("button", { name: "Test connection" })
    ).toBeDisabled();

    await userEvent
      .setup()
      .type(
        screen.getByLabelText("AAS endpoint URL or global asset ID"),
        "http://example.com/shells/abc"
      );

    expect(
      screen.getByRole("button", { name: "Test connection" })
    ).toBeEnabled();
  });

  it("shows a spinner while the connection check is in flight", async () => {
    let resolveCheck!: (result: AasCheckResult) => void;
    checkAasReference.mockImplementation(
      () => new Promise((resolve) => (resolveCheck = resolve))
    );
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep();
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "http://example.com/shells/abc"
    );

    await user.click(screen.getByRole("button", { name: /Test connection/ }));

    expect(
      screen.getByRole("status", { name: "Checking connection" })
    ).toBeInTheDocument();

    resolveCheck({ status: "resolved", idShort: "TestLathe1" });

    expect(await screen.findByText("Resolved: TestLathe1")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Checking connection" })
    ).not.toBeInTheDocument();
  });

  it("classifies a value containing /shells/ as an endpoint URL when testing the connection", async () => {
    checkAasReference.mockResolvedValue({
      status: "resolved",
      idShort: "TestLathe1",
    });
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep();
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "http://example.com/shells/abc"
    );

    await user.click(screen.getByRole("button", { name: "Test connection" }));

    expect(await screen.findByText("Resolved: TestLathe1")).toBeInTheDocument();
    expect(checkAasReference).toHaveBeenCalledWith({
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });
  });

  it("classifies a value without /shells/ as a globalAssetId when testing the connection", async () => {
    checkAasReference.mockResolvedValue({ status: "unresolved" });
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep();
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "https://example.com/assets/abc"
    );

    await user.click(screen.getByRole("button", { name: "Test connection" }));

    expect(
      await screen.findByText("Could not resolve this AAS reference.")
    ).toBeInTheDocument();
    expect(checkAasReference).toHaveBeenCalledWith({
      aasEndpointUrl: null,
      aasGlobalAssetId: "https://example.com/assets/abc",
    });
  });

  it("clears the Test connection result when the field is edited again", async () => {
    checkAasReference.mockResolvedValue({
      status: "resolved",
      idShort: "TestLathe1",
    });
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep();
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "http://example.com/shells/abc"
    );
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    await screen.findByText("Resolved: TestLathe1");

    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "2"
    );

    expect(screen.queryByText("Resolved: TestLathe1")).not.toBeInTheDocument();
  });

  it("goes back a step at a time and keeps the entered values", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAssignStep("Sensor", "A sensor");

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Sensor");
    expect(screen.getByLabelText("Description")).toHaveValue("A sensor");
  });

  it("attaches a selected photo in the Photos step and reflects it in the summary", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await fillIdentifyStep("Sensor", "A sensor");
    await user.click(screen.getByRole("button", { name: "Next step" }));

    const file = new File(["asset-bytes"], "asset.jpg", {
      type: "image/jpeg",
    });
    await user.click(screen.getAllByRole("button", { name: "Upload" })[0]);
    const input = screen.getByLabelText("Asset photo", { selector: "input" });
    await user.upload(input, file);

    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    const assetPhotoRow = screen.getByText("Asset photo").closest("div");
    expect(within(assetPhotoRow!).getByText("Provided")).toBeInTheDocument();
    expect(screen.getByText("Nameplate photo")).toBeInTheDocument();
  });

  it("shows a summary of the entered values on the last step", async () => {
    render(<AssetWizard mode="create" structureOptions={structureOptions} />);
    const user = await goToAssignStep("Sensor", "A sensor");
    await user.selectOptions(screen.getByLabelText("Structure"), "site-1");
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Summary" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Sensor")).toHaveLength(2);
    expect(screen.getByText("A sensor")).toBeInTheDocument();
    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
    expect(screen.getByText("Not linked")).toBeInTheDocument();
    expect(screen.getAllByText("Not provided")).toHaveLength(2);
    expect(
      screen.getByText("Review the details, then select Apply to create the asset.")
    ).toBeInTheDocument();
  });

  it("shows the entered AAS reference value in the summary", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep("Sensor", "A sensor");
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "http://example.com/shells/abc"
    );
    await user.click(screen.getByRole("button", { name: "Next step" }));

    const aasDt = screen
      .getAllByText("AAS reference")
      .find((element) => element.tagName === "DT");
    expect(
      within(aasDt!.closest("div")!).getByText(
        "http://example.com/shells/abc"
      )
    ).toBeInTheDocument();
  });

  it("shows Unassigned in the summary when no structure was selected", async () => {
    render(<AssetWizard mode="create" structureOptions={structureOptions} />);
    await goToSummaryStep("Sensor", "A sensor");

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("submits the collected values to createAsset when Apply is clicked", async () => {
    render(<AssetWizard mode="create" structureOptions={structureOptions} />);
    const user = await goToAssignStep("Sensor", "A sensor");
    await user.selectOptions(screen.getByLabelText("Structure"), "site-1");
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(createAsset).toHaveBeenCalledTimes(1));
    const [, formData] = createAsset.mock.calls[0];
    expect(formData.get("name")).toBe("Sensor");
    expect(formData.get("description")).toBe("A sensor");
    expect(formData.get("structureNodeId")).toBe("site-1");
    expect(formData.get("aasReference")).toBe("");
    expect(formData.get("assetImage")).toBeNull();
    expect(formData.get("nameplateImage")).toBeNull();
    expect(updateAsset).not.toHaveBeenCalled();
  });

  it("includes the entered AAS reference value in the submitted form data", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToAasStep("Sensor", "A sensor");
    await user.type(
      screen.getByLabelText("AAS endpoint URL or global asset ID"),
      "http://example.com/shells/abc"
    );
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(createAsset).toHaveBeenCalledTimes(1));
    const [, formData] = createAsset.mock.calls[0];
    expect(formData.get("aasReference")).toBe(
      "http://example.com/shells/abc"
    );
  });

  it("includes selected photos in the submitted form data", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await fillIdentifyStep("Sensor", "A sensor");
    await user.click(screen.getByRole("button", { name: "Next step" }));

    const assetFile = new File(["asset-bytes"], "asset.jpg", {
      type: "image/jpeg",
    });
    const nameplateFile = new File(["nameplate-bytes"], "nameplate.png", {
      type: "image/png",
    });
    await user.upload(
      screen.getByLabelText("Asset photo", { selector: "input" }),
      assetFile
    );
    await user.upload(
      screen.getByLabelText("Nameplate photo", { selector: "input" }),
      nameplateFile
    );
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(createAsset).toHaveBeenCalledTimes(1));
    const [, formData] = createAsset.mock.calls[0];
    expect(formData.get("assetImage")).toBe(assetFile);
    expect(formData.get("nameplateImage")).toBe(nameplateFile);
  });

  it("shows Applying… and disables Go back/Apply while the action is pending", async () => {
    let resolveAction!: (state: ActionState) => void;
    createAsset.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    render(<AssetWizard mode="create" structureOptions={[]} />);
    await goToSummaryStep("Sensor", "A sensor");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("button", { name: "Applying…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Go back" })).toBeDisabled();

    resolveAction({ error: null });
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });

  it("displays the error returned by the action and does not navigate away", async () => {
    createAsset.mockResolvedValue({ error: "Name is required." });
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToSummaryStep("Sensor", "A sensor");

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name is required."
    );
    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates back by default when the asset is created successfully", async () => {
    render(<AssetWizard mode="create" structureOptions={[]} />);
    const user = await goToSummaryStep("Sensor", "A sensor");

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it("pushes to successHref instead of navigating back when given", async () => {
    render(
      <AssetWizard
        mode="create"
        structureOptions={[]}
        successHref="/asset-structure/table"
      />
    );
    const user = await goToSummaryStep("Sensor", "A sensor");

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/asset-structure/table")
    );
    expect(back).not.toHaveBeenCalled();
  });
});

describe("AssetWizard (edit mode)", () => {
  function renderEdit(overrides: Partial<Parameters<typeof AssetWizard>[0]> = {}) {
    return render(
      <AssetWizard
        mode="edit"
        assetId="asset-1"
        initialName="Lathe"
        initialDescription="Main lathe"
        initialStructureNodeId=""
        initialAasReference=""
        existingAssetImageUrl={null}
        existingNameplateImageUrl={null}
        structureOptions={structureOptions}
        {...overrides}
      />
    );
  }

  it("renders Edit asset heading and edit-specific intro text", () => {
    renderEdit();

    expect(
      screen.getByRole("heading", { name: "Edit asset" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Edit the asset's details, update its photos, and reassign it to a level in the asset structure."
      )
    ).toBeInTheDocument();
  });

  it("pre-fills Name, Description, and Structure from the initial values", async () => {
    renderEdit({ initialStructureNodeId: "site-1" });

    expect(screen.getByLabelText("Name")).toHaveValue("Lathe");
    expect(screen.getByLabelText("Description")).toHaveValue("Main lathe");

    await goToAssignStep("Lathe", "Main lathe");
    expect(screen.getByLabelText("Structure")).toHaveValue("site-1");
  });

  it("pre-fills the AAS reference field from the initial value", async () => {
    renderEdit({
      initialAasReference: "http://example.com/shells/abc",
    });

    await goToAasStep("Lathe", "Main lathe");
    expect(
      screen.getByLabelText("AAS endpoint URL or global asset ID")
    ).toHaveValue("http://example.com/shells/abc");
  });

  it("shows the existing photos as previews in the Photos step", async () => {
    renderEdit({
      existingAssetImageUrl: "/api/assets/asset-1/images/asset",
      existingNameplateImageUrl: "/api/assets/asset-1/images/nameplate",
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByAltText("Asset photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/asset"
    );
    expect(screen.getByAltText("Nameplate photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/nameplate"
    );
  });

  it("shows Provided in the summary for an untouched existing photo", async () => {
    renderEdit({ existingAssetImageUrl: "/api/assets/asset-1/images/asset" });
    await goToSummaryStep("Lathe", "Main lathe");

    const assetPhotoRow = screen.getByText("Asset photo").closest("div");
    expect(within(assetPhotoRow!).getByText("Provided")).toBeInTheDocument();
  });

  it("does not send assetImage or a removed marker when the existing photo is left untouched", async () => {
    renderEdit({ existingAssetImageUrl: "/api/assets/asset-1/images/asset" });
    const user = await goToSummaryStep("Lathe", "Main lathe");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateAsset).toHaveBeenCalledTimes(1));
    const [id, , formData] = updateAsset.mock.calls[0];
    expect(id).toBe("asset-1");
    expect(formData.get("assetImage")).toBeNull();
    expect(formData.get("assetImageRemoved")).toBeNull();
  });

  it("marks the existing photo as removed and sends the removal flag", async () => {
    renderEdit({ existingAssetImageUrl: "/api/assets/asset-1/images/asset" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next step" }));

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getAllByRole("button", { name: "Upload" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    const assetPhotoRow = screen.getByText("Asset photo").closest("div");
    expect(
      within(assetPhotoRow!).getByText("Not provided")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateAsset).toHaveBeenCalledTimes(1));
    const [, , formData] = updateAsset.mock.calls[0];
    expect(formData.get("assetImage")).toBeNull();
    expect(formData.get("assetImageRemoved")).toBe("true");
  });

  it("marks the existing nameplate photo as removed and sends its removal flag", async () => {
    renderEdit({
      existingNameplateImageUrl: "/api/assets/asset-1/images/nameplate",
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next step" }));

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateAsset).toHaveBeenCalledTimes(1));
    const [, , formData] = updateAsset.mock.calls[0];
    expect(formData.get("nameplateImage")).toBeNull();
    expect(formData.get("nameplateImageRemoved")).toBe("true");
  });

  it("replaces the existing photo with a newly uploaded one", async () => {
    renderEdit({ existingAssetImageUrl: "/api/assets/asset-1/images/asset" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next step" }));

    await user.click(screen.getByRole("button", { name: "Remove" }));
    const newFile = new File(["new-bytes"], "new.jpg", {
      type: "image/jpeg",
    });
    await user.upload(
      screen.getByLabelText("Asset photo", { selector: "input" }),
      newFile
    );

    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateAsset).toHaveBeenCalledTimes(1));
    const [, , formData] = updateAsset.mock.calls[0];
    expect(formData.get("assetImage")).toBe(newFile);
    expect(formData.get("assetImageRemoved")).toBeNull();
  });

  it("shows Saving… while pending and Save when idle", async () => {
    let resolveAction!: (state: ActionState) => void;
    updateAsset.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      })
    );
    renderEdit();
    const user = await goToSummaryStep("Lathe", "Main lathe");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    resolveAction({ error: null });
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });
});
