// src/components/settings/TrustedContactsManager.jsx


import React, { useEffect, useState } from 'react';
import * as contactsService from '../../services/trustedContactsService';
import Icon from '../ui/Icon.jsx';

const RELATIONSHIPS = ['primary', 'secondary', 'guardian', 'family', 'friend'];

function ContactRow({ contact, onUpdate, onRemove }) {
  const [busy, setBusy] = useState(false);

  const toggleNotifiable = async () => {
    setBusy(true);
    try {
      await onUpdate(contact._id, { notifiable: !contact.notifiable });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white">
      <div>
        <p className="font-medium text-gray-900">
          {contact.name}{' '}
          <span className="text-xs font-normal text-gray-400 capitalize">({contact.relationship})</span>
        </p>
        <p className="text-sm text-gray-500">{contact.phone}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={contact.notifiable} onChange={toggleNotifiable} disabled={busy} />
          Notify in emergencies
        </label>
        <button
          onClick={() => onRemove(contact._id)}
          disabled={busy}
          className="text-gray-400 hover:text-red-600 transition-colors"
          aria-label={`Remove ${contact.name}`}
        >
          <Icon name="Trash2" size="sm" />
        </button>
      </div>
    </div>
  );
}

export default function TrustedContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', relationship: 'primary' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setContacts(await contactsService.getTrustedContacts());
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load trusted contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await contactsService.addTrustedContact(form);
      setContacts(updated);
      setForm({ name: '', phone: '', relationship: 'primary' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not add contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (contactId, updates) => {
    const updated = await contactsService.updateTrustedContact(contactId, updates);
    setContacts(updated);
  };

  const handleRemove = async (contactId) => {
    const updated = await contactsService.removeTrustedContact(contactId);
    setContacts(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Trusted Contacts</h3>
        <p className="text-sm text-gray-500">
          These people can be notified automatically if you trigger an SOS during a ride.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {contacts.length === 0 && (
            <p className="text-sm text-gray-400">No trusted contacts added yet.</p>
          )}
          {contacts.map((c) => (
            <ContactRow key={c._id} contact={c} onUpdate={handleUpdate} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <select
          value={form.relationship}
          onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm capitalize"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Adding…' : 'Add Contact'}
        </button>
      </form>
    </div>
  );
}