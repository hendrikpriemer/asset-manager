import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageCaptureField } from "./ImageCaptureField";

function makeFakeStream() {
  const stop = vi.fn();
  return {
    stop,
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
  };
}

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview-url"),
    revokeObjectURL: vi.fn(),
  });
});

describe("ImageCaptureField", () => {
  it("renders the label and the Upload/Take photo buttons when no file is set", () => {
    render(<ImageCaptureField label="Asset photo" file={null} onChange={vi.fn()} />);

    expect(screen.getByText("Asset photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Take photo" })
    ).toBeInTheDocument();
  });

  it("calls onChange with the selected file when uploading", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ImageCaptureField label="Asset photo" file={null} onChange={onChange} />);
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });

    await user.click(screen.getByRole("button", { name: "Upload" }));
    const input = screen.getByLabelText("Asset photo", { selector: "input" });
    await user.upload(input, file);

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("does not call onChange when the file dialog is dismissed without a selection", () => {
    const onChange = vi.fn();
    render(<ImageCaptureField label="Asset photo" file={null} onChange={onChange} />);
    const input = screen.getByLabelText("Asset photo", { selector: "input" });

    fireEvent.change(input, { target: { files: [] } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a preview and Remove button once a file is set", () => {
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });
    render(<ImageCaptureField label="Asset photo" file={file} onChange={vi.fn()} />);

    expect(screen.getByAltText("Asset photo")).toHaveAttribute(
      "src",
      "blob:preview-url"
    );
    expect(
      screen.queryByRole("button", { name: "Upload" })
    ).not.toBeInTheDocument();
  });

  it("calls onChange(null) when Remove is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });
    render(<ImageCaptureField label="Asset photo" file={file} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the existing image URL as a preview when no new file has been selected", () => {
    render(
      <ImageCaptureField
        label="Asset photo"
        file={null}
        existingImageUrl="/api/assets/asset-1/images/asset"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByAltText("Asset photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/asset"
    );
    expect(
      screen.queryByRole("button", { name: "Upload" })
    ).not.toBeInTheDocument();
  });

  it("prefers a newly selected file's preview over the existing image URL", () => {
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });
    render(
      <ImageCaptureField
        label="Asset photo"
        file={file}
        existingImageUrl="/api/assets/asset-1/images/asset"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByAltText("Asset photo")).toHaveAttribute(
      "src",
      "blob:preview-url"
    );
  });

  it("calls onChange(null) when Remove is clicked on an existing image (parent decides whether to keep showing it)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ImageCaptureField
        label="Asset photo"
        file={null}
        existingImageUrl="/api/assets/asset-1/images/asset"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("starts the camera and shows Capture/Cancel when Take photo is clicked", async () => {
    const user = userEvent.setup();
    const { stream } = makeFakeStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    render(<ImageCaptureField label="Asset photo" file={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Take photo" }));

    expect(
      await screen.findByRole("button", { name: "Capture" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Asset photo camera preview")
    ).toBeInTheDocument();
  });

  it("shows an error message when camera access fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    render(<ImageCaptureField label="Asset photo" file={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Take photo" }));

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Camera access was denied or is unavailable.");
    expect(
      screen.queryByRole("button", { name: "Capture" })
    ).not.toBeInTheDocument();
  });

  it("stops the camera without selecting a file when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { stop, stream } = makeFakeStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const onChange = vi.fn();
    render(<ImageCaptureField label="Asset photo" file={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("button", { name: "Capture" });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(stop).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Take photo" })).toBeInTheDocument();
  });

  it("captures a photo from the live video and passes it to onChange", async () => {
    const user = userEvent.setup();
    const { stop, stream } = makeFakeStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const fakeBlob = new Blob(["captured"], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(fakeBlob)
    );
    const onChange = vi.fn();
    render(<ImageCaptureField label="Asset photo" file={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("button", { name: "Capture" });

    await user.click(screen.getByRole("button", { name: "Capture" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const [capturedFile] = onChange.mock.calls[0];
    expect(capturedFile.name).toBe("capture.jpg");
    expect(capturedFile.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it("stops the camera without calling onChange when the capture produces no blob", async () => {
    const user = userEvent.setup();
    const { stop, stream } = makeFakeStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      null as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(null)
    );
    const onChange = vi.fn();
    render(<ImageCaptureField label="Asset photo" file={null} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("button", { name: "Capture" });

    await user.click(screen.getByRole("button", { name: "Capture" }));

    await waitFor(() => expect(stop).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops the camera tracks on unmount", async () => {
    const user = userEvent.setup();
    const { stop, stream } = makeFakeStream();
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const { unmount } = render(
      <ImageCaptureField label="Asset photo" file={null} onChange={vi.fn()} />
    );
    await user.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("button", { name: "Capture" });

    unmount();

    expect(stop).toHaveBeenCalled();
  });
});
