import React, { useState } from 'react';
import api from '../../config/api';
import toastService from '../../services/toastService';

const EmergencyContactModal = ({ isOpen, onClose, onSaved, role }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('family');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!name.trim()) {
      toastService.error('Required Field', 'Please enter your emergency contact name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toastService.error('Invalid Phone', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      // Save as both legacy emergencyContact + trustedContacts array
      await api.put('/users/profile', {
        emergencyContactName: name.trim(),
        emergencyContact: cleanPhone,
        trustedContacts: [
          {
            name: name.trim(),
            phone: cleanPhone,
            relationship,
            notifiable: true
          }
        ]
      });

      toastService.success('Emergency contact saved!', 'Your contact is set for ride safety.');
      if (onSaved) onSaved({ name: name.trim(), phone: cleanPhone, relationship });
    } catch (err) {
      console.error('Failed to save emergency contact:', err);
      toastService.error('Error saving contact', err.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <h3 className="text-lg font-bold">Emergency Contact Required</h3>
              <p className="text-red-100 text-xs mt-0.5">
                {role === 'driver' ? 'Drivers' : 'Passengers'} must register a trusted relative before ride start
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            For your safety, ShareMyRide shares automated SOS status updates with your trusted relative during emergency situations.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contact / Relative Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Singh (Father / Spouse)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Relative Mobile Number (10 digits) *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
            >
              <option value="family">Family / Parent / Spouse</option>
              <option value="guardian">Guardian</option>
              <option value="friend">Trusted Friend</option>
              <option value="primary">Primary Relative</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : 'Save & Proceed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmergencyContactModal;
