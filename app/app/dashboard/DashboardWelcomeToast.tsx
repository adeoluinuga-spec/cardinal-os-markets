"use client";

import { useEffect, useState } from "react";

export function DashboardWelcomeToast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      setMessage("Welcome back. Your Cardinal OS Markets subscription is active.");
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      const timeout = window.setTimeout(() => setMessage(""), 5000);
      return () => window.clearTimeout(timeout);
    }

    const toast = sessionStorage.getItem("cardinal-welcome-toast");

    if (!toast) {
      return;
    }

    sessionStorage.removeItem("cardinal-welcome-toast");
    setMessage(toast);
    const timeout = window.setTimeout(() => setMessage(""), 5000);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 max-w-sm rounded-xl border border-blue-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg shadow-blue-dark/10">
      {message}
    </div>
  );
}
