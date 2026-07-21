import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureNodeRow } from "./StructureNodeRow";

const showToast = vi.fn();

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast }),
}));

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

const {
  createStructureNode,
  updateStructureNode,
  deleteStructureNode,
  moveStructureNodeUp,
  moveStructureNodeDown,
} = vi.hoisted(() => ({
  createStructureNode: vi.fn(),
  updateStructureNode: vi.fn(),
  deleteStructureNode: vi.fn(),
  moveStructureNodeUp: vi.fn(),
  moveStructureNodeDown: vi.fn(),
}));

vi.mock("@/lib/asset-structure-actions", () => ({
  createStructureNode,
  updateStructureNode,
  deleteStructureNode,
  moveStructureNodeUp,
  moveStructureNodeDown,
}));

const { lookupTimezone } = vi.hoisted(() => ({
  lookupTimezone: vi.fn(),
}));

vi.mock("@/lib/timezone-actions", () => ({ lookupTimezone }));

const now = new Date("2026-01-01T00:00:00.000Z");

function makeNode(overrides: Partial<StructureTreeNode>): StructureTreeNode {
  return {
    id: "node",
    level: AssetStructureLevel.SITE,
    name: "Node",
    description: null,
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 0,
    parentId: "parent",
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
    assets: [],
    children: [],
    ...overrides,
  };
}

function buildFixtureTree() {
  const press = makeNode({
    id: "eq2",
    level: AssetStructureLevel.EQUIPMENT,
    name: "Press",
    parentId: "eq1",
  });
  const cnc = makeNode({
    id: "eq1",
    level: AssetStructureLevel.EQUIPMENT,
    name: "CNC",
    parentId: "site",
    children: [press],
  });
  const lathe = makeNode({
    id: "eq3",
    level: AssetStructureLevel.EQUIPMENT,
    name: "Lathe",
    parentId: "site",
    position: 1,
  });
  const site = makeNode({
    id: "site",
    level: AssetStructureLevel.SITE,
    name: "Laatzen",
    description: "Main site",
    parentId: "root",
    children: [cnc, lathe],
  });
  const root = makeNode({
    id: "root",
    level: AssetStructureLevel.ENTERPRISE,
    name: "Acme",
    parentId: null,
    children: [site],
  });
  return { root, site, cnc, lathe, press };
}

function renderRow(
  node: StructureTreeNode,
  overrides: Partial<{
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    isFirstChild: boolean;
    isLastChild: boolean;
  }> = {}
) {
  return render(
    <StructureNodeRow
      node={node}
      expandedIds={overrides.expandedIds ?? new Set()}
      onToggleExpand={overrides.onToggleExpand ?? vi.fn()}
      isFirstChild={overrides.isFirstChild ?? false}
      isLastChild={overrides.isLastChild ?? false}
    />
  );
}

describe("StructureNodeRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupTimezone.mockResolvedValue(null);
  });

  it("renders the node name, level badge, and description", () => {
    const { site } = buildFixtureTree();

    renderRow(site);

    expect(screen.getByText("Laatzen")).toBeInTheDocument();
    expect(screen.getByText("Site")).toBeInTheDocument();
    expect(screen.getByText("Main site")).toBeInTheDocument();
  });

  it("does not render children when collapsed", () => {
    const { site } = buildFixtureTree();

    renderRow(site, { expandedIds: new Set() });

    expect(screen.queryByText("CNC")).not.toBeInTheDocument();
  });

  it("renders children recursively when expanded, including flexibly-nested grandchildren", () => {
    const { site } = buildFixtureTree();

    renderRow(site, { expandedIds: new Set(["site", "eq1"]) });

    expect(screen.getByText("CNC")).toBeInTheDocument();
    expect(screen.getByText("Lathe")).toBeInTheDocument();
    expect(screen.getByText("Press")).toBeInTheDocument();
  });

  it("does not expand a nested child whose own id is not in expandedIds", () => {
    const { site } = buildFixtureTree();

    renderRow(site, { expandedIds: new Set(["site"]) });

    expect(screen.getByText("CNC")).toBeInTheDocument();
    expect(screen.queryByText("Press")).not.toBeInTheDocument();
  });

  it("does not render an expand button for a leaf node", () => {
    const { lathe } = buildFixtureTree();

    renderRow(lathe);

    expect(
      screen.queryByRole("button", { name: /expand lathe/i })
    ).not.toBeInTheDocument();
  });

  it("calls onToggleExpand with the node id when the expand button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();
    const { site } = buildFixtureTree();

    renderRow(site, { onToggleExpand });

    await user.click(screen.getByRole("button", { name: /expand laatzen/i }));

    expect(onToggleExpand).toHaveBeenCalledWith("site");
  });

  it("disables Move Up for the first child and Move Down for the last child", () => {
    const { cnc } = buildFixtureTree();

    renderRow(cnc, { isFirstChild: true, isLastChild: false });

    expect(screen.getByRole("button", { name: "Move CNC up" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move CNC down" })
    ).not.toBeDisabled();
  });

  it("calls moveStructureNodeUp/Down when the buttons are enabled and clicked", async () => {
    const user = userEvent.setup();
    const { cnc } = buildFixtureTree();

    renderRow(cnc, { isFirstChild: false, isLastChild: false });

    await user.click(screen.getByRole("button", { name: "Move CNC up" }));
    await user.click(screen.getByRole("button", { name: "Move CNC down" }));

    expect(moveStructureNodeUp).toHaveBeenCalledWith("eq1");
    expect(moveStructureNodeDown).toHaveBeenCalledWith("eq1");
  });

  it("renames the node and closes the form on success", async () => {
    const user = userEvent.setup();
    updateStructureNode.mockResolvedValue({ error: null });
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Site");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateStructureNode).toHaveBeenCalledTimes(1));
    const [id, , formData] = updateStructureNode.mock.calls[0];
    expect(id).toBe("site");
    expect(formData.get("name")).toBe("Renamed Site");
    await waitFor(() =>
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalled();
  });

  it("keeps the rename form open and shows the error on failure", async () => {
    const user = userEvent.setup();
    updateStructureNode.mockResolvedValue({ error: "Name is required." });
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name is required."
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("pre-fills an empty description field for a node without a description", async () => {
    const user = userEvent.setup();
    const { lathe } = buildFixtureTree();

    renderRow(lathe);
    await user.click(screen.getByRole("button", { name: "Rename" }));

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("toggles the rename form closed when Rename is clicked again", async () => {
    const user = userEvent.setup();
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("toggles the add-child form closed when Add child is clicked again", async () => {
    const user = userEvent.setup();
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Add child" }));
    expect(screen.getByLabelText("Level")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add child" }));
    expect(screen.queryByLabelText("Level")).not.toBeInTheDocument();
  });

  it("cancels the rename form without submitting", async () => {
    const user = userEvent.setup();
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(updateStructureNode).not.toHaveBeenCalled();
  });

  it("offers all addable levels (not Enterprise) when adding a child", async () => {
    const user = userEvent.setup();
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Add child" }));

    const select = screen.getByLabelText("Level");
    const optionLabels = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(optionLabels).toEqual(["Site", "Area", "Work Center", "Equipment"]);
  });

  it("creates a child node and closes the form on success", async () => {
    const user = userEvent.setup();
    createStructureNode.mockResolvedValue({ error: null });
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Add child" }));
    await user.type(screen.getByLabelText("Name"), "New Line");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createStructureNode).toHaveBeenCalledTimes(1));
    const [parentId, , formData] = createStructureNode.mock.calls[0];
    expect(parentId).toBe("site");
    expect(formData.get("name")).toBe("New Line");
    await waitFor(() =>
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument()
    );
  });

  it("keeps the add-child form open and shows the error on failure", async () => {
    const user = userEvent.setup();
    createStructureNode.mockResolvedValue({ error: "Name is required." });
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Add child" }));
    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name is required."
    );
  });

  it("cancels the add-child form without submitting", async () => {
    const user = userEvent.setup();
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Add child" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Level")).not.toBeInTheDocument();
    expect(createStructureNode).not.toHaveBeenCalled();
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteStructureNode).not.toHaveBeenCalled();
  });

  it("deletes the node and shows a toast when confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteStructureNode).toHaveBeenCalledWith("site")
    );
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("navigates back to /asset-structure after deleting the root", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { root } = buildFixtureTree();

    renderRow(root);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteStructureNode).toHaveBeenCalledWith("root")
    );
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/asset-structure")
    );
  });

  it("shows the root-specific confirmation message for a node with no parent", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { root } = buildFixtureTree();

    renderRow(root);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("entire asset structure")
    );
  });

  it("shows the subtree-specific confirmation message for a non-root node", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { site } = buildFixtureTree();

    renderRow(site);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Laatzen"));
  });

  describe("level-specific fields", () => {
    it("shows pre-filled Address and Timezone fields when renaming a Site node", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();
      const siteWithDetails = {
        ...site,
        address: "Hansastr. 27, Minden, Germany",
        timezone: "Europe/Berlin",
      };

      renderRow(siteWithDetails);
      await user.click(screen.getByRole("button", { name: "Rename" }));

      expect(screen.getByLabelText("Address")).toHaveValue(
        "Hansastr. 27, Minden, Germany"
      );
      expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Berlin");
      expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
    });

    it("shows pre-filled Manufacturer and Serial number fields when renaming an Equipment node", async () => {
      const user = userEvent.setup();
      const { cnc } = buildFixtureTree();
      const cncWithDetails = {
        ...cnc,
        manufacturer: "Acme Machine Works",
        serialNumber: "SN-1",
      };

      renderRow(cncWithDetails);
      await user.click(screen.getByRole("button", { name: "Rename" }));

      expect(screen.getByLabelText("Manufacturer")).toHaveValue(
        "Acme Machine Works"
      );
      expect(screen.getByLabelText("Serial number")).toHaveValue("SN-1");
      expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
    });

    it("shows neither Site nor Equipment fields when renaming an Enterprise node", async () => {
      const user = userEvent.setup();
      const { root } = buildFixtureTree();

      renderRow(root);
      await user.click(screen.getByRole("button", { name: "Rename" }));

      expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
    });

    it("looks up and auto-fills the timezone when the rename form's address field is blurred", async () => {
      const user = userEvent.setup();
      lookupTimezone.mockResolvedValue("Europe/Berlin");
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.type(screen.getByLabelText("Address"), "Minden, Germany");
      await user.tab();

      await waitFor(() =>
        expect(lookupTimezone).toHaveBeenCalledWith("Minden, Germany")
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Berlin")
      );
    });

    it("shows a spinner while the rename form's timezone lookup is in flight", async () => {
      const user = userEvent.setup();
      let resolveLookup!: (timezone: string | null) => void;
      lookupTimezone.mockImplementation(
        () => new Promise((resolve) => (resolveLookup = resolve))
      );
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.type(screen.getByLabelText("Address"), "Minden, Germany");
      await user.tab();

      expect(
        await screen.findByRole("status", { name: "Detecting timezone" })
      ).toBeInTheDocument();

      resolveLookup("Europe/Berlin");

      await waitFor(() =>
        expect(
          screen.queryByRole("status", { name: "Detecting timezone" })
        ).not.toBeInTheDocument()
      );
    });

    it("does not look up the timezone when the rename form's address field is blurred empty", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.click(screen.getByLabelText("Address"));
      await user.tab();

      expect(lookupTimezone).not.toHaveBeenCalled();
    });

    it("leaves the rename form's timezone untouched when the lookup finds nothing", async () => {
      const user = userEvent.setup();
      lookupTimezone.mockResolvedValue(null);
      const { site } = buildFixtureTree();
      const siteWithTimezone = { ...site, timezone: "Europe/Berlin" };

      renderRow(siteWithTimezone);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.type(screen.getByLabelText("Address"), "Nowhere");
      await user.tab();

      await waitFor(() => expect(lookupTimezone).toHaveBeenCalled());
      expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Berlin");
    });

    it("resets the rename form's address and timezone when reopened after cancelling", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();
      const siteWithDetails = {
        ...site,
        address: "Original address",
        timezone: "Europe/Berlin",
      };

      renderRow(siteWithDetails);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.clear(screen.getByLabelText("Address"));
      await user.type(screen.getByLabelText("Address"), "Changed address");
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await user.click(screen.getByRole("button", { name: "Rename" }));
      expect(screen.getByLabelText("Address")).toHaveValue("Original address");
    });

    it("shows Address and Timezone fields by default when adding a child (Site is the default level)", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));

      expect(screen.getByLabelText("Address")).toHaveValue("");
      expect(screen.getByLabelText("Timezone")).toHaveValue("");
    });

    it("switches to Manufacturer and Serial number fields when the level is changed to Equipment", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.selectOptions(screen.getByLabelText("Level"), "EQUIPMENT");

      expect(screen.getByLabelText("Manufacturer")).toBeInTheDocument();
      expect(screen.getByLabelText("Serial number")).toBeInTheDocument();
      expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
    });

    it("looks up and auto-fills the timezone when the add-child form's address field is blurred", async () => {
      const user = userEvent.setup();
      lookupTimezone.mockResolvedValue("Europe/Berlin");
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.type(screen.getByLabelText("Address"), "Minden, Germany");
      await user.tab();

      await waitFor(() =>
        expect(lookupTimezone).toHaveBeenCalledWith("Minden, Germany")
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Timezone")).toHaveValue("Europe/Berlin")
      );
    });

    it("shows a spinner while the add-child form's timezone lookup is in flight", async () => {
      const user = userEvent.setup();
      let resolveLookup!: (timezone: string | null) => void;
      lookupTimezone.mockImplementation(
        () => new Promise((resolve) => (resolveLookup = resolve))
      );
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.type(screen.getByLabelText("Address"), "Minden, Germany");
      await user.tab();

      expect(
        await screen.findByRole("status", { name: "Detecting timezone" })
      ).toBeInTheDocument();

      resolveLookup("Europe/Berlin");

      await waitFor(() =>
        expect(
          screen.queryByRole("status", { name: "Detecting timezone" })
        ).not.toBeInTheDocument()
      );
    });

    it("leaves the add-child form's timezone untouched when the lookup finds nothing", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.type(screen.getByLabelText("Address"), "Nowhere");
      await user.tab();

      await waitFor(() => expect(lookupTimezone).toHaveBeenCalled());
      expect(screen.getByLabelText("Timezone")).toHaveValue("");
    });

    it("does not look up the timezone when the add-child form's address field is blurred empty", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.click(screen.getByLabelText("Address"));
      await user.tab();

      expect(lookupTimezone).not.toHaveBeenCalled();
    });

    it("resets the add-child form's level, address, and timezone when reopened after cancelling", async () => {
      const user = userEvent.setup();
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.selectOptions(screen.getByLabelText("Level"), "EQUIPMENT");
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await user.click(screen.getByRole("button", { name: "Add child" }));
      expect(screen.getByLabelText("Level")).toHaveValue("SITE");
    });

    it("includes address and timezone in the submitted form data when renaming a Site node", async () => {
      const user = userEvent.setup();
      updateStructureNode.mockResolvedValue({ error: null });
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Rename" }));
      await user.type(screen.getByLabelText("Address"), "Minden, Germany");
      await user.type(screen.getByLabelText("Timezone"), "Europe/Berlin");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(updateStructureNode).toHaveBeenCalledTimes(1));
      const [, , formData] = updateStructureNode.mock.calls[0];
      expect(formData.get("address")).toBe("Minden, Germany");
      expect(formData.get("timezone")).toBe("Europe/Berlin");
    });

    it("allows manually editing the add-child form's Timezone field", async () => {
      const user = userEvent.setup();
      createStructureNode.mockResolvedValue({ error: null });
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.type(screen.getByLabelText("Name"), "New Site");
      await user.type(screen.getByLabelText("Timezone"), "Europe/Berlin");
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => expect(createStructureNode).toHaveBeenCalledTimes(1));
      const [, , formData] = createStructureNode.mock.calls[0];
      expect(formData.get("timezone")).toBe("Europe/Berlin");
    });

    it("includes manufacturer and serialNumber in the submitted form data when adding an Equipment child", async () => {
      const user = userEvent.setup();
      createStructureNode.mockResolvedValue({ error: null });
      const { site } = buildFixtureTree();

      renderRow(site);
      await user.click(screen.getByRole("button", { name: "Add child" }));
      await user.selectOptions(screen.getByLabelText("Level"), "EQUIPMENT");
      await user.type(screen.getByLabelText("Name"), "New Machine");
      await user.type(screen.getByLabelText("Manufacturer"), "Acme Machine Works");
      await user.type(screen.getByLabelText("Serial number"), "SN-999");
      await user.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() => expect(createStructureNode).toHaveBeenCalledTimes(1));
      const [, , formData] = createStructureNode.mock.calls[0];
      expect(formData.get("manufacturer")).toBe("Acme Machine Works");
      expect(formData.get("serialNumber")).toBe("SN-999");
    });
  });
});
