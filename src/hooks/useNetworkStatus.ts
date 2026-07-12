"use client";
import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [status, setStatus] = useState<"online" | "offline">("online");

  useEffect(() => {
    const on = () => setStatus("online");
    const off = () => setStatus("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return status;
}
