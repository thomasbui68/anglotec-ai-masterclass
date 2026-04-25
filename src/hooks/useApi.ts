import { useCallback } from "react";

const API_BASE = "/api";

export function useApi() {
  const token = localStorage.getItem("token");

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const url = `${API_BASE}${endpoint}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      };

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        // For audio responses
        if (response.headers.get("Content-Type")?.includes("audio")) {
          return response.blob();
        }

        return response.json();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Network error");
      }
    },
    [token]
  );

  return { request };
}
