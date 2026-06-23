"use client";

import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { Button } from "@/components/ui";
import { track } from "@/components/analytics";

/** The beforeinstallprompt event (not in the standard DOM lib types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pincite.installDismissed"; // sessionStorage — returns next session
const INSTALLED_KEY = "pincite.installed"; // localStorage — permanent once installed

/**
 * Install affordance (harness §19.2): rendered by default, upgraded to a one-tap
 * button once beforeinstallprompt fires, with a manual hint otherwise. Dismiss is
 * per-session only; the sole permanent hide is "installed".
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

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

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
      aria-label="Install Pincite"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-6)",
        flexWrap: "wrap",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-sm)",
        padding: "22px 26px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", minWidth: 0 }}>
        <Mark size={44} />
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "21px", fontWeight: 600 }}>
            Install Pincite
          </div>
          <p style={{ fontSize: "14.5px", lineHeight: 1.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Add it to your home screen for one-tap revision between classes.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {deferred ? (
          <Button onClick={install}>Add to home screen</Button>
        ) : (
          <span style={{ fontSize: "13.5px", color: "var(--text-muted)", maxWidth: "22ch" }}>
            {isIos ? "Tap Share, then “Add to Home Screen”." : "Use “Install” from your browser menu."}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss install prompt">
          ×
        </Button>
      </div>
    </div>
  );
}
