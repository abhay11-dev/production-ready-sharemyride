import React, { useState, useEffect } from 'react';

function useScrollTop() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
}

const SECTIONS = [
  {
    id: 'terms',
    label: 'Terms & Conditions',
    icon: '📋',
    content: [
      {
        title: '1. Eligibility',
        text: `To use ShareMyRide, you must be at least 18 years of age, possess a valid Indian phone number and email address, have the legal capacity to enter into a binding agreement, and not be prohibited from using our services under applicable law.

Drivers must additionally hold a valid Indian driving licence, own or have authorised use of the vehicle they list, and pass our identity verification process. Providing false eligibility information is grounds for immediate account termination.`,
      },
      {
        title: '2. User Responsibilities',
        text: `By using ShareMyRide you agree to: provide accurate and complete information in your profile and ride listings; keep your contact information current; use the platform only for its intended purpose of community ride-sharing; not use automated tools to scrape, spam, or manipulate platform data; not circumvent the platform by arranging rides entirely outside the app after initial contact; and comply with all applicable traffic laws during rides.

You are solely responsible for your conduct on the platform and during rides facilitated through it.`,
      },
      {
        title: '3. Ride Sharing Disclaimer',
        text: `ShareMyRide is a technology platform that connects drivers and passengers. We are not a transportation company. We do not employ drivers, own vehicles, or provide transportation services directly.

Rides facilitated through our platform are private car-sharing arrangements between community members. Fares are cost-sharing contributions — not commercial charges. ShareMyRide does not guarantee the accuracy of ride listings, the conduct of users, or the safety of any particular journey. Users assume responsibility for assessing the suitability of rides and riders before committing.`,
      },
      {
        title: '4. Community Standards',
        text: `All users agree to abide by our Community Guidelines. Key obligations include: treating all users with respect regardless of background; not engaging in harassment, discrimination, or abusive behaviour; maintaining accurate ride listings; honouring confirmed bookings except in genuine emergencies; and leaving honest reviews based on actual experience.

Violation of community standards may result in warnings, suspension, or permanent removal at ShareMyRide's discretion.`,
      },
      {
        title: '5. Cancellation & Booking',
        text: `Passengers may cancel bookings up to 30 minutes before scheduled departure with no penalty. Cancellations within 30 minutes may result in a cancellation fee to compensate the driver. Drivers may only cancel due to genuine emergencies; frequent cancellations result in platform penalties.

Once a ride is cancelled by the driver, the passenger receives a full refund and is notified immediately for alternative ride options.`,
      },
      {
        title: '6. Liability & Indemnification',
        text: `To the maximum extent permitted by law, ShareMyRide is provided on an "as-is" basis. We do not warrant that the platform will be error-free, uninterrupted, or safe from security issues. We are not liable for indirect, incidental, consequential, or punitive damages arising from your use of the platform.

You agree to indemnify and defend ShareMyRide against any claims arising from your violation of these terms, your misuse of the platform, or your breach of applicable law.`,
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & Data Protection',
    icon: '🔒',
    content: [
      {
        title: '1. Information We Collect',
        text: `When you use ShareMyRide, we collect information in three categories:

Account Data: When you register, we collect your name, email address, phone number, profile photo, gender (optional), and date of birth. Drivers additionally provide government-issued ID numbers (Aadhaar) and driving licence details for verification purposes.

Usage Data: We automatically collect information about how you use our platform — rides searched, bookings made, pages visited, features used, device type, operating system, browser type, IP address, and approximate location (city-level) when you interact with ride listings.

Communication Data: Messages exchanged through our in-app messaging system, support tickets submitted, reviews and ratings you post, and any feedback you provide are stored to facilitate ride coordination and improve platform safety.`,
      },
      {
        title: '2. Cookies & Tracking Technologies',
        text: `We use cookies and similar tracking technologies to provide, secure, and improve our services. Essential cookies are required for the platform to function — including session authentication and security tokens. Analytics cookies (using anonymised data) help us understand how people navigate ShareMyRide so we can improve it.

You can control cookie preferences through your browser settings, though some features may not work properly if essential cookies are disabled.`,
      },
      {
        title: '3. How We Use Your Data',
        text: `We use your information to: provide and personalise the ShareMyRide platform; verify driver identity and maintain community safety; match passengers with relevant ride listings; process booking requests and communications between riders; send service notifications (booking confirmations, ride reminders, safety alerts); analyse platform usage to improve features and fix bugs; enforce our Community Guidelines and Terms of Service; and comply with legal obligations.

We do not sell your personal data to third parties. We do not use your data for targeted advertising outside the platform. Your data is only shared with drivers and passengers as necessary to facilitate your rides.`,
      },
      {
        title: '4. Data Security & Storage',
        text: `ShareMyRide implements industry-standard security measures to protect your data. These include:

• TLS 1.2+ encryption for all data in transit
• bcrypt hashing for passwords (never stored in plaintext)
• JWT access tokens with 15-minute expiry and HttpOnly refresh cookies
• Regular security audits and penetration testing
• Access controls ensuring only authorised team members can access sensitive user data
• Incident response procedures for potential data breach scenarios
• Encryption of sensitive personal identifiers like Aadhaar and driving licence numbers`,
      },
      {
        title: '5. Your Rights & Data Access',
        text: `You have the right to: access and download all personal data we hold about you; request correction of inaccurate data; request deletion of your account and associated data (subject to legal retention requirements); withdraw consent for data processing at any time; and lodge a complaint with the data protection authority if you believe your rights have been violated.

To exercise any of these rights, contact us at sharemyride.contact@gmail.com with your request and proof of identity.`,
      },
      {
        title: '6. Data Retention',
        text: `We retain your personal data only as long as necessary to provide services and comply with legal obligations. Generally:

• Account data is retained for the duration of your account plus 1 year after deletion
• Booking and transaction records are retained for 7 years for tax and legal compliance
• Support communications are retained for 2 years
• Usage analytics (anonymised) are retained indefinitely

You can request earlier deletion subject to any legal hold requirements.`,
      },
    ],
  },
];

export default function TermsAndConditions() {
  useScrollTop();
  const [activeTab, setActiveTab] = useState('terms');
  const [expandedSection, setExpandedSection] = useState('1');

  const activeContent = SECTIONS.find(s => s.id === activeTab)?.content || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden min-h-screen flex flex-col justify-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-6">
            Legal Centre
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Full transparency on how we operate, what we expect, and how we protect your privacy.
          </p>
          <p className="text-blue-200 text-sm mt-4">Last updated: June 19, 2026</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {SECTIONS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {activeContent.map((section, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.title ? null : section.title)}
                className="w-full px-6 py-5 sm:px-8 sm:py-6 flex items-start justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{section.title}</h3>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 ml-4 transition-transform ${
                    expandedSection === section.title ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {expandedSection === section.title && (
                <div className="px-6 py-4 sm:px-8 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{section.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-8 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Questions about our policies?</h3>
          <p className="text-gray-700 mb-4">
            Contact our legal team at{' '}
            <a href="mailto:sharemyride.contact@gmail.com" className="text-blue-600 font-semibold hover:underline">
              sharemyride.contact@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
