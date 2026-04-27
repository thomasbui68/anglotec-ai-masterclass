import { useState, useCallback, useEffect, useRef } from "react";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

const RP_NAME = "Anglotec AI";
const RP_ID = typeof window !== "undefined" ? window.location.hostname : "localhost";

function likelyHasBiometric(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";
  if (/iPhone|iPad/.test(platform) || /iPhone|iPad/.test(ua)) return true;
  if (/Android/.test(ua)) return true;
  if (/Mac/.test(platform) && /Safari/.test(ua) && !/Chrome/.test(ua)) return true;
  if (/Win/.test(platform)) return true;
  return false;
}

function supportsWebAuthn(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function isInCrossOriginIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function useWebAuthn() {
  const [bioStatus, setBioStatus] = useState<"unknown" | "available" | "unavailable" | "ready" | "error">("unknown");
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    if (!supportsWebAuthn()) {
      setBioStatus("unavailable");
      setError("Your browser doesn't support Face ID. Try Safari on iPhone or Chrome on Android.");
      return;
    }

    if (isInCrossOriginIframe()) {
      setInIframe(true);
      setBioStatus("unavailable");
      setError("Face ID cannot be set up inside a preview panel. Please open the app directly in Safari or Chrome.");
      return;
    }

    setBioStatus(likelyHasBiometric() ? "available" : "available");
  }, []);

  const registerBiometric = useCallback(async (email: string): Promise<{ credentialId: string | null; error: string | null }> => {
    setError(null);

    if (isInCrossOriginIframe()) {
      const msg = "Face ID cannot be set up inside a preview panel. Please open the app directly in Safari or Chrome.";
      setError(msg);
      return { credentialId: null, error: msg };
    }

    if (!supportsWebAuthn()) {
      const msg = "Your browser doesn't support Face ID. Try Safari on iPhone or Chrome on Android.";
      setError(msg);
      return { credentialId: null, error: msg };
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge() as BufferSource,
          rp: { name: RP_NAME, id: RP_ID },
          user: {
            id: new TextEncoder().encode(email),
            name: email,
            displayName: email.split("@")[0],
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "discouraged",
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      if (!credential) {
        const msg = "Face ID setup was cancelled.";
        setError(msg);
        return { credentialId: null, error: msg };
      }

      const credId = bufferToBase64((credential as PublicKeyCredential).rawId);
      setBioStatus("ready");
      return { credentialId: credId, error: null };
    } catch (err: any) {
      let msg = "Face ID setup failed. Please try again.";
      if (err.name === "NotAllowedError") {
        msg = isInCrossOriginIframe()
          ? "Face ID is blocked by this preview. Please open the app directly in your browser."
          : "Face ID setup was cancelled or denied. Please try again.";
      } else if (err.name === "NotSupportedError") {
        msg = "This browser doesn't support Face ID on this device. Try Safari on iPhone.";
      } else if (err.name === "SecurityError") {
        msg = "Face ID requires a secure HTTPS connection.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setBioStatus("error");
      return { credentialId: null, error: msg };
    }
  }, []);

  const authenticateBiometric = useCallback(async (credentialId: string): Promise<boolean> => {
    setError(null);
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge() as BufferSource,
          allowCredentials: [{
            id: base64ToBuffer(credentialId),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
          rpId: RP_ID,
        },
      });
      return !!assertion;
    } catch (err: any) {
      let msg = "Face ID verification failed.";
      if (err.name === "NotAllowedError") msg = "Face ID verification was cancelled.";
      else if (err.name === "SecurityError") msg = "Face ID requires a secure connection.";
      setError(msg);
      return false;
    }
  }, []);

  const canUseBiometric = !inIframe && supportsWebAuthn();
  const isReady = canUseBiometric && (bioStatus === "available" || bioStatus === "ready");

  const capabilityMessage = (() => {
    if (inIframe) return "Face ID cannot work inside a preview panel. Please open the app directly in Safari or Chrome.";
    if (!supportsWebAuthn()) return "Your browser doesn't support Face ID. Try Safari on iPhone or Chrome on Android.";
    if (bioStatus === "unknown") return "Checking your device...";
    if (bioStatus === "error") return error || "Something went wrong";
    if (bioStatus === "ready") return "Face ID is ready!";
    return "Face ID / Touch ID is available on this device.";
  })();

  return {
    bioStatus,
    isReady,
    canUseBiometric,
    isChecking: bioStatus === "unknown",
    inIframe,
    capabilityMessage,
    error,
    registerBiometric,
    authenticateBiometric,
  };
}

export async function requestMediaPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
  const result = { camera: false, microphone: false };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((track) => track.stop());
    result.camera = true;
    result.microphone = true;
  } catch {
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
      vStream.getTracks().forEach((track) => track.stop());
      result.camera = true;
    } catch { result.camera = false; }
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aStream.getTracks().forEach((track) => track.stop());
      result.microphone = true;
    } catch { result.microphone = false; }
  }
  return result;
}
