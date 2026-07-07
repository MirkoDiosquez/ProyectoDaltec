/**
 * Notification utilities for urgent messages (T128)
 * 
 * Provides:
 * - Sound alert support
 * - Browser notification API integration
 * - Visual alert helpers
 */

/**
 * Play a sound alert for urgent messages
 * Uses Web Audio API or HTML5 audio fallback
 */
export function playUrgentAlert() {
  // Try to use Web Audio API first
  if (window.AudioContext || window.webkitAudioContext) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect and play beep tone
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz tone
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log('Audio API not available:', err.message);
    }
  }
}

/**
 * Show a browser notification for urgent messages
 * Requests permission if needed
 */
export async function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported');
    return;
  }

  // Request permission if not granted
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '⚠️',
        badge: '🔔',
        ...options,
      });
    } catch (err) {
      console.error('Failed to show notification:', err);
    }
  }
}

/**
 * Handle urgent message notification
 * Combines sound alert + browser notification
 */
export async function handleUrgentMessageNotification(title, message) {
  // Play sound alert
  playUrgentAlert();

  // Show browser notification
  await showBrowserNotification(title, {
    body: message,
    tag: 'urgent-message',
    requireInteraction: true, // Keep notification visible until user interacts
  });
}

/**
 * Show a visual toast-style notification on the page
 * (Optional for in-app alerts)
 */
export function showToastNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 1rem;
    background: ${
      type === 'urgent'
        ? '#ff5722'
        : type === 'success'
          ? '#4caf50'
          : '#2196f3'
    };
    color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}
