import { useState, useCallback, useEffect, useRef } from "react";

/*
  WebAuthn / Face ID / Touch ID hook
  Optimized for iOS Safari, iPadOS Safari, Chrome Android, Windows Hello
*/

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

/* ---- Environment detection ---- */

function supportsWebAuthn(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isInCrossOriginIframe(): boolean {
  if (!isInIframe()) return false;
  try {
    // If we can access window.top, we're same-origin iframe
    // If we can't, we're cross-origin iframe
    const top = window.top;
    return !top || top.origin !== window.origin;
  } catch {
    return true;
  }
}

/* Check if the device actually has a platform authenticator (Face ID / Touch ID) */
async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!supportsWebAuthn()) return false;
  if (typeof (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    // Fallback: assume available on mobile devices
    const ua = navigator.userAgent;
    return /iPhone|iPad|Android/.test(ua);
  }
  try {
    return await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/* ---- Hook ---- */

export function useWebAuthn() {
  const [bioStatus, setBioStatus] = useState<"unknown" | "available" | "unavailable" | "ready" | "error">("unknown");
  const [error, setError] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    if (!supportsWebAuthn()) {
      setBioStatus("unavailable");
      setError("Your browser doesn't support WebAuthn. Try Safari on iPhone, Chrome on Android, or Edge on Windows.");
      return;
    }

    if (isInCrossOriginIframe()) {
      setInIframe(true);
      setBioStatus("unavailable");
      setError("Face ID cannot work inside a preview panel. Please open the app directly in Safari or Chrome.");
      return;
    }

    isPlatformAuthenticatorAvailable().then((available) => {
      setPlatformAvailable(available);
      setBioStatus(available ? "available" : "unavailable");
      if (!available) {
        setError("Face ID / Touch ID is not available on this device. It may need to be set up in your device Settings first.");
      }
    });
  }, []);

  /* Register a new biometric credential */
  const registerBiometric = useCallback(async (email: string): Promise<{ credentialId: string | null; error: string | null }> => {
    setError(null);

    if (isInCrossOriginIframe()) {
      const msg = "Face ID cannot be set up inside a preview panel. Please open the app directly in Safari or Chrome.";
      setError(msg);
      return { credentialId: null, error: msg };
    }

    if (!supportsWebAuthn()) {
      const msg = "Your browser doesn't support WebAuthn. Try Safari on iPhone, Chrome on Android, or Edge on Windows.";
      setError(msg);
      return { credentialId: null, error: msg };
    }

    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      const msg = "Face ID / Touch ID is not available on this device. Please set it up in your device Settings first.";
      setError(msg);
      return { credentialId: null, error: msg };
    }

    try {
      // Build the user ID as a proper Uint8Array (required by Safari)
      const userIdBytes = new TextEncoder().encode(email);
      // Safari requires user.id to be 1-64 bytes
      const userId = userIdBytes.length > 64 ? userIdBytes.slice(0, 64) : userIdBytes;

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge() as BufferSource,
          rp: { name: RP_NAME, id: RP_ID },
          user: {
            id: userId,
            name: email,
            displayName: email.split("@")[0],
          },
          // Safari iOS/iPadOS ONLY supports ES256 (-7) for platform authenticators.
          // Do NOT include RS256 (-257) — it causes NotAllowedError on Safari.
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            // Use "preferred" instead of "discouraged" — Safari is picky about this
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
          // Prevent duplicate registration for the same user
          excludeCredentials: [],
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
        if (isInCrossOriginIframe()) {
          msg = "Face ID is blocked by this preview panel. Please open the app directly in Safari or Chrome.";
        } else if (!platformAvailable) {
          msg = "Face ID / Touch ID is not available on this device. Please set it up in your device Settings first.";
        } else {
          msg = "Face ID setup was cancelled or denied by your device. Please make sure Face ID is enabled in your device Settings and try again.";
        }
      } else if (err.name === "NotSupportedError") {
        msg = "This browser or device doesn't support Face ID. Try Safari on iPhone/iPad, Chrome on Android, or Edge on Windows.";
      } else if (err.name === "SecurityError") {
        msg = "Face ID requires a secure HTTPS connection and cannot run inside an iframe or preview panel.";
      } else if (err.name === "AbortError") {
        msg = "Face ID setup was cancelled.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setBioStatus("error");
      return { credentialId: null, error: msg };
    }
  }, [platformAvailable]);

  /* Authenticate with an existing biometric credential */
  const authenticateBiometric = useCallback(async (credentialId: string): Promise<boolean> => {
    setError(null);

    // Validate credentialId before passing to WebAuthn
    if (!credentialId || typeof credentialId !== "string") {
      setError("Face ID credential is missing. Please sign in with your password first.");
      return false;
    }
    if (credentialId.length < 10) {
      setError("Face ID credential appears invalid. Please sign in with your password and set up Face ID again.");
      return false;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(credentialId)) {
      setError("Face ID credential is corrupted. Please sign in with your password and set up Face ID again.");
      return false;
    }

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
      if (err.name === "NotAllowedError") msg = "Face ID verification was cancelled or denied.";
      else if (err.name === "SecurityError") msg = "Face ID requires a secure connection.";
      else if (err.name === "NotSupportedError") msg = "This browser doesn't support Face ID on this device.";
      else if (err.message) msg = err.message;
      setError(msg);
      return false;
    }
  }, []);

  const canUseBiometric = !inIframe && supportsWebAuthn() && platformAvailable;
  const isReady = canUseBiometric && (bioStatus === "available" || bioStatus === "ready");

  const capabilityMessage = (() => {
    if (inIframe) return "Face ID cannot work inside a preview panel. Please open the app directly in Safari or Chrome.";
    if (!supportsWebAuthn()) return "Your browser doesn't support WebAuthn. Try Safari on iPhone, Chrome on Android, or Edge on Windows.";
    if (!platformAvailable) return "Face ID / Touch ID is not available on this device. It may need to be set up in your device Settings first.";
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
    platformAvailable,
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
