import { useSyncExternalStore } from "react";
import { sessionStore } from "@/data/cloud/session";
import { notificationsStore } from "@/data/cloud/notifications";
import { messagingStore } from "@/data/cloud/messaging";
import { directoryStore } from "@/data/cloud/directory";

export const useSession = () =>
  useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.getServer);

export const useNotifications = () =>
  useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.get,
    notificationsStore.getServer,
  );

export const useCloudMessages = () =>
  useSyncExternalStore(messagingStore.subscribe, messagingStore.get, messagingStore.getServer);

export const useDirectory = () =>
  useSyncExternalStore(directoryStore.subscribe, directoryStore.get, directoryStore.getServer);
