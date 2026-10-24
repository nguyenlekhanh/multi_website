'use client';

import { useMemo, useState } from 'react';
import type { Block } from '@/platform/types';

/**
 * Structured block editor for the platform's typed Block union.
 *
 * Every supported block type gets dedicated structured fields — there is no
 * free-form HTML input anywhere. The blocks serialize to JSON into a hidden
 * input and are re-validated server-side (validateBlocks) before storage, so
 * malformed data can never reach the database or the themes.
 */

const BLOCK_TYPES: { type: Block['type']; label: string; description: string }[] = [
  { type: 'hero', label: 'Hero', description: 'Big header with title, subtitle, image, and calls to action.' },
  { type: 'intro', label: 'Intro / About', description: 'Heading, paragraphs, image, and bullet points.' },
  { type: 'features', label: 'Features', description: 'Grid of icon + title + description items.' },
  { type: 'cards', label: 'Cards', description: 'Image or text cards (destinations, trips, links).' },
  { type: 'stats', label: 'Statistics', description: 'Numbers with labels.' },
  { type: 'testimonials', label: 'Testimonials', description: 'Quotes with author and role.' },
  { type: 'richtext', label: 'Rich text', description: 'Simple heading + paragraphs.' },
  { type: 'logos', label: 'Logo strip', description: 'Names of trusted brands.' },
  { type: 'cta', label: 'Call to action', description: 'Banner with heading and a button.' },
  { type: 'contact', label: 'Contact details', description: 'Email, phone, address, hours.' },
  { type: 'postlist', label: 'Post list', description: 'Shows the site\u2019s published posts dynamically.' },
];

const inputCls =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

function TextField({
  label,
  value,
  onChange,
  multiline,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} rows={3} placeholder={placeholder} className={inputCls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder} className={inputCls} />
      )}
    </label>
  );
}

function ListField({
  label,
  values,
  onChange,
  itemLabel,
  multiline,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  itemLabel: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <button type="button" onClick={() => onChange([...values, ''])} className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
          + Add
        </button>
      </div>
      <div className="space-y-1.5">
        {values.map((value, i) => (
          <div key={i} className="flex gap-1.5">
            {multiline ? (
              <textarea value={value} onChange={(e) => onChange(values.map((v, idx) => (idx === i ? e.target.value : v)))} rows={2} aria-label={`${itemLabel} ${i + 1}`} className={inputCls} />
            ) : (
              <input type="text" value={value} onChange={(e) => onChange(values.map((v, idx) => (idx === i ? e.target.value : v)))} aria-label={`${itemLabel} ${i + 1}`} className={inputCls} />
            )}
            <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} aria-label={`Remove ${itemLabel} ${i + 1}`} className="px-1.5 text-slate-400 hover:text-rose-600">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemListEditor({
  label,
  items,
  onChange,
  fields,
  newItem,
}: {
  label: string;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  fields: { key: string; label: string; multiline?: boolean; type?: 'text' | 'image' }[];
  newItem: Record<string, unknown>;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <button type="button" onClick={() => onChange([...items, { ...newItem }])} className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
          + Add item
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {label} {i + 1}
              </span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-xs text-slate-400 hover:text-rose-600" aria-label={`Remove ${label} ${i + 1}`}>
                ✕
              </button>
            </div>
            <div className="grid gap-2">
              {fields.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={String(item[field.key] ?? '')}
                  onChange={(v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [field.key]: v } : it)))}
                  multiline={field.multiline}
                />
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">No items yet — add at least one.</p>}
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: Record<string, unknown>; onChange: (b: Record<string, unknown>) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value });
  const type = block.type as string;

  switch (type) {
    case 'hero':
      return (
        <>
          <TextField label="Eyebrow (small label)" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Title" value={String(block.title ?? '')} onChange={(v) => set('title', v)} maxLength={200} />
          <TextField label="Subtitle" value={String(block.subtitle ?? '')} onChange={(v) => set('subtitle', v)} multiline />
          <TextField label="Image URL or media path" value={String(block.image ?? '')} onChange={(v) => set('image', v)} placeholder="/images/... or https://" />
          <TextField label="Image alt text" value={String(block.imageAlt ?? '')} onChange={(v) => set('imageAlt', v)} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Primary button label" value={String((block.primaryCta as { label?: string })?.label ?? '')} onChange={(v) => set('primaryCta', { label: v, href: (block.primaryCta as { href?: string })?.href ?? '/' })} />
            <TextField label="Primary button link" value={String((block.primaryCta as { href?: string })?.href ?? '')} onChange={(v) => set('primaryCta', { label: (block.primaryCta as { label?: string })?.label ?? '', href: v })} />
            <TextField label="Secondary button label" value={String((block.secondaryCta as { label?: string })?.label ?? '')} onChange={(v) => set('secondaryCta', { label: v, href: (block.secondaryCta as { href?: string })?.href ?? '/' })} />
            <TextField label="Secondary button link" value={String((block.secondaryCta as { href?: string })?.href ?? '')} onChange={(v) => set('secondaryCta', { label: (block.secondaryCta as { label?: string })?.label ?? '', href: v })} />
          </div>
        </>
      );
    case 'logos':
      return (
        <>
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} />
          <ListField label="Brand names" itemLabel="brand" values={(block.items as string[]) ?? []} onChange={(v) => set('items', v)} />
        </>
      );
    case 'intro':
      return (
        <>
          <TextField label="Eyebrow" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <ListField label="Paragraphs" itemLabel="paragraph" values={(block.body as string[]) ?? []} onChange={(v) => set('body', v)} multiline />
          <TextField label="Image URL or media path" value={String(block.image ?? '')} onChange={(v) => set('image', v)} placeholder="/images/... or https://" />
          <TextField label="Image alt text" value={String(block.imageAlt ?? '')} onChange={(v) => set('imageAlt', v)} />
          <ListField label="Bullets" itemLabel="bullet" values={(block.bullets as string[]) ?? []} onChange={(v) => set('bullets', v)} />
        </>
      );
    case 'features':
      return (
        <>
          <TextField label="Eyebrow" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <TextField label="Intro" value={String(block.intro ?? '')} onChange={(v) => set('intro', v)} multiline />
          <ItemListEditor
            label="Feature"
            items={(block.items as Record<string, unknown>[]) ?? []}
            onChange={(v) => set('items', v)}
            newItem={{ title: '', description: '', icon: 'spark' }}
            fields={[
              { key: 'title', label: 'Title' },
              { key: 'description', label: 'Description', multiline: true },
              { key: 'icon', label: 'Icon (shield, chart, globe, users, zap, compass, book, spark, check)' },
            ]}
          />
        </>
      );
    case 'cards':
      return (
        <>
          <TextField label="Eyebrow" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <TextField label="Intro" value={String(block.intro ?? '')} onChange={(v) => set('intro', v)} multiline />
          <ItemListEditor
            label="Card"
            items={(block.items as Record<string, unknown>[]) ?? []}
            onChange={(v) => set('items', v)}
            newItem={{ title: '', description: '', image: '', imageAlt: '', href: '', meta: [], tag: '' }}
            fields={[
              { key: 'title', label: 'Title' },
              { key: 'description', label: 'Description', multiline: true },
              { key: 'image', label: 'Image URL or media path' },
              { key: 'imageAlt', label: 'Image alt text' },
              { key: 'href', label: 'Link (optional)' },
              { key: 'tag', label: 'Badge (optional)' },
            ]}
          />
        </>
      );
    case 'stats':
      return (
        <ItemListEditor
          label="Stat"
          items={(block.items as Record<string, unknown>[]) ?? []}
          onChange={(v) => set('items', v)}
          newItem={{ value: '', label: '' }}
          fields={[
            { key: 'value', label: 'Value (e.g. 250+)' },
            { key: 'label', label: 'Label' },
          ]}
        />
      );
    case 'testimonials':
      return (
        <>
          <TextField label="Eyebrow" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <ItemListEditor
            label="Testimonial"
            items={(block.items as Record<string, unknown>[]) ?? []}
            onChange={(v) => set('items', v)}
            newItem={{ quote: '', author: '', role: '', initials: '' }}
            fields={[
              { key: 'quote', label: 'Quote', multiline: true },
              { key: 'author', label: 'Author' },
              { key: 'role', label: 'Role / context' },
              { key: 'initials', label: 'Initials' },
            ]}
          />
        </>
      );
    case 'richtext':
      return (
        <>
          <TextField label="Eyebrow" value={String(block.eyebrow ?? '')} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <ListField label="Paragraphs" itemLabel="paragraph" values={(block.paragraphs as string[]) ?? []} onChange={(v) => set('paragraphs', v)} multiline />
        </>
      );
    case 'cta':
      return (
        <>
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <TextField label="Body" value={String(block.body ?? '')} onChange={(v) => set('body', v)} multiline />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Button label" value={String(block.buttonLabel ?? '')} onChange={(v) => set('buttonLabel', v)} />
            <TextField label="Button link" value={String(block.buttonHref ?? '')} onChange={(v) => set('buttonHref', v)} />
          </div>
        </>
      );
    case 'contact':
      return (
        <>
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <ListField label="Intro paragraphs" itemLabel="paragraph" values={(block.body as string[]) ?? []} onChange={(v) => set('body', v)} multiline />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Email" value={String(block.email ?? '')} onChange={(v) => set('email', v)} />
            <TextField label="Phone" value={String(block.phone ?? '')} onChange={(v) => set('phone', v)} />
            <TextField label="Address" value={String(block.address ?? '')} onChange={(v) => set('address', v)} />
            <TextField label="Hours" value={String(block.hours ?? '')} onChange={(v) => set('hours', v)} />
          </div>
        </>
      );
    case 'postlist':
      return (
        <>
          <TextField label="Heading" value={String(block.heading ?? '')} onChange={(v) => set('heading', v)} maxLength={200} />
          <TextField label="Intro" value={String(block.intro ?? '')} onChange={(v) => set('intro', v)} multiline />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Limit" value={String(block.limit ?? '')} onChange={(v) => set('limit', Number(v) || undefined)} />
            <TextField label="Category slug filter" value={String(block.categorySlug ?? '')} onChange={(v) => set('categorySlug', v || undefined)} />
          </div>
          <p className="text-[11px] text-slate-400">Shows this website&rsquo;s published posts — themes render it in their own style.</p>
        </>
      );
    default:
      return <p className="text-sm text-slate-400">This block type has no editable fields.</p>;
  }
}

export function BlockEditor({ name, initialBlocks }: { name: string; initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState<Record<string, unknown>[]>(initialBlocks as unknown as Record<string, unknown>[]);
  const [error, setError] = useState<string | null>(null);
  const [addType, setAddType] = useState<string>('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const json = useMemo(() => JSON.stringify(blocks), [blocks]);
  const label = (type: string) => BLOCK_TYPES.find((b) => b.type === type)?.label ?? type;

  function addBlock() {
    if (!addType) return;
    const empty: Record<string, Record<string, unknown>> = {
      hero: { eyebrow: '', title: '', subtitle: '', image: '', imageAlt: '' },
      logos: { heading: 'Trusted by', items: [] },
      intro: { eyebrow: '', heading: '', body: [], image: '', imageAlt: '' },
      features: { eyebrow: '', heading: '', intro: '', items: [] },
      cards: { eyebrow: '', heading: '', intro: '', items: [] },
      stats: { items: [] },
      testimonials: { eyebrow: '', heading: '', items: [] },
      richtext: { eyebrow: '', heading: '', paragraphs: [] },
      cta: { heading: '', body: '', buttonLabel: '', buttonHref: '/contact' },
      contact: { heading: '', body: [], email: '', phone: '', address: '', hours: '' },
      postlist: { heading: 'Latest posts', limit: 3 },
    };
    const template = empty[addType] ?? {};
    setBlocks((prev) => [...prev, { type: addType, ...template }]);
    setOpenIndex(blocks.length);
    setAddType('');
  }

  function move(index: number, delta: number) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOpenIndex(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">Content blocks</h3>
        <span className="text-xs text-slate-400">
          {blocks.length} block{blocks.length === 1 ? '' : 's'} · themes render each block in their own style
        </span>
      </div>

      <div className="space-y-3">
        {blocks.map((block, i) => {
          const open = openIndex === i;
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex min-w-0 items-center gap-2 text-left"
                  aria-expanded={open}
                >
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                    {label(String(block.type))}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {String(block.title ?? block.heading ?? block.type)}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 text-slate-400">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-1 text-xs hover:bg-slate-100 disabled:opacity-30" aria-label={`Move ${label(String(block.type))} block up`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="rounded px-1.5 py-1 text-xs hover:bg-slate-100 disabled:opacity-30" aria-label={`Move ${label(String(block.type))} block down`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => setBlocks((prev) => prev.filter((_, idx) => idx !== i))} className="rounded px-1.5 py-1 text-xs hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${label(String(block.type))} block`}>
                    ✕
                  </button>
                </div>
              </div>
              {open && (
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <BlockFields block={block} onChange={(b) => setBlocks((prev) => prev.map((it, idx) => (idx === i ? b : it)))} />
                </div>
              )}
            </div>
          );
        })}
        {blocks.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            No blocks yet. Add your first content block below.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={addType} onChange={(e) => setAddType(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" aria-label="Block type to add">
          <option value="">Add a block…</option>
          {BLOCK_TYPES.map((b) => (
            <option key={b.type} value={b.type}>
              {b.label} — {b.description}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setError(null);
            addBlock();
          }}
          disabled={!addType}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"
        >
          + Add block
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <input type="hidden" name={name} value={json} />
    </div>
  );
}
