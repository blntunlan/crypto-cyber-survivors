import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingFaq: React.FC = () => {
  const { t } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqItems = [
    { question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
    { question: t('landing.faq.q4'), answer: t('landing.faq.a4') },
    { question: t('landing.faq.q5'), answer: t('landing.faq.a5') },
  ];

  return (
    <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            {t('landing.faq.title')}
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            {t('landing.faq.subtitle')}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-3"
        >
          {faqItems.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className={`border transition-all duration-300 ${
                openFaqIndex === i
                  ? 'border-[#d6b85c]/30 bg-[#d6b85c]/5'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:p-5"
              >
                <span
                  className={`text-sm font-bold sm:text-base ${openFaqIndex === i ? 'text-[#d6b85c]' : 'text-white'}`}
                >
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                    openFaqIndex === i ? 'rotate-180 text-[#d6b85c]' : 'text-slate-500'
                  }`}
                />
              </button>
              <AnimatePresence>
                {openFaqIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 font-mono text-sm leading-relaxed text-slate-400 sm:px-5 sm:pb-5">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
