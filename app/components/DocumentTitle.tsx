"use client";

import { useEffect } from "react";

/**
 * Sets the tab title from a boundary page (not-found / error) that cannot
 * export metadata. A rendered <title> would sit after the root layout's
 * title, so the browser ignores it, and it lingers after navigating away.
 */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
  return null;
}
