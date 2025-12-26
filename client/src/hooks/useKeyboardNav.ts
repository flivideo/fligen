import { useEffect } from 'react';

interface UseKeyboardNavOptions {
  navigateTo: (day: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  openSettings: () => void;
  closeModal: () => void;
}

export function useKeyboardNav({
  navigateTo,
  navigateNext,
  navigatePrev,
  openSettings,
  closeModal,
}: UseKeyboardNavOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Escape closes any modal
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      // All other shortcuts require modifier
      if (!isMod) return;

      // Ctrl/Cmd + 1-9 -> Days 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        navigateTo(parseInt(e.key, 10));
        return;
      }

      // Ctrl/Cmd + 0 -> Day 10
      if (e.key === '0') {
        e.preventDefault();
        navigateTo(10);
        return;
      }

      // Ctrl/Cmd + [ -> Previous day
      if (e.key === '[') {
        e.preventDefault();
        navigatePrev();
        return;
      }

      // Ctrl/Cmd + ] -> Next day
      if (e.key === ']') {
        e.preventDefault();
        navigateNext();
        return;
      }

      // Ctrl/Cmd + , -> Open settings
      if (e.key === ',') {
        e.preventDefault();
        openSettings();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, navigateNext, navigatePrev, openSettings, closeModal]);
}
