"use client";

import { useState, type ReactNode } from "react";

type CollapsiblePushpinContentProps = {
  label?: string;
  children: ReactNode;
  /** When false (default), section starts collapsed */
  defaultOpen?: boolean;
};

export function CollapsiblePushpinContent({
  label = "Content",
  children,
  defaultOpen = false,
}: CollapsiblePushpinContentProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-100/80 px-3 py-2 text-left text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800/80 dark:text-stone-400 dark:hover:bg-stone-800"
        aria-expanded={open}
        aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
      >
        <span>{label}</span>
        <span
          className="min-w-[1.25rem] select-none text-center text-base font-normal text-stone-500 tabular-nums dark:text-stone-400"
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
