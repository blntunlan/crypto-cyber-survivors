# Page & Component Transitions

Smooth transitions are essential for the high-end feel of the landing page.

## Preferred Library: Framer Motion
Use `framer-motion` for complex animations and transitions.

### Page Transition Pattern
```tsx
import { motion, AnimatePresence } from 'framer-motion';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);
```

### Component Enter/Exit
- **HUD Elements**: Should slide in from the nearest edge (e.g., top-bar slides from top).
- **Modals**: Scale up from 0.95 and fade in.
- **Lists**: Use `staggerChildren` to animate list items sequentially.

## CSS Transitions
For simple hover states, use standard CSS:
- `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);`
- Use variables for timing: `--transition-fast: 0.15s;`, `--transition-normal: 0.3s;`.

## Performance
- Always use `will-change: transform, opacity;` for elements being animated to enable hardware acceleration.
- Avoid animating properties that trigger reflow (width, height, top, left). Use `transform` (scale, translate) instead.
