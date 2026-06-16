import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Legal Centre</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto text-sm">
                        Last updated: June 1, 2026
                    </p>
                </div>
            </section>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            When you use ShareMyRide, we collect information in three categories:<br/><br/>
                            <strong>Account Data:</strong> When you register, we collect your name, email address, phone number, profile photo, gender (optional), and date of birth. Drivers additionally provide government-issued ID numbers (Aadhaar) and driving licence details for verification purposes.<br/><br/>
                            <strong>Usage Data:</strong> We automatically collect information about how you use our platform — rides searched, bookings made, pages visited, features used, device type, operating system, browser type, IP address, and approximate location (city-level) when you interact with ride listings.<br/><br/>
                            <strong>Communication Data:</strong> Messages exchanged through our in-app messaging system, support tickets submitted, reviews and ratings you post, and any feedback you provide are stored to facilitate ride coordination and improve platform safety.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Cookies & Tracking</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            We use cookies and similar tracking technologies to provide, secure, and improve our services. Essential cookies are required for the platform to function — including session authentication and security tokens. Analytics cookies (using anonymised data) help us understand how people navigate ShareMyRide so we can improve it.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. How We Use Your Data</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            We use your information to: provide and personalise the ShareMyRide platform; verify driver identity and maintain community safety; match passengers with relevant ride listings; process booking requests and communications between riders; send service notifications (booking confirmations, ride reminders, safety alerts); analyse platform usage to improve features and fix bugs; enforce our Community Guidelines and Terms of Service; and comply with legal obligations.<br/><br/>
                            We do not sell your personal data to third parties. We do not use your data for targeted advertising.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            ShareMyRide implements industry-standard security measures to protect your data. These include TLS encryption for all data in transit; bcrypt hashing for passwords (never stored in plaintext); JWT access tokens with 15-minute expiry and HttpOnly refresh cookies; regular security audits and penetration testing; access controls ensuring only authorised team members can access user data; and incident response procedures for data breach scenarios.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Contact Us</h2>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            For privacy-related queries, contact our data team at: <strong>sharemyride@gmail.com</strong> with subject "Privacy Inquiry". We aim to respond to all privacy queries within 5 business days.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
