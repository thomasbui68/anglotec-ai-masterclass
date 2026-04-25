import { useState, useEffect, useCallback, useRef } from "react";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function useFaceApi() {
  const [isLoaded, setIsLoaded] = useState(modelsLoaded);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dynamically load face-api.js from CDN
  const loadScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (document.getElementById("faceapi-script")) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = "faceapi-script";
      script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load face-api.js"));
      document.head.appendChild(script);
    });
  }, []);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    if (loadingPromise) {
      await loadingPromise;
      return;
    }

    loadingPromise = (async () => {
      try {
        await loadScript();
        const faceapi = (window as any).faceapi;
        if (!faceapi) throw new Error("face-api.js not available");

        const modelUri = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUri),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelUri),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUri),
        ]);

        modelsLoaded = true;
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load face models");
        throw err;
      }
    })();

    await loadingPromise;
  }, [loadScript]);

  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      setError("Camera access denied or not available");
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
  }, []);

  const detectFace = useCallback(async () => {
    const faceapi = (window as any).faceapi;
    const video = videoRef.current;
    if (!faceapi || !video || !modelsLoaded) return null;

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

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  return {
    isLoaded,
    error,
    videoRef,
    loadModels,
    startVideo,
    stopVideo,
    detectFace,
  };
}
