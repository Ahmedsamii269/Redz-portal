import { useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';

export const useSoundNotifications = () => {
  const { notifications } = useData();
  const lastNotificationId = useRef<string | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      
      // If it's a new notification and not seen before in this session
      if (lastNotificationId.current && latest.id !== lastNotificationId.current) {
        // Subtle notification sound
        // Using a built-in browser beep or a small audio file if available
        // For now, we'll use a simple synth beep using AudioContext
        playBeep();
      }
      
      lastNotificationId.current = latest.id;
    }
  }, [notifications]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  };

  return { playBeep };
};
