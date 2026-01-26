---
description: Bug düzeltme workflow'u - Test odaklı hata giderme
---

Bir bug'ı düzeltirken şu adımları takip et:

## Faz 1: Analiz

1. **Bug'ı Anla**
   - Hata mesajını ve stack trace'i incele
   - Hatanın nerede oluştuğunu tespit et
   - Yeniden üretme adımlarını belirle

2. **Kök Neden Analizi**
   - İlgili kodu incele
   - Hatanın kaynağını bul
   - **"Think deeply"** kullanarak olası nedenleri analiz et

## Faz 2: Reproducing Test

3. **Başarısız Test Yaz**
   - Bug'ı yeniden üreten bir test yaz
   - Testin başarısız olduğunu doğrula
   // turbo
   - `npm run test` ile testi çalıştır

## Faz 3: Düzeltme

4. **Minimal Düzeltme Yap**
   - Sadece bug'ı düzeltecek minimum değişikliği yap
   - Yan etkilere dikkat et
   - Mevcut testleri bozma

5. **Testleri Çalıştır**
   // turbo
   - `npm run test` ile tüm testlerin geçtiğini doğrula

6. **Lint Kontrolü**
   // turbo
   - `npm run lint` çalıştır
   - Hata varsa düzelt

## Faz 4: Doğrulama

7. **Manuel Test (Gerekirse)**
   - Tarayıcıda bug'ın düzeldiğini kontrol et
   - Edge case'leri test et

8. **Commit**
   - Conventional commit formatı: `fix: <açıklama>`
   - Bug'ın ne olduğunu ve nasıl düzeltildiğini açıkla
   - Örnek: `fix: PricePanel'de undefined price hatası düzeltildi`
