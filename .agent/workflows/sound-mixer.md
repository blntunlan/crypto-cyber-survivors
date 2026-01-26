---
description: Settings'e ses kategorileri bazlı volume kontrolleri (Sound Mixer) ekleme
---

Settings'e her ses kategorisinin ayrı ayrı ayarlanabildiği bir "Sound Mixer" bölümü eklemek için şu adımları takip et:

## Faz 1: Keşfet (Explore)

1. **İlgili Dosyaları İncele**
   - `services/audio/SynthEngine.ts` - Volume yönetimi mevcut durumu
   - `services/audio/GameSounds.ts` - Oyun sesleri
   - `services/audio/ComboSounds.ts` - Combo sesleri
   - `services/audio/SlotMachineSounds.ts` - Slot sesleri
   - `services/audio/types.ts` - Mevcut type'lar
   - `stores/gameStore.ts` - AudioSettings state yapısı
   - `components/settings/AudioSection.tsx` - Mevcut ses UI'ı
   - `components/settings/SettingsPanel.tsx` - Settings ana bileşeni

2. **Mevcut Testleri Kontrol Et**
   - `tests/audio/` klasöründe ses testleri var mı kontrol et
   - AudioService için mevcut test coverage'ı değerlendir

## Faz 2: Planla (Plan)

3. **Detaylı Plan Oluştur**

   **Ses Kategorileri:**
   | Kategori | Sesler | Açıklama |
   |----------|--------|----------|
   | combat | shoot, crit, hit | Savaş sesleri |
   | feedback | gem, levelUp, combo, comboMilestone | Geri bildirim |
   | movement | dash, whoosh | Hareket |
   | ui | button | Arayüz |
   | alerts | heartbeat, death, whaleArrival | Uyarılar |
   | slots | slotTick, reelStop, slotWin, anticipation, jackpot, vb. | Slot makinesi |

   **Değiştirilecek Dosyalar:**
   | Dosya | Değişiklik |
   |-------|-----------|
   | `services/audio/types.ts` | `SoundCategory` type ekle |
   | `services/audio/constants.ts` | `SOUND_CATEGORIES` mapping ekle |
   | `services/audio/SynthEngine.ts` | `categoryVolumes` ve `getEffectiveVolume()` ekle |
   | `services/audio/GameSounds.ts` | Her seste effective volume kullan |
   | `services/audio/ComboSounds.ts` | Her seste effective volume kullan |
   | `services/audio/SlotMachineSounds.ts` | Her seste effective volume kullan |
   | `services/audio/AudioService.ts` | `setCategoryVolume()` facade method |
   | `stores/gameStore.ts` | `categoryVolumes` state ve action'lar |
   | `components/settings/SoundMixerSection.tsx` | YENİ - Mixer UI bileşeni |
   | `components/settings/SettingsPanel.tsx` | SoundMixerSection import ve ekleme |

   **Potansiyel Riskler:**
   - Master volume ile kategori volume çarpımında 0'a yaklaşma
   - Mevcut ses çalan kodlarda volume parametrelerinin override edilmesi
   - Store persistence ile AudioService senkronizasyonu

4. **Planı Kullanıcıyla Onayla**
   - Yukarıdaki planı kullanıcıya göster
   - Kategori isimleri ve gruplamalar uygun mu sor
   - Onay al, gerekirse revize et

## Faz 3: Kodla (Code)

5. **Test Yaz (TDD)**
   - `tests/audio/SynthEngine.test.ts` - CategoryVolume testleri
     - setCategoryVolume doğru set ediyor mu
     - getEffectiveVolume master * category çarpıyor mu
     - Mute durumunda 0 dönüyor mu
   - `tests/stores/gameStore.test.ts` - Store action testleri
   // turbo
   - `npm run test` ile testlerin başarısız olduğunu doğrula

6. **Implementasyonu Yap**

   **Adım 6.1: Type Tanımları**
   ```typescript
   // services/audio/types.ts
   export type SoundCategory = 'combat' | 'feedback' | 'movement' | 'ui' | 'alerts' | 'slots';
   ```

   **Adım 6.2: Kategori Mapping**
   ```typescript
   // services/audio/constants.ts
   export const SOUND_CATEGORIES: Record<string, SoundCategory> = { ... };
   ```

   **Adım 6.3: SynthEngine Güncelleme**
   - categoryVolumes: Record<SoundCategory, number> ekle
   - setCategoryVolume() method
   - getEffectiveVolume(category) method

   **Adım 6.4: Ses Dosyalarını Güncelle**
   - GameSounds.ts: Her playX fonksiyonunda getEffectiveVolume kullan
   - ComboSounds.ts: Aynı şekilde
   - SlotMachineSounds.ts: Aynı şekilde

   **Adım 6.5: AudioService Facade**
   ```typescript
   setCategoryVolume(category: SoundCategory, volume: number): void
   getCategoryVolume(category: SoundCategory): number
   ```

   **Adım 6.6: Store Güncelleme**
   ```typescript
   // stores/gameStore.ts
   categoryVolumes: {
     combat: 1.0, feedback: 1.0, movement: 1.0,
     ui: 1.0, alerts: 1.0, slots: 1.0
   }
   setCategoryVolume: (category, volume) => ...
   ```

   **Adım 6.7: UI Bileşeni**
   - `components/settings/SoundMixerSection.tsx` oluştur
   - Her kategori için slider
   - İkon ve açıklama
   - Retro tema desteği

   **Adım 6.8: SettingsPanel Entegrasyonu**
   - SoundMixerSection import et
   - AudioSection'dan sonra ekle
   - Keyboard navigation güncelle

7. **Lint ve Format**
   // turbo
   - `npm run lint:fix` çalıştır
   // turbo
   - `npm run format` çalıştır

## Faz 4: Doğrula (Verify)

8. **Tüm Testleri Çalıştır**
   // turbo
   - `npm run test` ile unit testleri çalıştır
   - Tüm testlerin geçtiğini doğrula

9. **Manuel Test**
   - Dev server'da settings aç
   - Her slider'ı hareket ettir
   - Oyun içinde seslerin değiştiğini doğrula
   - Master volume + kategori volume kombinasyonunu test et
   - Mute durumunu test et
   - Reset butonunu test et

10. **Değişiklikleri Özetle**
    - Yapılan değişiklikleri listele
    - Breaking change: AudioService artık kategori volume destekliyor
    - Store'da yeni `categoryVolumes` alanı persist ediliyor

11. **Commit ve Push**
    - `feat(audio): add sound mixer with category volume controls`
    - İlgili issue numarasını ekle (varsa)
