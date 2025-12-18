# 🛠️ Profesyonel Geliştirme Araçları Roadmap

**Proje:** Crypto Cyber Survivors  
**Amaç:** Sürdürülebilir, hata ayıklaması kolay, profesyonel bir geliştirme ortamı kurmak

---

## 📋 Roadmap Özeti

| Faz | Araç | Öncelik | Süre |
|-----|------|---------|------|
| 1 | ESLint + Prettier | 🔴 Kritik | 15 dk |
| 2 | Husky + lint-staged | 🟡 Önemli | 10 dk |
| 3 | TypeScript Strict Mode | 🟡 Önemli | 20 dk |
| 4 | Error Boundary + Logger | 🟢 Faydalı | 15 dk |
| 5 | Testing (Vitest) | 🟢 Faydalı | 30 dk |

---

## Faz 1: ESLint + Prettier (Kod Kalitesi)

### Neden?
- Kullanılmayan değişkenleri yakalar
- React Hook kurallarını zorlar
- Tutarlı kod formatı sağlar
- IDE'de anlık hata gösterimi

### Kurulacak Paketler
```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier
```

### Yapılandırma Dosyaları
- `eslint.config.js` - Flat config (ESLint 9+)
- `.prettierrc` - Format kuralları
- `.prettierignore` - Hariç tutulanlar

### Yeni npm Scriptleri
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  }
}
```

---

## Faz 2: Husky + lint-staged (Git Hooks)

### Neden?
- Commit öncesi otomatik lint
- Bozuk kod push edilmesini engeller
- Takım çalışmasında tutarlılık

### Kurulacak Paketler
```bash
npm install -D husky lint-staged
npx husky init
```

### Yapılandırma
- `.husky/pre-commit` - Commit hook
- `package.json` içinde `lint-staged` config

### Çalışma Şekli
```
git commit → Husky tetiklenir → lint-staged çalışır → Sadece değişen dosyalar lint edilir → Hata varsa commit engellenir
```

---

## Faz 3: TypeScript Strict Mode

### Neden?
- `null` ve `undefined` hatalarını önler
- Daha güvenli tip çıkarımı
- Potansiyel runtime hatalarını derleme zamanında yakalar

### tsconfig.json Güncellemeleri
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Beklenen İş
- Mevcut tip hatalarını düzeltmek (~20 hata tahmini)
- `any` kullanımlarını azaltmak

---

## Faz 4: Error Boundary + Logger

### Neden?
- React crash'lerini yakalar
- Kullanıcıya güzel hata mesajı gösterir
- Konsol loglarını merkezi yönetir

### Oluşturulacak Dosyalar
- `components/ErrorBoundary.tsx` - React error boundary
- `services/Logger.ts` - Merkezi log servisi

### Logger Özellikleri
```typescript
Logger.info('Oyun başladı');
Logger.warn('Düşük FPS tespit edildi');
Logger.error('WebSocket bağlantısı koptu', error);
Logger.debug('Player state:', player); // Sadece DEV modda
```

---

## Faz 5: Testing (Vitest)

### Neden?
- Kritik fonksiyonları test eder
- Refactoring güvenliği sağlar
- Regresyonları önler

### Kurulacak Paketler
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Test Edilecek Öncelikli Alanlar
1. `CardSystem.ts` - Kart seçim mantığı
2. `DifficultyManager.ts` - Zorluk hesaplaması
3. `PoolManager.ts` - Nesne havuzu
4. `CheatManager.ts` - Hile sistemi

### Örnek Test
```typescript
describe('CardSystem', () => {
  it('should not return legendary cards before level 12', () => {
    const choices = CardSystem.generateChoices(5, 5); // luck=5, level=5
    expect(choices.every(c => c.tier !== 'legendary')).toBe(true);
  });
});
```

---

## 📁 Nihai Proje Yapısı

```
crypto-cyber-survivors/
├── .husky/
│   └── pre-commit
├── .agent/
│   └── artifacts/
├── src/
│   ├── components/
│   │   └── ErrorBoundary.tsx   [YENİ]
│   └── services/
│       └── Logger.ts           [YENİ]
├── tests/                      [YENİ]
│   ├── CardSystem.test.ts
│   └── PoolManager.test.ts
├── eslint.config.js            [YENİ]
├── .prettierrc                 [YENİ]
├── vitest.config.ts            [YENİ]
└── package.json                [GÜNCELLEME]
```

---

## ⏱️ Uygulama Planı

### Bugün (30 dk)
- [x] Roadmap oluştur
- [ ] Faz 1: ESLint + Prettier kur
- [ ] İlk lint çalıştır ve hataları düzelt

### Sonraki Oturum (30 dk)
- [ ] Faz 2: Husky + lint-staged
- [ ] Faz 3: TypeScript strict mode

### Gelecek (İsteğe Bağlı)
- [ ] Faz 4: Error Boundary + Logger
- [ ] Faz 5: Test altyapısı

---

## 🚀 Başlangıç Komutu

Faz 1'i başlatmak için:
```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier
```

---

*Bu roadmap, projenin profesyonel bir geliştirme standardına ulaşması için adım adım rehber niteliğindedir.*
