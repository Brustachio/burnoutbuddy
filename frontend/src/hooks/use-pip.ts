import { useState, useEffect, useCallback } from "react";

interface UsePipOptions {
  targetRef: React.RefObject<HTMLElement | null>;
}

interface UsePipReturn {
  pipWindow: Window | null;
  isSupported: boolean;
  togglePip: () => Promise<void>;
}

function transferStyles(target: Window) {
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    target.document.head.appendChild(node.cloneNode(true));
  });
  const isDark = document.documentElement.classList.contains("dark");
  target.document.documentElement.classList.toggle("dark", isDark);
}

function styleBody(target: Window) {
  const body = target.document.body;
  body.style.margin = "0";
  body.style.padding = "0";
  body.style.overflow = "hidden";
  const bgVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  body.style.background = bgVar
    ? `hsl(${bgVar})`
    : getComputedStyle(document.body).backgroundColor;
}

export function usePip({ targetRef }: UsePipOptions): UsePipReturn {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isSupported =
    typeof window !== "undefined" && !!window.documentPictureInPicture;

  const togglePip = useCallback(async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }
    if (!window.documentPictureInPicture) return;

    const rect = targetRef.current?.getBoundingClientRect();
    const width = rect ? Math.ceil(rect.width) : 320;
    const height = rect ? Math.ceil(rect.height) : 220;

    const pip = await window.documentPictureInPicture.requestWindow({
      width,
      height,
    });
    transferStyles(pip);
    styleBody(pip);
    pip.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(pip);
  }, [pipWindow, targetRef]);

  // Sync dark mode to PiP window
  useEffect(() => {
    if (!pipWindow) return;
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      pipWindow.document.documentElement.classList.toggle("dark", isDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [pipWindow]);

  // Close on unmount
  useEffect(() => {
    return () => {
      pipWindow?.close();
    };
  }, [pipWindow]);

  return { pipWindow, isSupported, togglePip };
}
