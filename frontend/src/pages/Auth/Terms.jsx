import React, { useState } from 'react';

function TermsAndPrivacy() {
  const [activePage, setActivePage] = useState('terms');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-4 py-4">
            <button
              onClick={() => setActivePage('terms')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                activePage === 'terms'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setActivePage('privacy')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                activePage === 'privacy'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {activePage === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
      </div>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last Updated: November 1, 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p>
            Welcome to RideMyShare. By accessing or using our ridesharing platform, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
          <p>
            RideMyShare is a platform that connects drivers with passengers for shared rides. We facilitate connections between users 
            but are not a transportation provider. Drivers are independent contractors, not employees of RideMyShare.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Eligibility</h2>
          <p className="mb-3">To use RideMyShare, you must:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Be at least 18 years of age</li>
            <li>Have the legal capacity to enter into binding contracts</li>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Driver Requirements</h2>
          <p className="mb-3">Drivers must:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Possess a valid driver's license</li>
            <li>Maintain valid vehicle registration and insurance</li>
            <li>Ensure their vehicle meets safety standards</li>
            <li>Comply with all applicable traffic laws and regulations</li>
            <li>Not discriminate against passengers based on race, religion, gender, or other protected characteristics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Passenger Responsibilities</h2>
          <p className="mb-3">Passengers must:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate pickup and destination information</li>
            <li>Be ready at the scheduled pickup time</li>
            <li>Treat drivers and other passengers with respect</li>
            <li>Not engage in illegal activities during rides</li>
            <li>Pay the agreed fare for the ride</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Booking and Payments</h2>
          <p className="mb-3">
            When you book a ride through RideMyShare:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You agree to pay the fare displayed at the time of booking</li>
            <li>Payment is processed through our secure payment system</li>
            <li>Drivers set their own fares subject to platform guidelines</li>
            <li>Cancellation policies apply as specified at booking time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cancellation Policy</h2>
          <p>
            Either party may cancel a booking. Cancellations made close to the pickup time may result in cancellation fees. 
            The specific cancellation policy is displayed at the time of booking.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Safety and Conduct</h2>
          <p className="mb-3">Users must:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Not engage in threatening, harassing, or violent behavior</li>
            <li>Not use the platform for illegal purposes</li>
            <li>Report any safety concerns immediately to RideMyShare</li>
            <li>Respect other users' property and personal space</li>
            <li>Not consume alcohol or drugs during rides (drivers at all times, passengers during the ride)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Prohibited Activities</h2>
          <p className="mb-3">Users may not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the platform for commercial transportation services outside of ridesharing</li>
            <li>Create multiple accounts or share account credentials</li>
            <li>Manipulate ratings or reviews</li>
            <li>Scrape or copy content from the platform</li>
            <li>Interfere with the platform's operation or security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Liability and Insurance</h2>
          <p className="mb-3">
            RideMyShare is a technology platform and not a transportation provider. We do not own or operate vehicles, 
            employ drivers, or provide transportation services. Accordingly:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Drivers are responsible for maintaining adequate vehicle insurance</li>
            <li>RideMyShare is not liable for accidents, injuries, or property damage during rides</li>
            <li>Users agree to resolve disputes directly with other users or their insurance providers</li>
            <li>RideMyShare's liability is limited to the maximum extent permitted by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>
          <p>
            Any disputes arising from these terms or use of the platform will be resolved through binding arbitration 
            rather than in court, except where prohibited by law. You agree to resolve disputes on an individual basis 
            and waive any right to class action proceedings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Account Suspension and Termination</h2>
          <p>
            RideMyShare reserves the right to suspend or terminate user accounts for violations of these terms, 
            fraudulent activity, or any behavior that compromises the safety and integrity of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the RideMyShare platform are owned by RideMyShare and protected 
            by copyright, trademark, and other intellectual property laws. Users may not copy, modify, or distribute 
            platform content without permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to Terms</h2>
          <p>
            RideMyShare may update these Terms of Service from time to time. We will notify users of material changes 
            via email or platform notification. Continued use of the platform after changes constitutes acceptance of 
            the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
          <p className="mb-2">For questions about these Terms of Service, please contact us at:</p>
          <div className="bg-gray-50 p-4 rounded-lg">
             <p className="font-semibold">RideMyShare Data Protection Officer</p>
            <p>Email: abhayrajsinghmandloi@gmail.com</p>
            <p>Phone: +91-9617714737</p>
            <p>Address: [Advitiya]</p>
          </div>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-600">
            By using RideMyShare, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </section>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last Updated: November 1, 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p>
            RideMyShare ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how 
            we collect, use, disclose, and safeguard your information when you use our ridesharing platform. Please read 
            this policy carefully to understand our practices regarding your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Account Information:</strong> Name, email address, phone number, profile picture, and password</li>
            <li><strong>Profile Information:</strong> Date of birth, gender, and bio/description</li>
            <li><strong>Driver Information:</strong> Driver's license, vehicle details, registration, and insurance information</li>
            <li><strong>Payment Information:</strong> Credit/debit card details, UPI information, or other payment methods</li>
            <li><strong>Ride Information:</strong> Pickup and drop-off locations, ride history, and preferences</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Location Data:</strong> Real-time GPS location during rides (with your permission)</li>
            <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform, search queries</li>
            <li><strong>Log Data:</strong> IP address, browser type, access times, and referring URLs</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.3 Information from Third Parties</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Payment processors for transaction verification</li>
            <li>Background check providers for driver verification</li>
            <li>Social media platforms if you connect your accounts</li>
            <li>Map and navigation service providers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p className="mb-3">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Provide Services:</strong> Facilitate ride bookings, connect drivers and passengers, process payments</li>
            <li><strong>Safety and Security:</strong> Verify identities, conduct background checks, monitor for fraudulent activity</li>
            <li><strong>Communication:</strong> Send booking confirmations, updates, notifications, and customer support messages</li>
            <li><strong>Improve Services:</strong> Analyze usage patterns, optimize routes, enhance user experience</li>
            <li><strong>Personalization:</strong> Customize content, recommend rides, remember preferences</li>
            <li><strong>Legal Compliance:</strong> Comply with legal obligations, resolve disputes, enforce our terms</li>
            <li><strong>Marketing:</strong> Send promotional materials and offers (with your consent, where required)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.1 With Other Users</h3>
          <p className="mb-3">
            We share limited information to facilitate rides:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Passengers can see driver's name, photo, vehicle details, and ratings</li>
            <li>Drivers can see passenger's name, photo, pickup location, and ratings</li>
            <li>Contact information may be shared temporarily to coordinate pickups</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.2 With Service Providers</h3>
          <p className="mb-3">
            We share information with third-party service providers who assist us in:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Payment processing and fraud detection</li>
            <li>Cloud storage and hosting services</li>
            <li>Customer support and communication tools</li>
            <li>Analytics and data analysis</li>
            <li>Marketing and advertising</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.3 For Legal Reasons</h3>
          <p className="mb-3">We may disclose information when required to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Comply with legal obligations, court orders, or government requests</li>
            <li>Enforce our Terms of Service or other agreements</li>
            <li>Protect our rights, property, or safety, or that of our users</li>
            <li>Investigate fraud, security issues, or technical problems</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.4 Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, your information may be transferred to the 
            acquiring entity. We will notify you of any such change.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
          <p className="mb-3">
            We implement appropriate technical and organizational measures to protect your information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encryption of sensitive data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security assessments and updates</li>
            <li>Staff training on data protection practices</li>
          </ul>
          <p className="mt-3">
            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive 
            to protect your information, we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
          <p>
            We retain your information for as long as necessary to provide our services, comply with legal obligations, 
            resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your 
            information within a reasonable timeframe, except where we are required to retain it by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
          <p className="mb-3">You have the following rights regarding your personal information:</p>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.1 Access and Portability</h3>
          <p>You can request a copy of your personal data in a structured, machine-readable format.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.2 Correction</h3>
          <p>You can update inaccurate or incomplete information through your account settings or by contacting us.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.3 Deletion</h3>
          <p>You can request deletion of your account and personal data, subject to legal retention requirements.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.4 Marketing Opt-Out</h3>
          <p>You can unsubscribe from marketing communications by clicking the unsubscribe link in emails or adjusting your account settings.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.5 Location Services</h3>
          <p>You can disable location services through your device settings, though this may limit certain features.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">7.6 Cookies</h3>
          <p>You can control cookies through your browser settings or our cookie preference center.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
          <p className="mb-3">
            We use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Remember your preferences and settings</li>
            <li>Authenticate your account and maintain security</li>
            <li>Analyze usage patterns and improve our services</li>
            <li>Deliver relevant advertisements</li>
          </ul>
          <p className="mt-3">
            You can manage cookie preferences through your browser settings, but disabling cookies may affect 
            platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
          <p>
            RideMyShare is not intended for users under 18 years of age. We do not knowingly collect personal information 
            from children. If we become aware that we have collected information from a child under 18, we will take steps 
            to delete such information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. 
            We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy 
            and applicable data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites or services. We are not responsible for the privacy 
            practices of these third parties. We encourage you to review their privacy policies before providing any 
            personal information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
            We will notify you of material changes via email or platform notification. The "Last Updated" date at the top 
            indicates when the policy was last revised.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
          <p className="mb-3">
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold">RideMyShare Data Protection Officer</p>
            <p>Email: abhayrajsinghmandloi@gmail.com</p>
            <p>Phone: +91-9617714737</p>
            <p>Address: [Advitiya]</p>
          </div>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-600">
            By using RideMyShare, you acknowledge that you have read and understood this Privacy Policy and consent to 
            the collection, use, and disclosure of your information as described herein.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsAndPrivacy;