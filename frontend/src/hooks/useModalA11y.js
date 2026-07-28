import { useEffect, useRef } from 'react';

/**
 * Comportamiento de accesibilidad estándar para un diálogo modal (WAI-ARIA Authoring
 * Practices Guide: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
 *  - Al abrir, mueve el foco dentro del diálogo (al primer campo o al elemento indicado).
 *  - Escape cierra el diálogo (llama a onClose).
 *  - Tab / Shift+Tab quedan atrapados dentro del diálogo mientras está abierto.
 *
 * Devuelve un ref que debe asignarse al contenedor raíz del diálogo (el que tiene
 * role="dialog" aria-modal="true").
 */
export function useModalA11y({ open, onClose, initialFocusRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const focusTarget =
      initialFocusRef?.current || containerRef.current?.querySelector('input, select, textarea, button');
    focusTarget?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, initialFocusRef]);

  return containerRef;
}
