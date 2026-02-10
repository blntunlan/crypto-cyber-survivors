import React from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  title,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        relative w-full max-w-md 
        overflow-hidden rounded-xl 
        border border-cyan-500/30 bg-slate-900/90 
        p-8
        shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-xl
        ${className}
      `}
    >
      {/* Decorative Top Line */}
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

      {title && (
        <h2 className="mb-8 text-center text-3xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          {title}
        </h2>
      )}

      {children}
    </motion.div>
  );
};
