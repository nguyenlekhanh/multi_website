'use client';

import { useState } from 'react';

/** Editable label/href rows for navigation lists. */
export function NavListEditor({
  prefix,
  label,
  initial,
  max = 12,
}: {
  prefix: string;
  label: string;
  initial: { label: string; href: string }[];
  max?: number;
}) {
  const [rows, setRows] = useState(initial.length > 0 ? initial : []);

  function update(i: number, key: 'label' | 'href', value: string) {
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <button
          type="button"
          onClick={() => setRows((prev) => (prev.length < max ? [...prev, { label: '', href: '/' }] : prev))}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          + Add item
        </button>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate-400">No items yet.</p>}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              name={`${prefix}_label_${i}`}
              value={row.label}
              onChange={(e) => update(i, 'label', e.target.value)}
              placeholder="Label"
              maxLength={60}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              aria-label={`${label} item ${i + 1} label`}
            />
            <input
              type="text"
              name={`${prefix}_href_${i}`}
              value={row.href}
              onChange={(e) => update(i, 'href', e.target.value)}
              placeholder="/path"
              maxLength={500}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              aria-label={`${label} item ${i + 1} link`}
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg px-2 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label={`Remove ${label} item ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
