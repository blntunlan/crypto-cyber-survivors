import React from 'react';
import { motion } from 'framer-motion';
import { X, Shield, FileText, ArrowLeft, ChevronRight } from 'lucide-react';

/**
 * LegalModals.tsx - Privacy Policy & Terms of Service Pages
 *
 * DESIGN: Matches LandingPage "Casino-Cyber Mix" aesthetic
 * - Primary Gold: #d6b85c (Trust, Reward)
 * - Primary Red: #b22222 (Danger, High-Stakes)
 * - Dark BG: #020617 (Deep Obsidian)
 */

interface LegalPageProps {
  onClose: () => void;
  onNavigate?: () => void;
  navigateLabel?: string;
}

const LegalPageLayout: React.FC<
  LegalPageProps & { title: string; icon: React.ReactNode; children: React.ReactNode }
> = ({ onClose, onNavigate, navigateLabel, title, icon, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="fixed inset-0 z-[3300] overflow-hidden bg-[#020617] font-sans text-white selection:bg-[#d6b85c]/30"
  >
    {/* Background Architecture - Same as Landing Page */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#d6b85c]/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-[#b22222]/5 blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />
      <div className="animate-scanline absolute inset-0 h-[2px] w-full bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
    </div>

    {/* Navigation Header */}
    <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      {/* Back Button */}
      <button
        onClick={onClose}
        className="flex min-h-[44px] items-center gap-2 border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-slate-400 transition-all duration-300 hover:border-[#d6b85c] hover:bg-[#d6b85c]/10 hover:text-[#d6b85c]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Game</span>
        <span className="sm:hidden">Back</span>
      </button>

      {/* Branding */}
      <a
        href="/"
        className="flex flex-col transition-all duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
      >
        <span className="font-cyber text-lg font-black uppercase italic leading-tight tracking-tight text-[#d6b85c] sm:text-xl">
          CRYPTO
        </span>
        <span className="-mt-1 font-cyber text-lg font-black uppercase italic leading-tight tracking-tight text-white sm:text-xl">
          SURVIVORS
        </span>
      </a>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] border border-[#b22222]/30 bg-black/40 p-3 text-slate-400 transition-all duration-300 hover:border-[#b22222] hover:bg-[#b22222]/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </nav>

    {/* Main Content */}
    <main className="allow-scroll relative z-10 h-[calc(100vh-88px)] overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 sm:mb-12"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="border border-[#d6b85c]/30 bg-[#d6b85c]/10 p-3">{icon}</div>
            <div>
              <h1 className="font-cyber text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl lg:text-4xl">
                {title}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                Last Updated: February 3, 2026
              </p>
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-[#d6b85c] via-[#b22222]/50 to-transparent" />
        </motion.div>

        {/* Content Body */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="legal-content"
        >
          {children}
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 border-t border-white/5 pt-8 sm:mt-16"
        >
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <button
              onClick={onClose}
              className="w-full border border-[#d6b85c] bg-[#d6b85c] px-8 py-4 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(214,184,92,0.3)] transition-all duration-300 hover:bg-white active:scale-95 sm:w-auto"
            >
              ✓ I Understand
            </button>

            {onNavigate && navigateLabel && (
              <button
                onClick={onNavigate}
                className="flex w-full items-center justify-center gap-2 border border-white/10 bg-white/5 px-6 py-4 font-mono text-xs font-black uppercase tracking-widest text-slate-400 transition-all duration-300 hover:border-[#b22222] hover:bg-[#b22222]/10 hover:text-white sm:w-auto"
              >
                {navigateLabel}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </main>

    {/* Global Styles */}
    <style>{`
      @keyframes scanline { 0% { transform: translateY(-10vh); } 100% { transform: translateY(110vh); } }
      .animate-scanline { animation: scanline 8s linear infinite; will-change: transform; }
      
      .legal-content h2 {
        font-size: 1.25rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #d6b85c;
        margin-top: 2.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(214, 184, 92, 0.2);
        font-style: italic;
      }
      
      .legal-content h3 {
        font-size: 1rem;
        font-weight: 700;
        color: #e2e8f0;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
      }
      
      .legal-content p {
        color: #94a3b8;
        line-height: 1.8;
        margin-bottom: 1rem;
      }
      
      .legal-content ul {
        list-style: none;
        padding: 0;
        margin: 1rem 0;
      }
      
      .legal-content ul li {
        position: relative;
        padding-left: 1.5rem;
        margin-bottom: 0.75rem;
        color: #94a3b8;
        line-height: 1.7;
      }
      
      .legal-content ul li::before {
        content: '→';
        position: absolute;
        left: 0;
        color: #b22222;
        font-weight: bold;
      }
      
      .legal-content strong {
        color: #e2e8f0;
        font-weight: 700;
      }
      
      .legal-content .warning-box {
        background: rgba(234, 179, 8, 0.1);
        border: 1px solid rgba(234, 179, 8, 0.3);
        padding: 1rem 1.25rem;
        margin: 1.5rem 0;
        color: #fef08a;
      }
      
      .legal-content .warning-box strong {
        color: #fef08a;
      }

      @media (min-width: 640px) {
        .legal-content h2 {
          font-size: 1.5rem;
        }
      }
    `}</style>
  </motion.div>
);

export const PrivacyPolicy: React.FC<{
  onClose: () => void;
  onViewTerms?: () => void;
}> = ({ onClose, onViewTerms }) => (
  <LegalPageLayout
    onClose={onClose}
    title="Privacy Policy"
    icon={<Shield className="h-6 w-6 text-[#d6b85c]" />}
    onNavigate={onViewTerms}
    navigateLabel="View Terms of Service"
  >
    <h2>1. Introduction</h2>
    <p>
      Welcome to Crypto Survivors ("we," "our," or "us"). We are committed to protecting
      your privacy. This Privacy Policy explains how we collect, use, disclose, and
      safeguard your information when you play our browser-based game at{' '}
      <strong>crypto-survivors.com</strong>.
    </p>

    <h2>2. Information We Collect</h2>
    <h3>2.1 Information You Provide</h3>
    <ul>
      <li>
        <strong>Nickname:</strong> A user-defined identifier for leaderboard services
        and in-game display.
      </li>
      <li>
        <strong>Twitter/X Account (Optional):</strong> If you choose to connect your
        Twitter account for social features, we access your public profile information.
      </li>
    </ul>

    <h3>2.2 Automatically Collected Information</h3>
    <ul>
      <li>
        <strong>Game Metrics:</strong> Scores, survival time, enemies defeated, and
        in-game performance data.
      </li>
      <li>
        <strong>Device Information:</strong> Browser type, operating system, screen
        resolution, and performance benchmarks to optimize gameplay at 60 FPS.
      </li>
      <li>
        <strong>Session Data:</strong> Anonymous session identifiers and game state for
        anti-cheat validation.
      </li>
      <li>
        <strong>Market Preference:</strong> Your selected cryptocurrency pairs (BTC,
        ETH, SOL) for difficulty scaling.
      </li>
    </ul>

    <h3>2.3 Cookies and Tracking</h3>
    <p>
      We use essential cookies to maintain your session and preferences. We use
      Cloudflare Web Analytics for privacy-focused, cookieless analytics that do not
      track individual users.
    </p>

    <h2>3. How We Use Your Information</h2>
    <ul>
      <li>Provide and maintain leaderboard rankings and achievements</li>
      <li>Improve game balance and difficulty via our AI Director system</li>
      <li>Prevent cheating and ensure fair gameplay</li>
      <li>Send optional notifications about game updates (with your consent)</li>
      <li>Analyze aggregate gameplay patterns to improve the game experience</li>
    </ul>

    <h2>4. Data Sharing</h2>
    <p>
      <strong>We do NOT sell your personal data.</strong> We may share data with:
    </p>
    <ul>
      <li>
        <strong>Service Providers:</strong> Supabase (database), Railway (hosting),
        Cloudflare (CDN/security)
      </li>
      <li>
        <strong>Market Data Providers:</strong> Binance and Coinbase APIs for real-time
        price feeds (no personal data shared)
      </li>
      <li>
        <strong>Legal Requirements:</strong> When required by law or to protect our
        rights
      </li>
    </ul>

    <h2>5. Data Security</h2>
    <p>Your data is protected using industry-standard security measures including:</p>
    <ul>
      <li>Row Level Security (RLS) policies on Supabase</li>
      <li>HTTPS encryption for all data transmission</li>
      <li>HMAC signature verification for score submissions</li>
      <li>Regular security audits and penetration testing</li>
    </ul>

    <h2>6. Data Retention</h2>
    <p>
      Game session data is retained for leaderboard purposes. You may request deletion
      of your personal data by contacting us. Anonymous aggregated data may be retained
      indefinitely for game improvement purposes.
    </p>

    <h2>7. Children's Privacy</h2>
    <p>
      Crypto Survivors is not directed to children under 13. We do not knowingly collect
      personal information from children. If you believe we have collected data from a
      child, please contact us.
    </p>

    <h2>8. Your Rights</h2>
    <p>Depending on your location, you may have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Request correction of inaccurate data</li>
      <li>Request deletion of your data</li>
      <li>Object to data processing</li>
      <li>Data portability</li>
    </ul>

    <h2>9. International Users</h2>
    <p>
      Our servers are located in the United States and Europe. By using Crypto
      Survivors, you consent to the transfer of your information to these locations.
    </p>

    <h2>10. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of any
      changes by posting the new policy on this page and updating the "Last Updated"
      date.
    </p>

    <h2>11. Contact Us</h2>
    <p>
      For privacy-related inquiries, please contact us at:
      <br />
      <strong>Email:</strong> privacy@crypto-survivors.com
    </p>
  </LegalPageLayout>
);

export const TermsOfService: React.FC<{
  onClose: () => void;
  onViewPrivacy?: () => void;
}> = ({ onClose, onViewPrivacy }) => (
  <LegalPageLayout
    onClose={onClose}
    title="Terms of Service"
    icon={<FileText className="h-6 w-6 text-[#d6b85c]" />}
    onNavigate={onViewPrivacy}
    navigateLabel="View Privacy Policy"
  >
    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing or playing Crypto Survivors at <strong>crypto-survivors.com</strong>{' '}
      ("the Game"), you agree to be bound by these Terms of Service ("Terms"). If you do
      not agree to these Terms, do not use the Game.
    </p>

    <h2>2. Game Description</h2>
    <p>
      Crypto Survivors is a free-to-play browser-based survival game that uses real-time
      cryptocurrency market data to influence gameplay mechanics. The game features
      "leverage" and "positions" which are <strong>PURELY SIMULATED</strong> game
      mechanics.
    </p>
    <div className="warning-box">
      <strong>⚠️ IMPORTANT:</strong> No real money, cryptocurrency, or financial assets
      are traded, wagered, or at risk while playing Crypto Survivors. This is NOT a
      trading platform or gambling service.
    </div>

    <h2>3. Eligibility</h2>
    <p>
      You must be at least 13 years old to play Crypto Survivors. If you are under 18,
      you must have parental or guardian consent. By using the Game, you represent that
      you meet these requirements.
    </p>

    <h2>4. User Conduct</h2>
    <p>You agree NOT to:</p>
    <ul>
      <li>
        Use cheats, exploits, automation software, bots, hacks, or any unauthorized
        third-party tools
      </li>
      <li>Manipulate game memory, network packets, or session data</li>
      <li>Impersonate other players or submit fraudulent scores</li>
      <li>Attempt to reverse engineer, decompile, or disassemble the Game</li>
      <li>Use the Game for any illegal or unauthorized purpose</li>
      <li>Harass, abuse, or harm other players or team members</li>
      <li>Exploit bugs or glitches instead of reporting them</li>
    </ul>

    <h2>5. Anti-Cheat Policy</h2>
    <p>
      Crypto Survivors employs server-side validation and anti-cheat systems to ensure
      fair play. Violations may result in:
    </p>
    <ul>
      <li>
        <strong>First Offense:</strong> Score invalidation and warning
      </li>
      <li>
        <strong>Second Offense:</strong> Temporary leaderboard ban (30 days)
      </li>
      <li>
        <strong>Third Offense:</strong> Permanent ban from all leaderboard features
      </li>
    </ul>
    <p>
      We reserve the right to ban accounts without prior notice if we detect severe or
      malicious cheating attempts.
    </p>

    <h2>6. Leaderboard and Rankings</h2>
    <p>
      Leaderboard rankings are determined by verified game sessions. We reserve the
      right to:
    </p>
    <ul>
      <li>Remove or adjust scores that appear fraudulent</li>
      <li>Reset leaderboards during major game updates</li>
      <li>Implement seasonal rankings and competitions</li>
    </ul>

    <h2>7. Intellectual Property</h2>
    <p>
      All content in Crypto Survivors, including but not limited to graphics, game
      design, code, audio, and trademarks, is owned by the Crypto Survivors team unless
      otherwise noted. Some components may be licensed under MIT or other open-source
      licenses.
    </p>
    <p>
      You may create and share gameplay videos, screenshots, and streams for personal
      and non-commercial purposes with proper attribution.
    </p>

    <h2>8. Third-Party Services</h2>
    <p>The Game integrates with third-party services including:</p>
    <ul>
      <li>
        <strong>Binance & Coinbase:</strong> Real-time market data feeds
      </li>
      <li>
        <strong>Twitter/X:</strong> Optional social authentication
      </li>
      <li>
        <strong>Supabase:</strong> Authentication and data storage
      </li>
    </ul>
    <p>Your use of these services is subject to their respective terms of service.</p>

    <h2>9. Service Availability</h2>
    <p>
      We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. The
      Game may be temporarily unavailable due to:
    </p>
    <ul>
      <li>Scheduled maintenance</li>
      <li>Emergency security patches</li>
      <li>Third-party service outages (market data providers)</li>
      <li>Force majeure events</li>
    </ul>

    <h2>10. Disclaimer of Warranties</h2>
    <p>
      THE GAME IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL
      WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
      PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
    </p>

    <h2>11. Limitation of Liability</h2>
    <p>
      TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRYPTO SURVIVORS SHALL NOT BE LIABLE FOR
      ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
      YOUR USE OF THE GAME.
    </p>

    <h2>12. Indemnification</h2>
    <p>
      You agree to indemnify and hold harmless Crypto Survivors and its team from any
      claims, damages, or expenses arising from your violation of these Terms or misuse
      of the Game.
    </p>

    <h2>13. Modifications to Terms</h2>
    <p>
      We reserve the right to modify these Terms at any time. Continued use of the Game
      after changes constitutes acceptance of the new Terms. Material changes will be
      announced via in-game notification.
    </p>

    <h2>14. Governing Law</h2>
    <p>
      These Terms shall be governed by and construed in accordance with the laws of the
      United States, without regard to conflict of law principles.
    </p>

    <h2>15. Severability</h2>
    <p>
      If any provision of these Terms is found invalid or unenforceable, the remaining
      provisions shall continue in full force and effect.
    </p>

    <h2>16. Contact</h2>
    <p>
      For questions about these Terms, please contact us at:
      <br />
      <strong>Email:</strong> legal@crypto-survivors.com
    </p>
  </LegalPageLayout>
);
