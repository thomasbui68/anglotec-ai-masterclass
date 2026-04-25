import { useState, useCallback, useEffect, useRef } from "react";

// WebAuthn (Web Authentication API) — uses device's native Face ID / Touch ID / Fingerprint
// No models to download. Uses hardware-level biometric authentication.
// iOS Safari, Android Chrome, Mac Safari (Touch ID), Windows Hello

type BioStatus = "unknown" | "available" | "unavailable" | "ready" | "error";

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

const RP_NAME = "Anglotec AI Master Class";
const RP_ID = typeof window !== "undefined" ? window.location.hostname : "localhost";

// Detect if this is a device that likely has Face ID / Touch ID / fingerprint
function likelyHasBiometric(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";

  // iPhone / iPad — always has Face ID or Touch ID
  if (/iPhone|iPad/.test(platform) || /iPhone|iPad/.test(ua)) return true;
  // Android — most modern phones have fingerprint / face unlock
  if (/Android/.test(ua)) return true;
  // Mac with Touch ID
  if (/Mac/.test(platform) && /Safari/.test(ua) && !/Chrome/.test(ua)) return true;
  // Windows Hello
  if (/Win/.test(platform)) return true;

  return false;
}

// Detect if browser supports WebAuthn
function supportsWebAuthn(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

// Detect if we're in a cross-origin iframe (WebAuthn is blocked here)
function isInCrossOriginIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function useWebAuthn() {
  const [bioStatus, setBioStatus] = useState<BioStatus>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const hasCheckedRef = useRef(false);

  // Smart availability check
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    if (!supportsWebAuthn()) {
      setBioStatus("unavailable");
      setError("Your browser doesn't support Face ID. Try Safari on iPhone or Chrome on Android.");
      return;
    }

    // Detect cross-origin iframe
    if (isInCrossOriginIframe()) {
      setInIframe(true);
      setBioStatus("available");
      setError("This preview panel blocks Face ID. Please open the app directly in your browser.");
      return;
    }

    if (likelyHasBiometric()) {
      setBioStatus("available");
    } else {
      setBioStatus("available");
    }
  }, []);

  // Register a new biometric credential (Face ID / fingerprint)
  const registerBiometric = useCallback(async (email: string): Promise<string | null> => {
    setError(null);

    if (isInCrossOriginIframe()) {
      setError("Face ID cannot be set up inside a preview panel. Please open the app directly in Safari.");
      return null;
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
        setError("Face ID setup was cancelled.");
        return null;
      }

      const credId = bufferToBase64((credential as PublicKeyCredential).rawId);
      setBioStatus("ready");
      return credId;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        if (isInCrossOriginIframe()) {
          setError("Face ID cannot be set up inside a preview panel. Please open the app directly in your browser.");
        } else {
          setError("Face ID setup was cancelled or denied. Please try again.");
        }
      } else if (err.name === "NotSupportedError") {
        setError("This browser doesn't support Face ID on this device.");
      } else if (err.name === "SecurityError") {
        setError("Face ID requires a secure connection (HTTPS). Please try on the official app URL.");
      } else {
        setError(err.message || "Face ID setup failed. Please try again.");
      }
      return null;
    }
  }, []);

  // Authenticate with biometric (Face ID / fingerprint prompt)
  const authenticateBiometric = useCallback(async (credentialId: string): Promise<boolean> => {
    setError(null);
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge() as BufferSource,
          allowCredentials: [
            {
              id: base64ToBuffer(credentialId),
              type: "public-key",
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
          rpId: RP_ID,
        },
      });

      return !!assertion;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Face ID verification was cancelled.");
      } else if (err.name === "SecurityError") {
        setError("Face ID requires a secure connection.");
      } else {
        setError(err.message || "Face ID verification failed.");
      }
      return false;
    }
  }, []);

  const isReady = bioStatus === "available" || bioStatus === "ready";

  const capabilityMessage = (() => {
    if (inIframe) return "Face ID is available but blocked by this preview panel";
    if (bioStatus === "unknown") return "Checking your device...";
    if (bioStatus === "available") return "Face ID / Touch ID / fingerprint is available on this device";
    if (bioStatus === "ready") return "Face ID is ready";
    if (bioStatus === "unavailable") return "Face ID not available on this browser";
    if (bioStatus === "error") return error || "Something went wrong";
    return "";
  })();

  return {
    bioStatus,
    isReady,
    isChecking: bioStatus === "unknown",
    inIframe,
    capabilityMessage,
    error,
    registerBiometric,
    authenticateBiometric,
  };
}

// Request camera + microphone permissions
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
    } catch {
      result.camera = false;
    }
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
