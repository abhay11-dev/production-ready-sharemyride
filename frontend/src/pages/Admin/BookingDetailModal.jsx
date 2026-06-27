import React from 'react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN') : '—';

function InfoRow({ label, value }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-44 flex-shrink-0 mt-0.5">{label}</span>
            <span className="text-sm text-gray-800 flex-1">{value || '—'}</span>
        </div>
    );
}

export default function BookingDetailModal({ booking: b, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="font-bold text-gray-900">Booking Details</h2>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{b._id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Fare Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-5 border border-blue-100">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Fare Breakdown</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Base Fare</span><span className="font-medium">₹{b.baseFare || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Platform Fee</span><span className="font-medium">₹{b.passengerServiceFee || b.platformFee || 0}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">GST</span><span className="font-medium">₹{b.passengerServiceFeeGST || b.gst || 0}</span></div>
                            {b.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{b.discountAmount}</span></div>}
                            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
                                <span>Total</span><span>₹{b.totalFare || b.finalAmount || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Passenger */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Passenger</p>
                        <InfoRow label="Name" value={b.passenger?.name} />
                        <InfoRow label="Email" value={b.passenger?.email} />
                        <InfoRow label="Phone" value={b.passenger?.phone} />
                    </div>

                    {/* Ride info */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Journey</p>
                        <InfoRow label="Pickup" value={b.pickupLocation} />
                        <InfoRow label="Drop" value={b.dropLocation} />
                        <InfoRow label="Seats" value={b.seatsBooked} />
                        <InfoRow label="Match Type" value={b.matchType} />
                        <InfoRow label="Distance" value={b.userSearchDistance ? `${b.userSearchDistance} km` : undefined} />
                        <InfoRow label="Per KM" value={b.perKmRate ? `₹${b.perKmRate}` : undefined} />
                    </div>

                    {/* Status */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Status & Payment</p>
                        <InfoRow label="Booking Status" value={b.status} />
                        <InfoRow label="Payment Status" value={b.paymentStatus} />
                        <InfoRow label="Payment Method" value={b.paymentMethod} />
                        <InfoRow label="Transaction ID" value={b.razorpayPaymentId || b.transactionId} />
                        <InfoRow label="Coupon" value={b.couponCode} />
                        <InfoRow label="Created" value={fmtDT(b.createdAt)} />
                        <InfoRow label="First Ride Free" value={b.isFirstRideFree ? 'Yes' : 'No'} />
                    </div>

                    {b.passengerNotes && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Passenger Notes</p>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100">{b.passengerNotes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}