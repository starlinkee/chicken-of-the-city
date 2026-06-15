'use client';

import { useRef, useState } from 'react';

type Category = { id: string; name: string; order: number; clientSlug: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  allergens: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  active: boolean;
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  allergens: '',
  imageUrl: '',
  categoryId: '',
  active: true,
};

export default function ProductyClient({
  initialProducts,
  initialCategories,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const [produkty, setProducty] = useState(initialProducts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      allergens: p.allergens ?? '',
      imageUrl: p.imageUrl ?? '',
      categoryId: p.categoryId ?? '',
      active: p.active,
    });
    setEditing(p.id);
    setError(null);
    setShowForm(true);
  }

  function close() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  async function uploadImage(file: File): Promise<string> {
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
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (fileRef.current?.files?.[0]) {
        imageUrl = await uploadImage(fileRef.current.files[0]);
      }

      const payload = { ...form, imageUrl, price: parseFloat(form.price) };
      const res = editing
        ? await fetch(`/api/admin/products/${editing}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Błąd zapisu.'); return; }

      const listRes = await fetch('/api/admin/products');
      const list = await listRes.json();
      setProducty(list.map((p: Product & { price: string }) => ({ ...p, price: parseFloat(p.price) })));
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, active: !p.active }),
    });
    setProducty(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
  }

  async function deleteProduct(id: string) {
    if (!confirm('Usunąć ten produkt?')) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    setProducty(prev => prev.filter(x => x.id !== id));
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">Produkty ({produkty.length})</h2>
        <button
          onClick={openNew}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + Nowy produkt
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Produkt</th>
              <th className="px-4 py-3">Kategoria</th>
              <th className="px-4 py-3">Cena</th>
              <th className="px-4 py-3">Aktywny</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {produkty.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                  Brak produktów. Dodaj pierwszy produkt.
                </td>
              </tr>
            )}
            {produkty.map(p => (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-semibold text-zinc-900">{p.name}</p>
                      {p.description && (
                        <p className="line-clamp-1 text-xs text-zinc-400">{p.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{p.categoryName ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-zinc-900">{p.price.toFixed(2)} zł</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {p.active ? 'Tak' : 'Nie'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-zinc-900">
              {editing ? 'Edytuj produkt' : 'Nowy produkt'}
            </h3>

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Nazwa *</label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Opis</label>
                <textarea
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Cena (zł) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Kategoria</label>
                  <select
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">— brak —</option>
                    {initialCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Alergeny</label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="np. gluten, mleko, jaja"
                  value={form.allergens}
                  onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Zdjęcie</label>
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="podgląd" className="mb-2 h-20 w-20 rounded-lg object-cover" />
                )}
                <input ref={fileRef} type="file" accept="image/*" className="text-sm text-zinc-600" />
                {uploading && <p className="mt-1 text-xs text-zinc-400">Wysyłanie zdjęcia…</p>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prod-active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="prod-active" className="text-sm font-semibold text-zinc-700">
                  Aktywny (widoczny w menu)
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={close}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Anuluj
              </button>
              <button
                onClick={save}
                disabled={saving || uploading}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? 'Zapisuję…' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
