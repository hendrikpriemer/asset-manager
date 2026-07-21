import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({
    center,
    children,
  }: {
    center: [number, number];
    children: React.ReactNode;
  }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tile-layer" data-url={url} />
  ),
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)} />
  ),
}));

const { NameplateMap } = await import("./NameplateMap");

describe("NameplateMap", () => {
  it("renders a tile layer and a marker centered on the given coordinates", () => {
    render(<NameplateMap lat={52.2907} lon={8.9126} />);

    expect(screen.getByTestId("map-container")).toHaveAttribute(
      "data-center",
      JSON.stringify([52.2907, 8.9126])
    );
    expect(screen.getByTestId("marker")).toHaveAttribute(
      "data-position",
      JSON.stringify([52.2907, 8.9126])
    );
    expect(screen.getByTestId("tile-layer")).toHaveAttribute(
      "data-url",
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
  });
});
