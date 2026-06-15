'use client';

import { useState } from 'react';

type Category = { id: string; name: string; order: number; clientSlug: string };

const EMPTY = { name: '', order: 0 };

export default function KategorieClient({ initialCategories }: { initialCategories: Category[] }) {
  const [kategorie, setKategorie] = useState(initialCategories);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setForm(EMPTY);
    setEditing(null);
    setError(null);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setForm({ name: c.name, order: c.order });
    setEditing(c.id);
    setError(null);
    setShowForm(true);
  }

  function close() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/categories/${editing}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Błąd zapisu.'); return; }

      const listRes = await fetch('/api/admin/categories');
      setKategorie(await listRes.json());
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setSaving(false);
    }
  }

  async function deleteKategoria(id: string) {
    if (!confirm('Usunąć tę kategorię? Produkty przypisane do niej stracą kategorię.')) return;
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    setKategorie(prev => prev.filter(c => c.id !== id));
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">Kategorie ({kategorie.length})</h2>
        <button
          onClick={openNew}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + Nowa kategoria
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="w-24 px-4 py-3">Kolejność</th>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {kategorie.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-zinc-400">
                  Brak kategorii. Dodaj pierwszą kategorię.
                </td>
              </tr>
            )}
            {kategorie.map(c => (
              <tr key={c.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-500">{c.order}</td>
                <td className="px-4 py-3 font-semibold text-zinc-900">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => deleteKategoria(c.id)}
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-zinc-900">
              {editing ? 'Edytuj kategorię' : 'Nowa kategoria'}
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
                <label className="mb-1 block text-xs font-semibold text-zinc-600">
                  Kolejność wyświetlania
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                />
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
                disabled={saving}
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
