import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, Users } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingTestimonials: React.FC = () => {
  const playerTestimonials = [
    {
      quote:
        'bro i was mass liquidated last week but somehow this game made it fun?? lmao bears go brrrr',
      author: 'degen_marc',
      role: '200+ hours',
      rating: 5,
    },
    {
      quote:
        'ok ngl the btc price sync is actually sick. played during the dip and it felt like chaos mode haha',
      author: 'satoshi_wannabe',
      role: 'beta tester',
      rating: 4,
    },
    {
      quote:
        'runs smooth af on my old phone, didnt expect that tbh. also the bear/bull mechanic is lowkey addicting',
      author: 'xKr1pt0x',
      role: 'mobile player',
      rating: 5,
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
            COMMUNITY
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            WHAT PLAYERS SAY
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 md:grid-cols-3 md:gap-6"
        >
          {playerTestimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -5 }}
              className="group relative border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-[#d6b85c]/35 sm:p-8"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-[#d6b85c]/20" />
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#d6b85c] text-[#d6b85c]" />
                ))}
              </div>
              <p className="mb-6 font-mono text-sm leading-relaxed text-slate-300">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b85c] to-[#b22222]">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-xs text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
