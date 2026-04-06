// Slot machine timing config - Psychologically Optimized 🧠
export const SLOT_CONFIG = {
  SPIN_DURATION: 2000, // Longer spin for anticipation "sweet spot"
  CARDS_PER_SPIN: 12, // More cards = faster visual flow
  SPIN_INTERVAL: 60, // 60ms = smooth 16fps card changes
  STOP_DELAY_BASE: 600, // Base delay for first reel
  STOP_DELAY_INCREMENT: 600, // Each subsequent reel adds this much delay (cumulative)
  SLOWDOWN_DURATION: 400, // Duration of the slowdown effect before stopping
  MIN_RENDER_INTERVAL: 32, // Clamp UI updates to ~30fps so spins feel fluid
};

// Animation variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const titleVariants = {
  hidden: { opacity: 0, y: -80, scale: 0.5 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
};

export const slotReelVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  }),
};
