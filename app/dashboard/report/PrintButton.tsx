"use client";

import { Icon } from "../../components/Icon";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.print()}>
      <Icon name="printer" size={15} />
      {label}
    </button>
  );
}
