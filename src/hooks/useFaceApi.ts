import { useState, useEffect, useCallback, useRef } from "react";

// Global singleton so multiple components share the same load state
let _modelsLoaded = false;
let _scriptLoaded = false;
let _loadError: string | null = null;
let _loadingPromise: Promise<void> | null = null;

const CDN_SCRIPT = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODEL_URI = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

type LoadStatus = "idle" | "loading_script" | "loading_models" | "ready" | "error";

function getFaceApi(): any {
  return (window as any).faceapi;
}

async function doLoadModels(onStatus: (s: LoadStatus) => void): Promise<void> {
  if (_modelsLoaded) {
    onStatus("ready");
    return;
  }
  if (_loadingPromise) {
    // Wait for existing load and sync status at end
    await _loadingPromise;
    onStatus(_modelsLoaded ? "ready" : "error");
    return;
  }

  _loadingPromise = (async () => {
    try {
      // Step 1: Load script
      onStatus("loading_script");
      if (!document.getElementById("faceapi-script")) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "faceapi-script";
          script.src = CDN_SCRIPT;
          script.async = true;
          script.onload = () => { _scriptLoaded = true; resolve(); };
          script.onerror = () => reject(new Error("Failed to load face recognition library. Please check your internet connection."));
          document.head.appendChild(script);
        });
      } else if (!_scriptLoaded) {
        // Script tag exists but not loaded yet, wait a bit
        await new Promise((r) => setTimeout(r, 500));
      }

      const faceapi = getFaceApi();
      if (!faceapi) throw new Error("Face recognition library failed to initialize.");

      // Step 2: Load neural network models (~5MB total)
      onStatus("loading_models");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
      ]);

      _modelsLoaded = true;
      _loadError = null;
      onStatus("ready");
    } catch (err: any) {
      _loadError = err.message || "Failed to load face recognition";
      onStatus("error");
      throw err;
    }
  })();

  await _loadingPromise;
}

export function useFaceApi() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(_modelsLoaded ? "ready" : _loadError ? "error" : "idle");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(_loadError);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isReady = loadStatus === "ready";
  const isLoading = loadStatus === "loading_script" || loadStatus === "loading_models";

  // Human-friendly status message
  const statusMessage = (() => {
    if (loadStatus === "idle") return "Ready to start";
    if (loadStatus === "loading_script") return "Loading face recognition...";
    if (loadStatus === "loading_models") return "Loading AI models (one-time, ~5MB)...";
    if (loadStatus === "ready") return cameraActive ? "Camera active" : "Face recognition ready";
    if (loadStatus === "error") return error || "Failed to load";
    return "";
  })();

  const loadModels = useCallback(async () => {
    try {
      setError(null);
      await doLoadModels(setLoadStatus);
    } catch (err: any) {
      setError(err.message || "Failed to load face recognition");
    }
  }, []);

  // Auto-load models on mount
  useEffect(() => {
    // Start loading immediately when hook is first used
    if (!_modelsLoaded && !_loadingPromise && loadStatus === "idle") {
      loadModels();
    }
  }, [loadModels, loadStatus]);

  const startVideo = useCallback(async () => {
    try {
      // Ensure models are loaded first
      if (!_modelsLoaded) {
        await doLoadModels(setLoadStatus);
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers need a user gesture first
        }
      }
      setCameraActive(true);
      setError(null);
      return true;
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? "Camera access was blocked. Please allow camera access in your browser settings and try again."
        : err.name === "NotFoundError"
        ? "No camera found. Please connect a camera and try again."
        : "Could not start camera. Please try again.";
      setError(msg);
      setCameraActive(false);
      return false;
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const detectFace = useCallback(async () => {
    const faceapi = getFaceApi();
    const video = videoRef.current;
    if (!faceapi || !video || !_modelsLoaded) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return detection ? Array.from(detection.descriptor) : null;
    } catch (err) {
      console.error("Face detection error:", err);
      return null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  return {
    isReady,
    isLoading,
    loadStatus,
    statusMessage,
    cameraActive,
    error,
    videoRef,
    loadModels,
    startVideo,
    stopVideo,
    detectFace,
  };
}

// Standalone function to request camera + mic permissions early
export async function requestMediaPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
  const result = { camera: false, microphone: false };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((track) => track.stop());
    result.camera = true;
    result.microphone = true;
  } catch (e: any) {
    // Try video only
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
      vStream.getTracks().forEach((track) => track.stop());
      result.camera = true;
    } catch {
      result.camera = false;
    }
    // Try audio only
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aStream.getTracks().forEach((track) => track.stop());
      result.microphone = true;
    } catch {
      result.microphone = false;
    }
  }
  return result;
}
