import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingTeam: React.FC = () => {
  const teamMembers = [
    {
      name: 'Bulent Unalan',
      role: 'Lead Architect & Founder',
      summary:
        'Owns engine architecture, C-SYNC protocol design, and end-to-end performance discipline.',
      proof: 'Company profile: Crypto Survivors',
    },
    {
      name: 'Core Contributors',
      role: 'Engine, QA, and Infrastructure',
      summary:
        'Contributors focused on gameplay systems, anti-cheat, CI quality gates, and deployment reliability.',
      proof: 'Public contribution log available on GitHub',
    },
    {
      name: 'Market & Operations Support',
      role: 'Data Pipeline and Product Ops',
      summary:
        'Supports market feed resilience, production monitoring, and release operations for the live runtime.',
      proof: 'Verification references maintained in company records',
    },
  ];

  return (
    <section
      id="team"
      className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            TEAM / ABOUT
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            PEOPLE BEHIND THE ENGINE
          </div>
          <p className="mx-auto mt-6 max-w-3xl font-mono text-sm leading-relaxed text-slate-400 sm:text-base">
            Crypto Survivors is built as a public, digital-native software company. This
            section documents who is responsible for product, infrastructure, and
            runtime reliability.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-3"
        >
          {teamMembers.map(member => (
            <motion.div
              key={member.name}
              variants={fadeInUp}
              whileHover={{ y: -4 }}
              className="group relative border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#d6b85c]/30 sm:p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b85c] to-[#b22222]">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-[#d6b85c]">
                    {member.role}
                  </p>
                  <p className="text-lg font-bold text-white">{member.name}</p>
                </div>
              </div>
              <p className="mb-4 font-mono text-sm leading-relaxed text-slate-300">
                {member.summary}
              </p>
              <div className="border-l-2 border-[#b22222] pl-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                {member.proof}
              </div>
            </motion.div>
          ))}
        </motion.div>
        <div className="mt-8 rounded-sm border border-[#d6b85c]/20 bg-[#d6b85c]/5 p-4 font-mono text-xs leading-relaxed text-slate-300 sm:p-5">
          Audit note: founder and key team members maintain Crypto Survivors in their
          LinkedIn Experience records with role and timeline details.
        </div>
      </div>
    </section>
  );
};
