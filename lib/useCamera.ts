"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "error";
export type CameraErrorKind = "insecure" | "unsupported" | "denied" | "notfound" | "busy" | "unknown";

function classify(err: unknown): CameraErrorKind {
  if (!window.isSecureContext) return "insecure";
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "notfound";
    case "NotReadableError":
    case "AbortError":
      return "busy";
    default:
      return "unknown";
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Each start() gets a token; stale requests (e.g. after unmount) release their stream.
  const requestRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");

  const release = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stop = useCallback(() => {
    requestRef.current++;
    release();
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async (id?: string) => {
    const token = ++requestRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKind(window.isSecureContext ? "unsupported" : "insecure");
      setStatus("error");
      return;
    }
    setStatus("starting");
    setErrorKind(null);
    release();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(id ? { deviceId: { exact: id } } : { facingMode: "user" }),
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
      });
      if (token !== requestRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      // Device labels are only exposed after permission is granted.
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
      setStatus("live");
    } catch (err) {
      if (token !== requestRef.current) return;
      setErrorKind(classify(err));
      setStatus("error");
    }
  }, []);

  useEffect(
    () => () => {
      requestRef.current++;
      release();
    },
    [],
  );

  return { videoRef, status, errorKind, devices, deviceId, start, stop };
}
