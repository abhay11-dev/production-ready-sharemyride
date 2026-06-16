import React from 'react';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Legal Centre</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Terms of Service
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto text-sm">
                        Last updated: June 1, 2026
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Eligibility</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            To use ShareMyRide, you must be at least 18 years of age, possess a valid Indian phone number and email address, have the legal capacity to enter into a binding agreement, and not be prohibited from using our services under applicable law.<br/><br/>
                            Drivers must additionally hold a valid Indian driving licence, own or have authorised use of the vehicle they list, and pass our identity verification process. Providing false eligibility information is grounds for immediate account termination.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. User Responsibilities</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            By using ShareMyRide you agree to: provide accurate and complete information in your profile and ride listings; keep your contact information current; use the platform only for its intended purpose of community ride-sharing; not use automated tools to scrape, spam, or manipulate platform data; not circumvent the platform by arranging rides entirely outside the app after initial contact; and comply with all applicable traffic laws during rides.<br/><br/>
                            You are solely responsible for your conduct on the platform and during rides facilitated through it.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Ride Sharing Disclaimer</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            ShareMyRide is a technology platform that connects drivers and passengers. We are not a transportation company. We do not employ drivers, own vehicles, or provide transportation services directly.<br/><br/>
                            Rides facilitated through our platform are private car-sharing arrangements between community members. Fares are cost-sharing contributions — not commercial charges. ShareMyRide does not guarantee the accuracy of ride listings, the conduct of users, or the safety of any particular journey. Users assume responsibility for assessing the suitability of rides and riders before committing.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Community Standards</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            All users agree to abide by our Community Guidelines. Key obligations include: treating all users with respect regardless of background; not engaging in harassment, discrimination, or abusive behaviour; maintaining accurate ride listings; honouring confirmed bookings except in genuine emergencies; and leaving honest reviews based on actual experience.<br/><br/>
                            Violation of community standards may result in warnings, suspension, or permanent removal at ShareMyRide's discretion.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Liability Limitations</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            To the maximum extent permitted by law, ShareMyRide's liability is limited to the service fees (if any) paid by you in the 12 months prior to the claim. ShareMyRide is not liable for: personal injury or property damage during rides; user conduct before, during, or after rides; loss of data; loss of revenue or profits; or any indirect, consequential, or punitive damages.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
