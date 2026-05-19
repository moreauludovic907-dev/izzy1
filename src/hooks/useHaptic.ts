/**
 * Vibration mobile (Vibration API native).
 * Sur iOS Safari : non supporté → silencieux fallback.
 * Sur Android Chrome : marche partout.
 */
export function useHaptic() {
  const vibrate = (pattern: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore
    }
  };

  return {
    tap: () => vibrate(8),           // touche courte
    activate: () => vibrate(20),     // activation principale
    hold: () => vibrate([15, 30, 25]), // début maintien
    success: () => vibrate([20, 60, 20]),
  };
}
