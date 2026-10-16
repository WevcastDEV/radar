import { create } from 'zustand';

export interface SystemNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: SystemNotification[];
  addNotification: (notification: {
    id?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = 'radar_system_notifications_v1';

function saveToLocalStorage(notifications: SystemNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)));
  } catch (e) {}
}

function loadFromLocalStorage(): SystemNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  loadFromStorage: () => {
    const saved = loadFromLocalStorage();
    set({ notifications: saved });
  },

  addNotification: ({ id, type = 'success', title, description }) => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    const newNotif: SystemNotification = {
      id: id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      title: cleanTitle,
      description: description?.trim(),
      timestamp: Date.now(),
      read: false,
    };

    set((state) => {
      // Evita duplicar notificações com o mesmo ID ou mensagem idêntica em menos de 2 segundos
      const filtered = state.notifications.filter(
        (n) => n.id !== newNotif.id && !(n.title === newNotif.title && Math.abs(n.timestamp - newNotif.timestamp) < 2000)
      );
      const updated = [newNotif, ...filtered].slice(0, 50);
      saveToLocalStorage(updated);
      return { notifications: updated };
    });
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveToLocalStorage(updated);
      return { notifications: updated };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      saveToLocalStorage(updated);
      return { notifications: updated };
    });
  },

  removeNotification: (id: string) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveToLocalStorage(updated);
      return { notifications: updated };
    });
  },

  clearAll: () => {
    saveToLocalStorage([]);
    set({ notifications: [] });
  },
}));

// Helper direto para disparar notificação para o sino sem hooks
export function notifySystem(
  title: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'success',
  description?: string
) {
  useNotificationStore.getState().addNotification({ title, type, description });
}
