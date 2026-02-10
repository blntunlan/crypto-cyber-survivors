import React, { type InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4 w-full">
      {label && (
        <label className="text-shadow-neon mb-2 block text-sm font-bold uppercase tracking-wider text-cyan-400">
          {label}
        </label>
      )}
      <input
        className={`
          w-full rounded border-2 bg-slate-900/80 p-3 font-mono 
          text-white placeholder-slate-500 transition-all duration-200
          focus:shadow-[0_0_10px_#06b6d4] focus:outline-none
          ${error ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_10px_#ef4444]' : 'border-slate-700 focus:border-cyan-400'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 font-mono text-xs tracking-wide text-red-500">⚠ {error}</p>
      )}
    </div>
  );
};
