"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "error";

function describeError(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera access needs a secure connection (HTTPS or localhost).";
  }
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow it in your browser's site settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera is busy. Close other apps or tabs that are using it, then try again.";
    default:
      return "Couldn't start the camera. Please try again.";
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async (id?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(describeError(new DOMException("", "NotSupportedError")));
      setStatus("error");
      return;
    }
    setStatus("starting");
    setError("");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(id ? { deviceId: { exact: id } } : { facingMode: "user" }),
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
      setDeviceId(active);
      // Device labels are only exposed after permission is granted.
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
      setStatus("live");
    } catch (err) {
      streamRef.current = null;
      setError(describeError(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { videoRef, status, error, devices, deviceId, start, stop };
}
