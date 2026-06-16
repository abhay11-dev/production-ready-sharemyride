import React, { useState, useRef, useEffect } from 'react';

const TABS = [
    { id: 'privacy', label: 'Privacy Policy', icon: '🔒' },
    { id: 'terms', label: 'Terms of Service', icon: '📄' },
    { id: 'data', label: 'Data Protection', icon: '🛡️' },
    { id: 'trust', label: 'Trust & Safety', icon: '✅' },
];

const CONTENT = {
    privacy: {
        updated: 'June 1, 2026',
        sections: [
            {
                id: 'collection',
                title: 'Information We Collect',
                content: `When you use ShareMyRide, we collect information in three categories:

Account Data: When you register, we collect your name, email address, phone number, profile photo, gender (optional), and date of birth. Drivers additionally provide government-issued ID numbers (Aadhaar) and driving licence details for verification purposes.

Usage Data: We automatically collect information about how you use our platform — rides searched, bookings made, pages visited, features used, device type, operating system, browser type, IP address, and approximate location (city-level) when you interact with ride listings.

Communication Data: Messages exchanged through our in-app messaging system, support tickets submitted, reviews and ratings you post, and any feedback you provide are stored to facilitate ride coordination and improve platform safety.`,
            },
            {
                id: 'cookies',
                title: 'Cookies & Tracking',
                content: `We use cookies and similar tracking technologies to provide, secure, and improve our services. Essential cookies are required for the platform to function — including session authentication and security tokens. Analytics cookies (using anonymised data) help us understand how people navigate ShareMyRide so we can improve it. Preference cookies remember your settings such as language, notification preferences, and search filters.

You can manage cookie preferences via your browser settings or through our Cookie Preferences panel accessible from the footer. Disabling non-essential cookies will not affect your ability to use the platform.`,
            },
            {
                id: 'usage',
                title: 'How We Use Your Data',
                content: `We use your information to: provide and personalise the ShareMyRide platform; verify driver identity and maintain community safety; match passengers with relevant ride listings; process booking requests and communications between riders; send service notifications (booking confirmations, ride reminders, safety alerts); analyse platform usage to improve features and fix bugs; enforce our Community Guidelines and Terms of Service; and comply with legal obligations.

We do not sell your personal data to third parties. We do not use your data for targeted advertising.`,
            },
            {
                id: 'security',
                title: 'Data Security',
                content: `ShareMyRide implements industry-standard security measures to protect your data. These include TLS encryption for all data in transit; bcrypt hashing for passwords (never stored in plaintext); JWT access tokens with 15-minute expiry and HttpOnly refresh cookies; regular security audits and penetration testing; access controls ensuring only authorised team members can access user data; and incident response procedures for data breach scenarios.

No security system is impenetrable. If you suspect your account has been compromised, contact us immediately at sharemyride@gmail.com.`,
            },
            {
                id: 'rights',
                title: 'Your Rights',
                content: `Under applicable data protection law, you have the right to: access the personal data we hold about you; correct inaccurate or incomplete data; request deletion of your account and associated data; object to or restrict certain processing activities; data portability (receive your data in a structured, machine-readable format); and lodge a complaint with a data protection authority.

To exercise any of these rights, email sharemyride@gmail.com with the subject "Data Rights Request". We will respond within 30 days.`,
            },
            {
                id: 'retention',
                title: 'Data Retention',
                content: `We retain your personal data for as long as your account is active or as needed to provide our services. After account deletion, we retain anonymised usage data for analytics and de-identified ride records for compliance purposes for up to 3 years. Driver verification documents are retained for 5 years as required by applicable law. Backup copies may persist for up to 90 days following deletion.`,
            },
            {
                id: 'contact-privacy',
                title: 'Contact Us',
                content: `For privacy-related queries, contact our data team at: sharemyride@gmail.com with subject "Privacy Inquiry". Phone: +91 9617714737. We aim to respond to all privacy queries within 5 business days.`,
            },
        ],
    },
    terms: {
        updated: 'June 1, 2026',
        sections: [
            {
                id: 'eligibility',
                title: 'Eligibility',
                content: `To use ShareMyRide, you must be at least 18 years of age, possess a valid Indian phone number and email address, have the legal capacity to enter into a binding agreement, and not be prohibited from using our services under applicable law.

Drivers must additionally hold a valid Indian driving licence, own or have authorised use of the vehicle they list, and pass our identity verification process. Providing false eligibility information is grounds for immediate account termination.`,
            },
            {
                id: 'responsibilities',
                title: 'User Responsibilities',
                content: `By using ShareMyRide you agree to: provide accurate and complete information in your profile and ride listings; keep your contact information current; use the platform only for its intended purpose of community ride-sharing; not use automated tools to scrape, spam, or manipulate platform data; not circumvent the platform by arranging rides entirely outside the app after initial contact; and comply with all applicable traffic laws during rides.

You are solely responsible for your conduct on the platform and during rides facilitated through it.`,
            },
            {
                id: 'disclaimer',
                title: 'Ride Sharing Disclaimer',
                content: `ShareMyRide is a technology platform that connects drivers and passengers. We are not a transportation company. We do not employ drivers, own vehicles, or provide transportation services directly.

Rides facilitated through our platform are private car-sharing arrangements between community members. Fares are cost-sharing contributions — not commercial charges. ShareMyRide does not guarantee the accuracy of ride listings, the conduct of users, or the safety of any particular journey. Users assume responsibility for assessing the suitability of rides and riders before committing.`,
            },
            {
                id: 'community',
                title: 'Community Standards',
                content: `All users agree to abide by our Community Guidelines, available at /guidelines. Key obligations include: treating all users with respect regardless of background; not engaging in harassment, discrimination, or abusive behaviour; maintaining accurate ride listings; honouring confirmed bookings except in genuine emergencies; and leaving honest reviews based on actual experience.

Violation of community standards may result in warnings, suspension, or permanent removal at ShareMyRide's discretion.`,
            },
            {
                id: 'content',
                title: 'Content Ownership',
                content: `You retain ownership of content you submit to ShareMyRide (reviews, blog posts, profile photos). By submitting content, you grant ShareMyRide a non-exclusive, worldwide, royalty-free licence to display and distribute that content in connection with our services.

ShareMyRide's platform, design, code, trademarks, and proprietary content are owned by ShareMyRide and protected by applicable intellectual property law. You may not reproduce, distribute, or create derivative works without explicit written permission.`,
            },
            {
                id: 'suspension',
                title: 'Account Suspension',
                content: `ShareMyRide may suspend or terminate your account at any time if: you violate these Terms or our Community Guidelines; we detect fraudulent, abusive, or harmful activity; your account remains inactive for more than 24 months; or we are required to do so by law.

We will generally notify you before suspension unless the situation requires immediate action to protect users or the platform. You may appeal suspension decisions by contacting sharemyride@gmail.com.`,
            },
            {
                id: 'liability',
                title: 'Liability Limitations',
                content: `To the maximum extent permitted by law, ShareMyRide's liability is limited to the service fees (if any) paid by you in the 12 months prior to the claim. ShareMyRide is not liable for: personal injury or property damage during rides; user conduct before, during, or after rides; loss of data; loss of revenue or profits; or any indirect, consequential, or punitive damages.

Nothing in these terms excludes liability for death, personal injury, fraud, or any other liability that cannot be excluded by law.`,
            },
            {
                id: 'changes',
                title: 'Changes to Terms',
                content: `We may update these Terms periodically. Material changes will be communicated via email or prominent in-app notification at least 14 days before they take effect. Continued use of ShareMyRide after changes take effect constitutes acceptance of the updated Terms. If you do not agree with updated Terms, you should stop using the platform and may delete your account.`,
            },
        ],
    },
    data: {
        updated: 'June 1, 2026',
        sections: [
            {
                id: 'principles',
                title: 'Data Protection Principles',
                content: `ShareMyRide processes personal data in accordance with the following principles: Lawfulness, Fairness & Transparency — we only collect data for legitimate purposes and are transparent about what we collect and why. Purpose Limitation — data collected for one purpose is not repurposed without consent. Data Minimisation — we collect only the data we genuinely need. Accuracy — we provide tools for users to keep their data accurate. Storage Limitation — data is retained only as long as necessary. Integrity & Confidentiality — we apply appropriate technical and organisational security measures.`,
            },
            {
                id: 'basis',
                title: 'Legal Basis for Processing',
                content: `We process personal data under the following legal bases: Contract Performance — processing necessary to provide our ride-sharing services per your agreement with us. Legitimate Interests — to improve our platform, detect fraud, and ensure safety. Legal Obligation — to comply with applicable laws and regulatory requirements. Consent — for optional features such as marketing communications and analytics cookies (which you may withdraw at any time).`,
            },
            {
                id: 'transfers',
                title: 'International Data Transfers',
                content: `ShareMyRide operates primarily within India. Our servers are located in India. In limited circumstances (such as cloud infrastructure), data may be processed by third-party providers who operate globally. When this occurs, we ensure adequate data protection through contractual safeguards including Data Processing Agreements and standard contractual clauses where applicable.`,
            },
            {
                id: 'third-parties',
                title: 'Third Party Processors',
                content: `We share data with a limited set of trusted third-party processors: cloud infrastructure providers (for hosting), payment processors (for transaction handling), identity verification services (for driver KYC), and analytics providers (for anonymised usage analysis). All processors are bound by Data Processing Agreements requiring them to maintain data security and use data only for specified purposes.`,
            },
        ],
    },
    trust: {
        updated: 'June 1, 2026',
        sections: [
            {
                id: 'verification',
                title: 'Identity Verification',
                content: `All drivers on ShareMyRide are required to complete identity verification before posting rides. This includes: submitting a valid Aadhaar number (last 4 digits visible; full number is verified via secure API and not stored in plaintext); uploading their driving licence; and providing a recent, clear profile photograph. Our team manually reviews all verification submissions. Approvals typically take 24–48 hours. Verified drivers receive a badge visible to all passengers.`,
            },
            {
                id: 'ratings',
                title: 'Ratings & Reviews',
                content: `After every completed ride, both the driver and passenger can rate each other on a 1–5 star scale and optionally leave a written review. Ratings are cumulative and permanently visible on profiles. Reviews are public and moderated — we remove reviews that contain personal attacks, false claims, or inappropriate content. Users who consistently receive low ratings may be suspended pending review. We do not allow users to pay for or manipulate ratings.`,
            },
            {
                id: 'reporting',
                title: 'Reporting System',
                content: `Any user can report a concern via the in-app Report button on any ride or profile, or through our dedicated Report page at /report. Reports are reviewed by our Trust & Safety team within 24–48 hours. Safety-related reports are escalated immediately. We investigate all reports fairly and confidentially — both the reporter and the reported party may be contacted for more information. We notify reporters of the outcome of their report.`,
            },
            {
                id: 'prohibited',
                title: 'Prohibited Conduct',
                content: `The following result in immediate investigation and potential permanent ban: sexual harassment or assault; fraud or financial deception; sharing false identity or vehicle information; threats of any kind; collecting or soliciting payment outside the platform; unsafe driving (reported by passengers); creating multiple accounts to evade a ban; and sharing users' private contact details without consent. Criminal conduct is reported to law enforcement.`,
            },
            {
                id: 'emergency',
                title: 'Emergency Procedures',
                content: `If you are in immediate danger during a ride, call 112 (emergency services) first. The ShareMyRide SOS button in the active ride screen alerts your pre-configured emergency contact with your location. For post-ride safety concerns, contact us at sharemyride@gmail.com with "URGENT" in the subject line — these are reviewed within 2 hours during business hours. We cooperate fully with law enforcement investigations.`,
            },
        ],
    },
};

function SidebarNav({ sections, activeId, onClick }) {
    return (
        <nav className="space-y-0.5">
            {sections.map(s => (
                <button
                    key={s.id}
                    onClick={() => onClick(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeId === s.id
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                >
                    {s.title}
                </button>
            ))}
        </nav>
    );
}

export default function TermsAndPrivacy() {
    const [activeTab, setActiveTab] = useState('privacy');
    const [activeSection, setActiveSection] = useState(CONTENT.privacy.sections[0].id);
    const [search, setSearch] = useState('');
    const sectionRefs = useRef({});

    const tabContent = CONTENT[activeTab];

    const filtered = search.trim()
        ? tabContent.sections.filter(s =>
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.content.toLowerCase().includes(search.toLowerCase())
        )
        : tabContent.sections;

    const scrollTo = (id) => {
        setActiveSection(id);
        const el = sectionRefs.current[id];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Update activeSection on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.dataset.id); });
            },
            { threshold: 0.4, rootMargin: '-100px 0px -60% 0px' }
        );
        Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [activeTab]);

    // Reset on tab change
    useEffect(() => {
        setActiveSection(CONTENT[activeTab].sections[0].id);
        setSearch('');
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Hero ── */}
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Legal Centre</div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Transparency you can read
                    </h1>
                    <p className="text-blue-100 leading-relaxed max-w-xl mx-auto text-sm">
                        Our legal documents are written in plain language, not legalese. Last updated: {tabContent.updated}
                    </p>
                </div>
            </section>

            {/* ── Tabs ── */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex overflow-x-auto gap-0">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                <span className="hidden sm:block">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

                {/* Search */}
                <div className="relative max-w-sm mb-8">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15z" />
                    </svg>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${TABS.find(t => t.id === activeTab)?.label}…`}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white placeholder-gray-400"
                    />
                </div>

                <div className="flex gap-8">

                    {/* Sticky sidebar — hidden on mobile */}
                    <aside className="hidden lg:block w-52 flex-shrink-0">
                        <div className="sticky top-24">
                            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 px-3">On this page</div>
                            <SidebarNav
                                sections={filtered}
                                activeId={activeSection}
                                onClick={scrollTo}
                            />
                        </div>
                    </aside>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-10">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-4xl mb-3">🔍</div>
                                <div className="font-semibold text-gray-700 mb-2">No sections found</div>
                                <p className="text-gray-400 text-sm">Try a different search term.</p>
                            </div>
                        ) : (
                            filtered.map(section => (
                                <div
                                    key={section.id}
                                    data-id={section.id}
                                    ref={el => sectionRefs.current[section.id] = el}
                                    className="scroll-mt-24"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                                        <div className="flex-1 h-px bg-gray-100" />
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-sm">
                                        {section.content.split('\n\n').map((para, i) => (
                                            <p key={i} className={`text-sm text-gray-700 leading-relaxed ${i > 0 ? 'mt-4' : ''}`}>
                                                {para}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Footer note */}
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 text-sm text-blue-800">
                            <strong>Questions about our legal policies?</strong> Email us at{' '}
                            <a href="mailto:sharemyride@gmail.com" className="underline">sharemyride@gmail.com</a> or call{' '}
                            <a href="tel:+919617714737" className="underline">+91 9617714737</a>. We aim to respond within 5 business days.
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}