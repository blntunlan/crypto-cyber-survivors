import React from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { Code2, Radio, Gauge, ArrowUpRight } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const REPO_URL = 'https://github.com/blntunlan/crypto-cyber-survivors';

export const LandingTestimonials: React.FC = () => {
  trackRender('LandingTestimonials');

  const pillars = [
    {
      icon: Code2,
      tag: 'OPEN SOURCE',
      title: 'Read every line',
      body: 'There is no marketing layer hiding the build. The full engine — combat, physics, market pipeline — is public. Inspect it, file an issue, or fork it.',
    },
    {
      icon: Radio,
      tag: 'LIVE BETA',
      title: 'Shipping in public',
      body: 'This is v1.0 beta. Live BTC/USD already drives difficulty, enemy behavior, and rewards. Expect rough edges, frequent updates, and a roadmap that moves.',
    },
    {
      icon: Gauge,
      tag: 'PERFORMANCE FIRST',
      title: '60 FPS is the floor',
      body: 'Object pooling and spatial-hash collision keep the loop allocation-free. The 60 FPS target holds on mid-range phones, not just desktops.',
    },
  ];

  return (
    <section className="relative z-10 border-t border-[#b22222]/10 bg-[#b22222]/[0.02] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            TRANSPARENCY
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            BUILT IN THE OPEN
          </div>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-slate-400 sm:text-base">
            No fabricated reviews, no invented hype. Just a running build you can audit
            yourself.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 md:grid-cols-3 md:gap-6"
        >
          {pillars.map(pillar => (
            <motion.div
              key={pillar.tag}
              variants={fadeInUp}
              whileHover={{ y: -5 }}
              className="group relative border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#d6b85c]/35 sm:p-8"
            >
              <pillar.icon className="mb-5 h-7 w-7 text-[#d6b85c]" />
              <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#b22222]">
                {pillar.tag}
              </div>
              <h3 className="mb-3 font-cyber text-lg font-bold italic tracking-wide text-white transition-colors duration-300 group-hover:text-[#d6b85c]">
                {pillar.title}
              </h3>
              <p className="font-mono text-sm leading-relaxed text-slate-400">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="mt-8 flex justify-center"
        >
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-[48px] items-center gap-2 border border-[#d6b85c]/30 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-slate-300 transition-all duration-300 hover:border-[#d6b85c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
          >
            View the source on GitHub
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};
