import { useState, useCallback } from 'react';

/**
 * Provides clipboard copy with auto-reset feedback.
 * `copy(text)` writes to clipboard and sets `copied` true for `resetMs` ms.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}
