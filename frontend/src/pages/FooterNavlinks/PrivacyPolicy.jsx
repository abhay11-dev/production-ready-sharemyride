import React from 'react';

const HERO_CSS = `
  @keyframes blobPulse {
    0%, 100% { transform: scale(1);   opacity: 0.07; }
    50%       { transform: scale(1.18); opacity: 0.13; }
  }
  @keyframes laneDrift {
    0%   { transform: translateY(100vh); opacity: 0;   }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(-120px); opacity: 0; }
  }
  @keyframes carDrift {
    0%   { transform: translateX(-60px); opacity: 0;   }
    8%   { opacity: 0.18; }
    92%  { opacity: 0.18; }
    100% { transform: translateX(calc(100vw + 60px)); opacity: 0; }
  }
  @keyframes gridScroll {
    0%   { transform: translateY(0);   }
    100% { transform: translateY(60px); }
  }
  @keyframes glowBreath {
    0%, 100% { opacity: 0.10; transform: scale(1);    }
    50%       { opacity: 0.18; transform: scale(1.12); }
  }
  @keyframes ringExpand {
    0%   { transform: scale(0.6); opacity: 0.18; }
    100% { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes dotFloat {
    0%, 100% { transform: translateY(0px);   opacity: 0.12; }
    50%       { transform: translateY(-18px); opacity: 0.22; }
  }

  .hero-blob {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%);
    animation: blobPulse linear infinite;
  }
  .hero-lane {
    position: absolute;
    bottom: -120px;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0));
    animation: laneDrift linear infinite;
  }
  .hero-car {
    position: absolute;
    left: -60px;
    border-radius: 3px;
    background: rgba(255,255,255,0.15);
    animation: carDrift linear infinite;
  }
  .hero-grid {
    position: absolute;
    inset: -60px;
    background-image:
      linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size: 52px 52px;
    animation: gridScroll 6s linear infinite;
  }
  .hero-glow {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 68%);
    animation: glowBreath ease-in-out infinite;
  }
  .hero-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.10);
    animation: ringExpand ease-out infinite;
  }
  .hero-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    animation: dotFloat ease-in-out infinite;
  }
`;

function HeroBackground() {
  return (
    <>
      <style>{HERO_CSS}</style>

      <div className="hero-grid" aria-hidden="true" />

      <div className="hero-glow" aria-hidden="true" style={{ width: 500, height: 500, top: -160, right: -120, animationDuration: '8s', animationDelay: '0s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 380, height: 380, bottom: -100, left: -80, animationDuration: '10s', animationDelay: '3s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 260, height: 260, top: '42%', left: '48%', animationDuration: '12s', animationDelay: '1.5s' }} />
      <div className="hero-glow" aria-hidden="true" style={{ width: 180, height: 180, top: '18%', left: '22%', animationDuration: '9s', animationDelay: '5s' }} />

      <div className="hero-ring" aria-hidden="true" style={{ width: 320, height: 320, top: '30%', left: '60%', animationDuration: '7s', animationDelay: '0s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 240, height: 240, top: '60%', left: '20%', animationDuration: '9s', animationDelay: '3.5s' }} />
      <div className="hero-ring" aria-hidden="true" style={{ width: 200, height: 200, top: '10%', left: '75%', animationDuration: '11s', animationDelay: '6s' }} />

      {[
        { top: '12%', left: '5%',  d: '0s',   dur: '5s'  },
        { top: '28%', left: '15%', d: '1.2s', dur: '6s'  },
        { top: '55%', left: '8%',  d: '2.5s', dur: '7s'  },
        { top: '78%', left: '18%', d: '0.8s', dur: '5.5s'},
        { top: '90%', left: '35%', d: '3.2s', dur: '6.5s'},
        { top: '65%', left: '45%', d: '1.8s', dur: '8s'  },
        { top: '20%', left: '55%', d: '4s',   dur: '5s'  },
        { top: '42%', left: '65%', d: '0.4s', dur: '7s'  },
        { top: '75%', left: '72%', d: '2s',   dur: '6s'  },
        { top: '10%', left: '82%', d: '3.5s', dur: '9s'  },
        { top: '50%', left: '88%', d: '1s',   dur: '5.5s'},
        { top: '85%', left: '94%', d: '2.8s', dur: '7s'  },
      ].map((dot, i) => (
        <div key={i} className="hero-dot" aria-hidden="true"
          style={{ top: dot.top, left: dot.left, animationDelay: dot.d, animationDuration: dot.dur }} />
      ))}

      {[
        { left: '4%',  h: 80,  dur: '7s',   d: '0s'   },
        { left: '4%',  h: 45,  dur: '7s',   d: '3.5s' },
        { left: '12%', h: 65,  dur: '9s',   d: '1.2s' },
        { left: '12%', h: 38,  dur: '9s',   d: '5.5s' },
        { left: '20%', h: 90,  dur: '8s',   d: '2.8s' },
        { left: '28%', h: 55,  dur: '10s',  d: '0.6s' },
        { left: '36%', h: 70,  dur: '7.5s', d: '4s'   },
        { left: '44%', h: 50,  dur: '11s',  d: '2s'   },
        { left: '44%', h: 88,  dur: '11s',  d: '6s'   },
        { left: '52%', h: 62,  dur: '8.5s', d: '1s'   },
        { left: '60%', h: 75,  dur: '9.5s', d: '3s'   },
        { left: '68%', h: 42,  dur: '7s',   d: '5s'   },
        { left: '68%', h: 95,  dur: '7s',   d: '1.8s' },
        { left: '76%', h: 58,  dur: '8s',   d: '4.5s' },
        { left: '84%', h: 80,  dur: '10s',  d: '0.3s' },
        { left: '92%', h: 48,  dur: '6.5s', d: '2.2s' },
        { left: '97%', h: 70,  dur: '9s',   d: '3.8s' },
      ].map((lane, i) => (
        <div key={i} className="hero-lane" aria-hidden="true"
          style={{ left: lane.left, height: lane.h, animationDuration: lane.dur, animationDelay: lane.d }} />
      ))}

      {[
        { w: 30, h: 13, top: '15%', dur: '9s',  d: '0s'  },
        { w: 24, h: 11, top: '32%', dur: '12s', d: '2s'  },
        { w: 34, h: 14, top: '52%', dur: '10s', d: '5s'  },
        { w: 22, h: 10, top: '70%', dur: '8s',  d: '1s'  },
        { w: 28, h: 12, top: '85%', dur: '11s', d: '7s'  },
        { w: 20, h: 9,  top: '25%', dur: '14s', d: '3.5s'},
        { w: 26, h: 11, top: '60%', dur: '13s', d: '6.5s'},
      ].map((car, i) => (
        <div key={i} className="hero-car" aria-hidden="true"
          style={{ width: car.w, height: car.h, top: car.top, animationDuration: car.dur, animationDelay: car.d }} />
      ))}
    </>
  );
}

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-14 sm:py-20 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <HeroBackground />
    </div>
    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
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
