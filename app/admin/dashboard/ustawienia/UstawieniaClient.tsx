'use client';

import { useRef, useState } from 'react';

type Settings = {
  id: string;
  clientSlug: string;
  phone: string | null;
  address: string | null;
  emailContact: string | null;
  openingHours: string | null;
  minimumOrderAmount: string | null;
  restaurantName: string | null;
  tagline: string | null;
  heroLabel: string | null;
  heroTitle: string | null;
  heroHighlight: string | null;
  heroSubtitle: string | null;
  categoryEmoji: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  faviconUrl: string | null;
  ownerEmailSubject: string | null;
  ownerEmailBody: string | null;
  customerEmailSubject: string | null;
  customerEmailBody: string | null;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  resendApiKey: string | null;
  resendFrom: string | null;
};

type FormState = Record<keyof Omit<Settings, 'id' | 'clientSlug'>, string>;

function toForm(s: Settings | null): FormState {
  return {
    phone: s?.phone ?? '',
    address: s?.address ?? '',
    emailContact: s?.emailContact ?? '',
    openingHours: s?.openingHours ?? '',
    minimumOrderAmount: s?.minimumOrderAmount ?? '',
    restaurantName: s?.restaurantName ?? '',
    tagline: s?.tagline ?? '',
    heroLabel: s?.heroLabel ?? '',
    heroTitle: s?.heroTitle ?? '',
    heroHighlight: s?.heroHighlight ?? '',
    heroSubtitle: s?.heroSubtitle ?? '',
    categoryEmoji: s?.categoryEmoji ?? '',
    brandColor: s?.brandColor ?? '#FF6B35',
    secondaryColor: s?.secondaryColor ?? '#2C3E50',
    metaTitle: s?.metaTitle ?? '',
    metaDescription: s?.metaDescription ?? '',
    faviconUrl: s?.faviconUrl ?? '',
    ownerEmailSubject: s?.ownerEmailSubject ?? '',
    ownerEmailBody: s?.ownerEmailBody ?? '',
    customerEmailSubject: s?.customerEmailSubject ?? '',
    customerEmailBody: s?.customerEmailBody ?? '',
    stripePublishableKey: s?.stripePublishableKey ?? '',
    stripeSecretKey: s?.stripeSecretKey ?? '',
    stripeWebhookSecret: s?.stripeWebhookSecret ?? '',
    resendApiKey: s?.resendApiKey ?? '',
    resendFrom: s?.resendFrom ?? '',
  };
}

type Section = 'restauracja' | 'brand' | 'seo' | 'email' | 'platnosci';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'restauracja', label: 'Restauracja' },
  { id: 'brand', label: 'Brand' },
  { id: 'seo', label: 'SEO' },
  { id: 'email', label: 'Email' },
  { id: 'platnosci', label: 'Płatności' },
];

export default function UstawieniaClient({ settings }: { settings: Settings | null }) {
  const [form, setForm] = useState<FormState>(toForm(settings));
  const [activeSection, setActiveSection] = useState<Section>('restauracja');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function uploadFavicon(file: File): Promise<string> {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) throw new Error(data.error ?? 'Błąd uploadu');
    return data.url as string;
  }

  async function save() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      let faviconUrl = form.faviconUrl;
      if (faviconRef.current?.files?.[0]) {
        faviconUrl = await uploadFavicon(faviconRef.current.files[0]);
        set('faviconUrl', faviconUrl);
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, faviconUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Błąd zapisu.'); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">Ustawienia</h2>
        <button
          onClick={save}
          disabled={saving || uploading}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Zapisuję…' : 'Zapisz zmiany'}
        </button>
      </div>

      {success && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
          Zapisano!
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mb-6 flex gap-1 border-b border-zinc-200">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeSection === s.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {activeSection === 'restauracja' && (
          <div className="space-y-4">
            <Field label="Nazwa restauracji" value={form.restaurantName} onChange={v => set('restaurantName', v)} />
            <Field label="Tagline" value={form.tagline} onChange={v => set('tagline', v)} placeholder="np. of the City" />
            <Field label="Telefon" value={form.phone} onChange={v => set('phone', v)} />
            <Field label="Adres" value={form.address} onChange={v => set('address', v)} />
            <Field label="E-mail kontaktowy" value={form.emailContact} onChange={v => set('emailContact', v)} type="email" />
            <Field label="Godziny otwarcia" value={form.openingHours} onChange={v => set('openingHours', v)} placeholder="np. Pn–Pt 11:00–22:00" />
            <Field label="Minimalna kwota zamówienia (zł)" value={form.minimumOrderAmount} onChange={v => set('minimumOrderAmount', v)} type="number" />
          </div>
        )}

        {activeSection === 'brand' && (
          <div className="space-y-4">
            <Field label="Hero label" value={form.heroLabel} onChange={v => set('heroLabel', v)} placeholder="np. Zamów online" />
            <Field label="Hero tytuł" value={form.heroTitle} onChange={v => set('heroTitle', v)} />
            <Field label="Hero highlight (pomarańczowy)" value={form.heroHighlight} onChange={v => set('heroHighlight', v)} />
            <Field label="Hero podtytuł" value={form.heroSubtitle} onChange={v => set('heroSubtitle', v)} />
            <Field label="Emoji kategorii (fallback)" value={form.categoryEmoji} onChange={v => set('categoryEmoji', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Kolor główny</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={e => set('brandColor', e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={form.brandColor}
                    onChange={e => set('brandColor', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Kolor dodatkowy</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={e => set('secondaryColor', e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={form.secondaryColor}
                    onChange={e => set('secondaryColor', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'seo' && (
          <div className="space-y-4">
            <Field label="Meta title" value={form.metaTitle} onChange={v => set('metaTitle', v)} />
            <Field label="Meta description" value={form.metaDescription} onChange={v => set('metaDescription', v)} multiline />
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Favicon</label>
              {form.faviconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.faviconUrl} alt="favicon" className="mb-2 h-10 w-10 rounded" />
              )}
              <input ref={faviconRef} type="file" accept="image/*" className="text-sm text-zinc-600" />
              {uploading && <p className="mt-1 text-xs text-zinc-400">Wysyłanie…</p>}
            </div>
          </div>
        )}

        {activeSection === 'email' && (
          <div className="space-y-4">
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              Dostępne zmienne: <code>{'{orderId}'}</code> <code>{'{name}'}</code> <code>{'{email}'}</code> <code>{'{amount}'}</code> <code>{'{items}'}</code> <code>{'{address}'}</code> <code>{'{notes}'}</code>
            </p>
            <Field label="Temat emaila do właściciela" value={form.ownerEmailSubject} onChange={v => set('ownerEmailSubject', v)} />
            <Field label="Treść emaila do właściciela" value={form.ownerEmailBody} onChange={v => set('ownerEmailBody', v)} multiline rows={5} />
            <Field label="Temat potwierdzenia dla klienta" value={form.customerEmailSubject} onChange={v => set('customerEmailSubject', v)} />
            <Field label="Treść potwierdzenia dla klienta" value={form.customerEmailBody} onChange={v => set('customerEmailBody', v)} multiline rows={5} />
          </div>
        )}

        {activeSection === 'platnosci' && (
          <div className="space-y-4">
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              Klucze dla tej restauracji — nadpisują wartości z env var (fallback).
            </p>
            <Field label="Stripe Publishable Key" value={form.stripePublishableKey} onChange={v => set('stripePublishableKey', v)} placeholder="pk_live_..." />
            <Field label="Stripe Secret Key" value={form.stripeSecretKey} onChange={v => set('stripeSecretKey', v)} placeholder="sk_live_..." type="password" />
            <Field label="Stripe Webhook Secret" value={form.stripeWebhookSecret} onChange={v => set('stripeWebhookSecret', v)} placeholder="whsec_..." type="password" />
            <Field label="Resend API Key" value={form.resendApiKey} onChange={v => set('resendApiKey', v)} placeholder="re_..." type="password" />
            <Field label="Resend From (adres nadawcy)" value={form.resendFrom} onChange={v => set('resendFrom', v)} placeholder="zamowienia@restauracja.pl" type="email" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const cls =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none';
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-zinc-600">{label}</label>
      {multiline ? (
        <textarea
          className={cls}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
