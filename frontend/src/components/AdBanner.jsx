import { useEffect, useRef } from "react";

/**
 * Reusable Google AdSense slot.
 *
 * Usage:
 *   <AdBanner slot="1234567890" format="auto" className="my-4" />
 *
 * To activate:
 *  1. Add your AdSense <script> tag to index.html (see comment there).
 *  2. Replace the slot prop with your actual ad unit slot ID.
 */
export default function AdBanner({ slot, format = "auto", className = "" }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (_) {
      // AdSense not loaded (dev mode) — silently ignore
    }
  }, []);

  // In dev mode (no AdSense script), render a placeholder
  const isDev = !window.adsbygoogle;

  if (isDev) {
    return (
      <div
        className={`flex items-center justify-center bg-soil border-2 border-dashed border-rock text-rock font-pixel text-xs ${className}`}
        style={{ minHeight: format === "auto" ? 90 : 90 }}
      >
        [ Ad Slot: {slot} ]
      </div>
    );
  }

  return (
    <div className={className}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
