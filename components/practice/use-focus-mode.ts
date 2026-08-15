"use client";

import { useEffect } from "react";

/**
 * Marks the document while a drill is running, so the sidebar can step back.
 *
 * It is an attribute on `<body>` rather than a class on the menu because the
 * menu is above the drill in the tree — there is no prop to thread and no
 * context worth inventing for one boolean. The styling lives in `globals.css`;
 * this hook only says when.
 *
 * The attribute is removed on unmount as well as when the drill ends, so
 * leaving mid-question does not leave a dimmed menu behind on the next page.
 */
export function useFocusMode(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    document.body.dataset.drill = "on";
    return () => {
      delete document.body.dataset.drill;
    };
  }, [active]);
}
