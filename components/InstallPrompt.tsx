"use client";

import { useEffect, useState } from "react";
import { track } from "@/components/analytics";

/** The beforeinstallprompt event (not in the standard DOM lib types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "airac.installDismissed"; // sessionStorage — returns next session
const INSTALLED_KEY = "airac.installed"; // localStorage — permanent once installed

/**
 * Install affordance (harness §19.2): rendered by default, upgraded to a one-tap
 * Install button once beforeinstallprompt fires, with a manual hint otherwise.
 * Dismiss is per-session only; the sole permanent hide is "installed".
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const installed = window.localStorage.getItem(INSTALLED_KEY) === "1";
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    if (standalone || installed || dismissed) return;

    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      window.localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
      track("pwa_installed");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const isIos =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const install = async () => {
    if (!deferred) return;
    track("pwa_install_clicked");
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Install app"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        flexWrap: "wrap",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-3) var(--space-4)",
        margin: "var(--space-4) auto 0",
        maxWidth: "520px",
      }}
    >
      <span style={{ flex: 1, minWidth: "200px", fontSize: "0.92rem", color: "var(--text-muted)" }}>
        <strong style={{ color: "var(--text)" }}>Install Adaptive IRAC</strong> for one-tap access — it
        works like an app and keeps your practice on this device.
      </span>
      {deferred ? (
        <button
          onClick={install}
          style={{
            border: "none",
            background: "var(--primary)",
            color: "var(--primary-fg)",
            fontWeight: 700,
            padding: "9px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          Install
        </button>
      ) : (
        <span style={{ fontSize: "0.85rem", color: "var(--text-faint)", minWidth: "180px" }}>
          {isIos ? "Tap Share, then “Add to Home Screen”." : "Use “Install” from your browser menu."}
        </span>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          border: "none",
          background: "transparent",
          color: "var(--text-faint)",
          fontSize: "1.2rem",
          lineHeight: 1,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        ×
      </button>
    </div>
  );
}
