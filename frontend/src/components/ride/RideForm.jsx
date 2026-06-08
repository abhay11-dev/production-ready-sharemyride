// src/components/ride/RideForm.jsx
import React, { useState } from 'react';
import PaymentCalculator from '../../utils/paymentCalculator';

// ─── Minimal toggle checkbox ──────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center justify-between cursor-pointer py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
  </label>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ icon, title, children }) => (
  <div className="mb-6 pb-6 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
      <span className="text-base">{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

// ─── Form field wrapper ───────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
const selectCls = `${inputCls} bg-white`;

// ═════════════════════════════════════════════════════════════════════════════
function RideForm({ onSubmit, isLoading }) {

  // ── Trip ────────────────────────────────────────────────────────────────
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState(1);

  // ── Waypoints ───────────────────────────────────────────────────────────
  const [waypoints, setWaypoints] = useState([]);

  // ── Pricing ─────────────────────────────────────────────────────────────
  const [fare, setFare] = useState('');
  const [tollIncluded, setTollIncluded] = useState(false);
  const [negotiableFare, setNegotiableFare] = useState(false);

  // ── Vehicle ─────────────────────────────────────────────────────────────
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [acAvailable, setAcAvailable] = useState(true);
  const [luggageSpace, setLuggageSpace] = useState('Medium');

  // ── Contact ─────────────────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  // ── Preferences ─────────────────────────────────────────────────────────
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [musicAllowed, setMusicAllowed] = useState(true);
  const [petFriendly, setPetFriendly] = useState(false);
  const [luggageAllowed, setLuggageAllowed] = useState(true);
  const [womenOnly, setWomenOnly] = useState(false);
  const [allowPartialRoute, setAllowPartialRoute] = useState(true);

  // ── Notes ───────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState('');

  // ── Fare preview ────────────────────────────────────────────────────────
  const baseFare = parseFloat(fare) || 0;
  const platformFee = baseFare * 0.08;
  const gst = platformFee * 0.18;
  const driverNet = baseFare - platformFee - gst;
  const totalEarning = driverNet * (parseInt(seats) || 1);

  // ── Waypoint helpers ─────────────────────────────────────────────────────
  const addWaypoint = () =>
    setWaypoints(prev => [...prev, { location: '', order: prev.length + 1 }]);

  const removeWaypoint = (i) =>
    setWaypoints(prev => prev.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, order: idx + 1 })));

  const updateWaypoint = (i, val) =>
    setWaypoints(prev => prev.map((w, idx) => idx === i ? { ...w, location: val } : w));

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    if (!start.trim()) return 'Enter a starting location';
    if (!end.trim()) return 'Enter a destination';
    if (start.trim().toLowerCase() === end.trim().toLowerCase()) return 'Start and destination cannot be the same';
    if (!date) return 'Select a travel date';
    if (!time) return 'Select departure time';
    const seats_ = parseInt(seats);
    if (!seats_ || seats_ < 1 || seats_ > 8) return 'Seats must be between 1 and 8';
    if (!fare || isNaN(parseFloat(fare)) || parseFloat(fare) < 1) return 'Enter a valid fare (min ₹1)';
    if (!vehicleNumber.trim()) return 'Enter your vehicle number';
    const plateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
    if (!plateRegex.test(vehicleNumber.replace(/\s/g, '').toUpperCase())) return 'Invalid vehicle number (e.g. PB10AB1234)';
    if (!phoneNumber.trim()) return 'Enter a contact phone number';
    if (!/^[6-9]\d{9}$/.test(phoneNumber.replace(/\s/g, ''))) return 'Enter a valid 10-digit Indian mobile number';
    if (!address.trim()) return 'Enter the pickup address';
    if (address.trim().length < 10) return 'Pickup address is too short — add more detail';
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      // Dispatch a toast-friendly error — parent can catch via a thrown error or we import toast here
      import('react-hot-toast').then(({ default: toast }) => toast.error(error));
      return;
    }

    const formattedWaypoints = waypoints
      .filter(w => w.location.trim())
      .map((w, i) => ({ location: w.location.trim(), order: i + 1 }));

    const rideData = {
      // Trip
      start: start.trim(),
      end: end.trim(),
      date,
      time,
      seats: parseInt(seats),

      // Pricing
      fareMode: 'fixed',
      fare: parseFloat(fare),
      tollIncluded,
      negotiableFare,

      // Vehicle
      vehicleNumber: vehicleNumber.replace(/\s/g, '').toUpperCase(),
      vehicle: {
        number: vehicleNumber.replace(/\s/g, '').toUpperCase(),
        type: vehicleType,
        model: vehicleModel.trim(),
        color: vehicleColor.trim(),
        acAvailable,
        luggageSpace
      },

      // Contact
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      address: address.trim(),
      pickupInstructions: pickupInstructions.trim(),

      // Route
      waypoints: formattedWaypoints,
      allowPartialRoute,

      // Preferences
      preferences: {
        smokingAllowed,
        musicAllowed,
        petFriendly,
        luggageAllowed,
        womenOnly,
        talkative: true,
        pickupFlexibility: true,
        childSeatAvailable: false
      },

      // Notes
      notes: notes.trim()
    };

    onSubmit(rideData);
    resetForm();
  };

  const resetForm = () => {
    setStart(''); setEnd(''); setDate(''); setTime(''); setSeats(1);
    setFare(''); setTollIncluded(false); setNegotiableFare(false);
    setVehicleNumber(''); setVehicleType('Sedan'); setVehicleModel('');
    setVehicleColor(''); setAcAvailable(true); setLuggageSpace('Medium');
    setPhoneNumber(''); setAddress(''); setPickupInstructions('');
    setSmokingAllowed(false); setMusicAllowed(true); setPetFriendly(false);
    setLuggageAllowed(true); setWomenOnly(false); setAllowPartialRoute(true);
    setNotes(''); setWaypoints([]);
  };

  const today = new Date().toISOString().split('T')[0];

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-xl rounded-2xl px-5 sm:px-8 py-7 w-full max-w-2xl border border-gray-200"
    >
      <div className="text-center mb-7">
        <h2 className="text-2xl font-bold text-gray-900">Post a Ride</h2>
        <p className="text-sm text-gray-500 mt-1">Share your journey · Help someone travel</p>
      </div>

      {/* ── SECTION: Trip Details ──────────────────────────────────── */}
      <Section icon="🗺️" title="Trip Details">
        <div className="space-y-4">

          {/* From */}
          <Field label="From" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="e.g. Phagwara, Punjab"
                value={start}
                onChange={e => setStart(e.target.value)}
                className={`${inputCls} pl-9`}
                required
              />
            </div>
          </Field>

          {/* Via (waypoints) */}
          {waypoints.length > 0 && (
            <div className="space-y-2 pl-2 border-l-2 border-dashed border-gray-200">
              {waypoints.map((wp, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-gray-300 text-xs w-4 text-center">{i + 1}</span>
                  <input
                    type="text"
                    placeholder={`Stop ${i + 1} (e.g. Jalandhar)`}
                    value={wp.location}
                    onChange={e => updateWaypoint(i, e.target.value)}
                    className={`${inputCls} flex-1 py-2`}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(i)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addWaypoint}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add a stop
          </button>

          {/* To */}
          <Field label="To" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="e.g. Chandigarh"
                value={end}
                onChange={e => setEnd(e.target.value)}
                className={`${inputCls} pl-9`}
                required
              />
            </div>
          </Field>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} className={inputCls} required />
            </Field>
            <Field label="Departure" required>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} required />
            </Field>
          </div>

          {/* Seats */}
          <Field label="Seats Available" required hint="How many passengers can join? (1–8)">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSeats(s => Math.max(1, parseInt(s) - 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg transition-colors"
              >−</button>
              <input
                type="number"
                min={1} max={8}
                value={seats}
                onChange={e => setSeats(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-16 text-center border border-gray-300 rounded-xl py-2.5 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setSeats(s => Math.min(8, parseInt(s) + 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg transition-colors"
              >+</button>
            </div>
          </Field>

          {/* Partial route toggle */}
          <Toggle
            checked={allowPartialRoute}
            onChange={setAllowPartialRoute}
            label="Allow partial route bookings"
          />
        </div>
      </Section>

      {/* ── SECTION: Pricing ────────────────────────────────────────── */}
      <Section icon="💰" title="Pricing">
        <div className="space-y-4">
          <Field label="Fare per seat (₹)" required hint="What you want to receive per seat">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">₹</span>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="500"
                value={fare}
                onChange={e => setFare(e.target.value)}
                className={`${inputCls} pl-8`}
                required
              />
            </div>
          </Field>

          {/* Live breakdown — only when fare entered */}
          {baseFare > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Your fare</span>
                <span className="font-semibold">₹{baseFare.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Platform fee (8%)</span>
                <span>−₹{platformFee.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>GST on fee (18%)</span>
                <span>−₹{gst.toFixed(0)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-gray-900">
                <span>You receive / seat</span>
                <span className="text-green-600 text-base">₹{driverNet.toFixed(0)}</span>
              </div>
              {seats > 1 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Total ({seats} seats fully booked)</span>
                  <span className="font-semibold text-green-600">₹{totalEarning.toFixed(0)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1 border border-gray-100 rounded-xl p-3">
            <Toggle checked={tollIncluded} onChange={setTollIncluded} label="Toll charges included in fare" />
            <Toggle checked={negotiableFare} onChange={setNegotiableFare} label="Fare is negotiable" />
          </div>
        </div>
      </Section>

      {/* ── SECTION: Vehicle ─────────────────────────────────────────── */}
      <Section icon="🚗" title="Vehicle">
        <div className="space-y-4">
          <Field label="Registration Number" required hint="e.g. PB10AB1234">
            <input
              type="text"
              placeholder="PB10AB1234"
              value={vehicleNumber}
              onChange={e => setVehicleNumber(e.target.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={13}
              className={`${inputCls} uppercase font-mono tracking-wider`}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className={selectCls}>
                {['Hatchback', 'Sedan', 'SUV', 'MUV', 'Bike'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Luggage Space">
              <select value={luggageSpace} onChange={e => setLuggageSpace(e.target.value)} className={selectCls}>
                {['Small', 'Medium', 'Large', 'None'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Model">
              <input
                type="text"
                placeholder="e.g. Honda City"
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Color">
              <input
                type="text"
                placeholder="e.g. White"
                value={vehicleColor}
                onChange={e => setVehicleColor(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Toggle checked={acAvailable} onChange={setAcAvailable} label="AC available" />
        </div>
      </Section>

      {/* ── SECTION: Contact & Pickup ────────────────────────────────── */}
      <Section icon="📍" title="Contact & Pickup">
        <div className="space-y-4">
          <Field label="Phone Number" required hint="Passengers will contact you on this number">
            <input
              type="tel"
              placeholder="98765 43210"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={inputCls}
              maxLength={10}
              required
            />
          </Field>

          <Field label="Pickup Address" required hint="Street / landmark / area for passengers to find you">
            <textarea
              placeholder="e.g. Near PHAGWARA BUS STAND, opposite HDFC Bank, GT Road"
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={2}
              maxLength={300}
              className={`${inputCls} resize-none`}
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{address.length}/300</p>
          </Field>

          <Field label="Pickup Instructions" hint="Optional — special directions or landmarks">
            <input
              type="text"
              placeholder="e.g. Call when near, I'll come out"
              value={pickupInstructions}
              onChange={e => setPickupInstructions(e.target.value)}
              maxLength={200}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* ── SECTION: Preferences ─────────────────────────────────────── */}
      <Section icon="⚙️" title="Ride Preferences">
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
          <div className="px-4"><Toggle checked={musicAllowed} onChange={setMusicAllowed} label="🎵  Music allowed" /></div>
          <div className="px-4"><Toggle checked={smokingAllowed} onChange={setSmokingAllowed} label="🚬  Smoking allowed" /></div>
          <div className="px-4"><Toggle checked={petFriendly} onChange={setPetFriendly} label="🐾  Pet friendly" /></div>
          <div className="px-4"><Toggle checked={luggageAllowed} onChange={setLuggageAllowed} label="🧳  Luggage allowed" /></div>
          <div className="px-4"><Toggle checked={womenOnly} onChange={setWomenOnly} label="👩  Women only" /></div>
        </div>
      </Section>

      {/* ── SECTION: Notes ───────────────────────────────────────────── */}
      <Section icon="📝" title="Additional Notes">
        <textarea
          placeholder="Anything passengers should know? (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          className={`${inputCls} resize-none`}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/500</p>
      </Section>

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading
          ? <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Posting Ride...
            </span>
          : 'Post Ride'
        }
      </button>

      <p className="text-xs text-center text-gray-400 mt-3">
        Fields marked <span className="text-red-500 font-semibold">*</span> are required
      </p>
    </form>
  );
}

export default RideForm;