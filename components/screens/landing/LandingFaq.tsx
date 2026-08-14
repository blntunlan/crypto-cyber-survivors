import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const FAQ_ITEMS = [
  {
    question: 'What makes Crypto Survivors different from other games?',
    answer:
      'Real-time BTC/USD price feeds directly influence gameplay difficulty. Market volatility creates unique challenges every session.',
  },
  {
    question: 'Is this a play-to-earn or crypto wallet game?',
    answer:
      'No. This is a skill-based arcade game. No real money, no wallets, no blockchain transactions required.',
  },
  {
    question: 'What are Casual and Competitive modes?',
    answer:
      'Casual mode offers relaxed difficulty for learning. Competitive mode features global leaderboards and anti-cheat validation.',
  },
  {
    question: 'Does the game work offline?',
    answer:
      'Limited offline mode available via PWA. Full features require internet for live market data.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'Web browser (desktop & mobile), PWA installable. Native apps planned for future releases.',
  },
];

export const LandingFaq: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            Common Questions
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            FAQ
          </div>
        </m.div>

        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-3"
        >
          {FAQ_ITEMS.map((faq, i) => (
            <m.div
              key={faq.question}
              variants={fadeInUp}
              className={`border transition-colors duration-300 ${
                openFaqIndex === i
                  ? 'border-[#d6b85c]/30 bg-[#d6b85c]/5'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <button
                type="button"
                id={`faq-trigger-${i}`}
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                aria-expanded={openFaqIndex === i}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:p-5"
              >
                <span
                  className={`text-sm font-bold sm:text-base ${openFaqIndex === i ? 'text-[#d6b85c]' : 'text-white'}`}
                >
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                    openFaqIndex === i ? 'rotate-180 text-[#d6b85c]' : 'text-slate-400'
                  }`}
                />
              </button>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                hidden={openFaqIndex !== i}
              >
                <p className="px-4 pb-4 font-mono text-sm leading-relaxed text-slate-400 sm:px-5 sm:pb-5">
                  {faq.answer}
                </p>
              </div>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
};
