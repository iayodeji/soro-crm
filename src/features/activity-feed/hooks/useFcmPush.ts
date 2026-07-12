"use client";
import { useCallback, useState } from "react";
import { playFCMPushSound } from "@/utils/audio";
import type { FcmNotification } from "@/types/activity";

const PUSH_DELAY_MS = 1500;
const AUTO_DISMISS_MS = 7000;

export function useFcmPush(soundEnabled: boolean) {
  const [fcmEnabled, setFcmEnabled] = useState(true);
  const [simulatedNotifications, setSimulatedNotifications] = useState<FcmNotification[]>([]);

  const dismissPush = useCallback((id: string) => {
    setSimulatedNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const trigger = useCallback(
    (title: string, body: string, leadName: string) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body });
        } catch (e) {
          console.warn("Native Notification dispatch failed:", e);
        }
      }

      setTimeout(() => {
        if (soundEnabled) playFCMPushSound();
        const newNotif: FcmNotification = {
          id: `fcm-${Date.now()}-${Math.random()}`,
          title,
          body,
          leadName,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setSimulatedNotifications((prev) => [newNotif, ...prev]);
        setTimeout(() => dismissPush(newNotif.id), AUTO_DISMISS_MS);
      }, PUSH_DELAY_MS);
    },
    [soundEnabled, dismissPush]
  );

  const requestPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.requestPermission();
    }
    return "denied" as NotificationPermission;
  }, []);

  return { fcmEnabled, setFcmEnabled, simulatedNotifications, trigger, dismissPush, requestPermission };
}
