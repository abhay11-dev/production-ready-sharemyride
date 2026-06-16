import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
    {
        category: 'Getting Started',
        items: [
            { q: 'How do I verify my account?', a: 'To verify your account, go to your Profile and complete the identity verification step by providing your Aadhaar and a valid Driving License if you intend to offer rides. Verification typically takes 24-48 hours.' },
            { q: 'Is ShareMyRide free to use?', a: 'Signing up and searching for rides is completely free. When booking a ride, passengers pay a cost-sharing contribution set by the driver, plus a nominal platform fee to cover operational costs.' }
        ]
    },
    {
        category: 'Riding & Driving',
        items: [
            { q: 'How are ride costs calculated?', a: 'Drivers set the cost per seat based on distance and fuel consumption. Our platform caps the maximum allowable cost per seat to ensure it remains a cost-sharing model and not for-profit transport.' },
            { q: 'What happens if a driver cancels?', a: 'If a driver cancels a confirmed booking, passengers receive a full refund instantly. Drivers who frequently cancel may face platform penalties or suspension.' }
        ]
    },
    {
        category: 'Trust & Safety',
        items: [
            { q: 'Are drivers verified?', a: 'Yes. All drivers must pass a strict verification process including Government ID checks (Aadhaar/DL) before they can offer rides on the platform.' },
            { q: 'What should I do in an emergency?', a: 'In case of an emergency, please use the SOS button located in your active ride screen. This will alert your emergency contacts and our 24/7 support team.' }
        ]
    }
];

export default function HelpCenter() {
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredFaqs = FAQS.map(category => ({
        ...category,
        items: category.items.filter(item => 
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.items.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 py-16 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-6">How can we help you?</h1>
                    <div className="relative max-w-xl mx-auto">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search for articles, guides, and FAQs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-xl shadow-lg border-0 focus:ring-2 focus:ring-blue-400 text-gray-800 text-base"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="max-w-5xl mx-auto px-4 -mt-8 mb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link to="/ride/search" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Find a Ride</h3>
                        <p className="text-sm text-gray-500">Learn how to search, book, and travel safely as a passenger.</p>
                    </Link>
                    <Link to="/ride/post" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Offer a Ride</h3>
                        <p className="text-sm text-gray-500">A guide to publishing rides, managing bookings, and cost-sharing.</p>
                    </Link>
                    <Link to="/profile" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Account & Safety</h3>
                        <p className="text-sm text-gray-500">Manage your profile, verification, payments, and trust settings.</p>
                    </Link>
                </div>
            </div>

            {/* FAQs */}
            <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
                
                {filteredFaqs.length > 0 ? (
                    <div className="space-y-8">
                        {filteredFaqs.map((category, idx) => (
                            <div key={idx}>
                                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4">{category.category}</h3>
                                <div className="space-y-4">
                                    {category.items.map((item, itemIdx) => (
                                        <div key={itemIdx} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                            <h4 className="font-bold text-gray-900 mb-2">{item.q}</h4>
                                            <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                        <p className="text-gray-500">We couldn't find any articles matching your search.</p>
                    </div>
                )}
            </div>

            {/* Support CTA */}
            <div className="max-w-3xl mx-auto px-4 mt-16">
                <div className="bg-blue-600 rounded-2xl p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left shadow-lg">
                    <div className="mb-6 sm:mb-0">
                        <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
                        <p className="text-blue-100">Our support team is available to assist you with any issues.</p>
                    </div>
                    <Link to="/contact" className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}