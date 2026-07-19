"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/Button";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export function ImageCaptureField({
  label,
  file,
  existingImageUrl = null,
  onChange,
}: {
  label: string;
  file: File | null;
  /** URL of an already-saved image to show until the user replaces or removes it. */
  existingImageUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCapturing = stream !== null;
  const previewUrl = filePreviewUrl ?? existingImageUrl;

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      onChange(selected);
    }
    event.target.value = "";
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
    } catch {
      setCameraError("Camera access was denied or is unavailable.");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  function capturePhoto() {
    // The Capture button only renders alongside the <video> element below,
    // so the ref is always attached by the time this can be called.
    const video = videoRef.current as HTMLVideoElement;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onChange(new File([blob], "capture.jpg", { type: "image/jpeg" }));
        }
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="md-label-large text-on-surface">{label}</span>

      {isCapturing && (
        <div className="flex flex-col gap-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label={`${label} camera preview`}
            className="w-full max-w-xs rounded-xs bg-black"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={capturePhoto}>
              Capture
            </Button>
            <Button type="button" variant="text" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isCapturing && previewUrl && (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="h-32 w-32 rounded-xs object-cover"
          />
          <Button
            type="button"
            variant="text"
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </div>
      )}

      {!isCapturing && !previewUrl && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="text"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <Button type="button" variant="text" onClick={startCamera}>
              Take photo
            </Button>
          </div>
          {cameraError && (
            <p role="alert" className="md-body-small text-error">
              {cameraError}
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        aria-label={label}
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  );
}
