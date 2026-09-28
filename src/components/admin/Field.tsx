import type { ReactNode } from "react";

/** Label + input wrapper for admin forms — every field gets a visible label, not just
 * a placeholder (placeholders disappear once you start typing, which makes long forms
 * confusing to re-check). */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-(--text) mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
