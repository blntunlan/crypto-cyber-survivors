---
name: add-component
description: Create a new React component following project conventions
---

# Add Component Skill

Proje standartlarına uygun yeni React component oluştur.

## Usage

```
/add-component [ComponentName] [directory]
```

**Directories:**
- `components/` - Genel UI bileşenleri
- `components/screens/` - Ekran bileşenleri
- `components/admin/` - Admin panel bileşenleri
- `components/mobile/` - Mobil özel bileşenler

## Component Template

```typescript
import React from 'react';
import { motion } from 'framer-motion';

interface ComponentNameProps {
  /** Prop açıklaması */
  propName: string;
}

/**
 * ComponentName - Bileşen açıklaması
 * 
 * @example
 * <ComponentName propName="value" />
 */
export const ComponentName: React.FC<ComponentNameProps> = ({ propName }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="component-name"
    >
      {/* Content */}
    </motion.div>
  );
};

export default ComponentName;
```

## Checklist

### Before Creating

- [ ] Component adı PascalCase mi?
- [ ] Benzer bir component zaten var mı?
- [ ] Doğru klasörde mi oluşturulacak?

### Component Requirements

- [ ] TypeScript interface tanımla
- [ ] JSDoc yorum ekle
- [ ] Props type-safe olsun
- [ ] `any` type kullanma
- [ ] Default export sağla

### After Creating

- [ ] CSS/styles gerekiyor mu?
- [ ] Test dosyası oluştur
- [ ] Gerekirse story dosyası ekle

## Styling Guidelines

CSS modüler olmalı:

```css
/* ComponentName styles */
.component-name {
  /* Base styles */
}

.component-name--variant {
  /* Variant styles */
}

.component-name__element {
  /* Child element styles */
}
```

## Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentName } from '../components/ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName propName="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    // Test interactions
  });
});
```

## Common Imports

```typescript
// State management
import { useGameStore } from '@/stores/gameStore';

// Hooks
import { useMarketData } from '@/hooks/useMarketData';

// Types
import { GameState, Player } from '@/types';

// Constants
import { GAME_ENGINE } from '@/constants';

// Utils
import { formatNumber } from '@/utils/formatting';
```

## Integration Points

Yeni component'i nereye eklemeli:
1. `App.tsx` - Ana uygulama
2. `GameHUD.tsx` - Oyun içi UI
3. Screen components - Menü/modal içerikleri
