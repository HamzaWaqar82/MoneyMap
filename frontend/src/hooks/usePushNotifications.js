import { useState, useCallback } from 'react';
import { api } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  );

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get('/users/profile');
      setSubscribed(!!res.data?.hasPushSubscription);
    } catch {
      setSubscribed(false);
    }
  }, []);

  const enable = useCallback(async () => {
    if (!supported) throw new Error('Push notifications are not supported in this browser');
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission denied');

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyRes = await api.get('/notifications/push/vapid-key');
      const publicKey = keyRes.data?.publicKey;
      if (!publicKey) throw new Error('Could not load push configuration');

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.put('/notifications/push/subscribe', { subscription: subscription.toJSON() });
      setSubscribed(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await api.delete('/notifications/push/subscribe');
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, subscribed, loading, enable, disable, checkStatus, setSubscribed };
}
