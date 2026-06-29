"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const wasOffline = useRef(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }

    if (wasOffline.current) {
      setShowBackOnline(true);
      const timeout = window.setTimeout(() => {
        setShowBackOnline(false);
        wasOffline.current = false;
      }, 4000);
      return () => window.clearTimeout(timeout);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[80] bg-orange-500 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
        📡 You&apos;re offline. You can still view your data. New changes will sync when you reconnect.
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[80] bg-green px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
        ✓ Back online - syncing...
      </div>
    );
  }

  return null;
}
