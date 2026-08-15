import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const FAQ_ITEMS = [
  {
    question: 'Does the live price actually change the run, or is it just a skin?',
    answer:
      'It changes the run. RSI, ATR and volume are computed server-side from the BTC/USD feed and fed straight into spawn pressure, enemy behaviour and reward multipliers. A quiet tape and a volatile one are not the same fight.',
  },
  {
    question: 'When should I cash out?',
    answer:
      'That is the whole game. Your payout keeps climbing while you survive, but the run only pays if you reach a portal and extract. Die first and it is gone. Higher leverage raises both the yield and the speed at which the arena turns on you.',
  },
  {
    question: 'Do I need a crypto wallet? Can I lose real money?',
    answer:
      'No, and no. There are no wallets, no tokens and no blockchain transactions. The market feed is read-only price data — nothing you do here touches a real position.',
  },
  {
    question: 'What happens if the price feed drops mid-run?',
    answer:
      'The run halts rather than continuing on stale prices. The game moves into a disconnected state and resumes from where it stopped once the stream recovers.',
  },
  {
    question: 'Why can my payout differ from the number on screen?',
    answer:
      'Competitive payouts are recalculated on the server against the recorded run and the historical candles before coins land on your profile. The in-run counter is a projection; the server settles it.',
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
          {/* The visible headline is the heading — no eyebrow restating it. */}
          <h2 className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            FAQ
          </h2>
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
