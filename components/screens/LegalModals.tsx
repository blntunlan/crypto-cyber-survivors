import React from 'react';
import { X, Shield } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const LegalModal: React.FC<ModalProps> = ({ onClose, title, children }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm">
    <div className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-black uppercase tracking-tight font-display italic">
            {title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-8 overflow-y-auto custom-scrollbar text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none">
        {children}
      </div>
      <div className="p-6 border-t border-white/5 bg-white/[0.02] text-center">
        <button
          onClick={onClose}
          className="px-8 py-3 bg-cyan-500 text-black font-black rounded-xl hover:bg-cyan-400 transition-all active:scale-95"
        >
          UNDERSTOOD
        </button>
      </div>
    </div>
  </div>
);

export const PrivacyPolicy: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalModal onClose={onClose} title="Privacy Policy">
    <h1>Privacy Policy</h1>
    <p>Last Updated: January 29, 2026</p>

    <h2>1. Introduction</h2>
    <p>
      At Crypto Survivors, we value your privacy. This policy explains how we collect
      and use your data when you interact with our market-driven game systems.
    </p>

    <h2>2. Information We Collect</h2>
    <ul>
      <li>
        <strong>Nickname:</strong> A user-defined identifier for leaderboard services.
      </li>
      <li>
        <strong>Game Metrics:</strong> Scores, survival time, and in-game performance
        data.
      </li>
      <li>
        <strong>Device Data:</strong> Performance fingerprints to ensure 60 FPS
        optimization and anti-cheat validation.
      </li>
      <li>
        <strong>Market Preference:</strong> Selection of crypto pairs for difficulty
        scaling.
      </li>
    </ul>

    <h2>3. How We Use Information</h2>
    <p>
      We use your data to provide leaderboard rankings, award achievements, and improve
      game balance via our AI AIDirector (Project Darwin). We do NOT sell your data to
      third parties.
    </p>

    <h2>4. Data Storage</h2>
    <p>
      Your game sessions are securely stored using Google Cloud and Supabase
      Infrastructure with Row Level Security (RLS) policies.
    </p>

    <h2>5. Cookies</h2>
    <p>We use local storage only for session persistence and settings management.</p>
  </LegalModal>
);

export const TermsOfService: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalModal onClose={onClose} title="Terms of Service">
    <h1>Terms of Service</h1>
    <p>Last Updated: January 29, 2026</p>

    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing Crypto Survivors, you agree to be bound by these Terms of Service and
      all applicable laws and regulations.
    </p>

    <h2>2. Game Mechanics & Market Risk</h2>
    <p>
      Crypto Survivors utilizes real-time market data from Binance and Coinbase. The
      game involves "leverage" and "positions" which are purely{' '}
      <strong>SIMULATED</strong>. No real financial assets are traded or at risk.
    </p>

    <h2>3. Anti-Cheat Policy</h2>
    <p>
      We monitor game sessions for integrity using our server-side validation. Any
      attempt to manipulate game memory or session submission will result in a permanent
      ban from the leaderboard.
    </p>

    <h2>4. Intellectual Property</h2>
    <p>
      All game assets, code, and design are the intellectual property of the Crypto
      Survivors team, unless otherwise stated (e.g., MIT licensed components).
    </p>

    <h2>5. Disclaimer</h2>
    <p>
      The game is provided "as is". We are not responsible for any issues arising from
      market data volatility or connection failures.
    </p>
  </LegalModal>
);
