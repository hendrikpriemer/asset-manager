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

const now = new Date("2026-01-01T00:00:00.000Z");

function makeNode(overrides: Partial<StructureTreeNode>): StructureTreeNode {
  return {
    id: "node",
    level: AssetStructureLevel.SITE,
    name: "Node",
    description: null,
    position: 0,
    parentId: "parent",
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
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
});
