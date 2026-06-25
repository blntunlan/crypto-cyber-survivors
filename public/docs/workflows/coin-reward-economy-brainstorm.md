# Coin Reward Economy Brainstorm

> **Status** devam edilecek
> Owner: Product, Gameplay, Backend

## Amaç

Bu doküman coin verme mekanizması için şu ana kadar konuşulan tasarım kararlarını kaydeder. İçerik nihai implementation spec değildir; reward matematiği, cashout portal davranışı, AFK önleme ve leaderboard ödülleri birlikte tekrar kurgulanmaya devam edecektir.

Ana hedef, oyuncuya verilen coin miktarının server-side doğrulanması, doğru kullanıcı hesabına kaydedilmesi ve ekonominin abuse edilmeyecek şekilde ölçeklenmesidir. Client yalnızca anlık tahmini değer gösterebilir; kalıcı coin bakiyesi server, wallet, ledger ve claim kayıtları üzerinden otorite olmalıdır.

## Mevcut Server Otoritesi

Mevcut doğrulama hattı doğru yöndedir:

- Run başlangıcında server session oluşturur ve session secret üretir.
- Run bitiminde client signed payload gönderir.
- Server HMAC signature, session ownership, süre, kill, level, price ve P/L değerlerini doğrular veya normalize eder.
- Final reward server tarafında tekrar hesaplanır.
- Reward amount wallet balance, reward claim ve ledger entry olarak database'e yazılır.
- Client tarafından görülen coin değeri kalıcı gerçek kabul edilmez.

Bu nedenle yeni ekonomi tasarımında ana değişiklik database kayıt modelinden çok reward matematiği ve gameplay karar noktalarıdır.

## Mevcut Matematik Özeti

Bugünkü reward hesabı şu bileşenlere dayanıyor:

```text
base        = floor(survivalSeconds * 2)
killBonus   = kills * 5
levelBonus  = min(level, 100) * 50
marketBonus = pnl > 0 ? floor(pnl * 100 * 100) : 0
streakBonus = min(floor(maxStreak / 10) * 25, 250)
total       = floor(base + killBonus + levelBonus + marketBonus + streakBonus + portalBonus)
runCap      = min(50000, total)
```

Çıkış etkileri:

- `TAKE_PROFIT`: `base + killBonus + marketBonus` üstünden ek `20%` portal bonusu verir.
- `STOP_LOSS`: survival ve market bonusunu sıfırlar.
- `FLOW_EXIT` / `FORCED`: survival bonusunu yarıya indirir.
- `death`: kill ve level bonusunu yarıya indirir; survival, market ve streak bonusunu sıfırlar.
- `afk_death`: reward sıfırdır.

## Tespit Edilen Problemler

- Level başına doğrudan coin verilmesi abuse edilebilir; level coin kaynağı olmamalıdır.
- Mevcut yorumda `1% P/L = 1 coin` denmesine rağmen formül fiilen `1% P/L = 100 coin` davranır.
- Survival lineer olduğu için pasif uzun kalma davranışı fazla ödüllendirilebilir.
- Run cap sabit ama 500 milyon toplam arz veya sezonluk emisyonla doğrudan bağlantılı değildir.
- Yüksek kaldıraçta küçük raw fiyat hareketleri çok büyük leveraged P/L üretebilir.
- Kısa süreli yüksek kaldıraç cashout spam'i engellenmelidir.

## Yeni Tasarım Yönü

Reward'un ana kaynağı hayatta kalma süresi ve oyun bitimindeki pozisyon P/L değeri olmalıdır. Level reward tamamen kaldırılmalıdır.

Önerilen ana formül:

```text
cashoutCoins =
  survivalBase
  * survivalMaturity
  * finalPnlMultiplier
  * leverageDampener
  * exitMultiplier
  * activePlayMultiplier
```

Bu değer server tarafından final exit anında tekrar hesaplanır. Client aynı formülü sadece preview için çalıştırır.

## Survival Tasarımı

Statik minimum süre kullanılmayacaktır. Bunun yerine soft maturity kullanılacaktır:

```text
survivalMaturity = 1 - e^(-minutes / maturityScale)
```

Beklenen davranış:

- Çok kısa run'lar ödül üretir ama ekonomik olarak verimsizdir.
- Orta süreli run'lar anlamlı reward üretmeye başlar.
- Uzun run'lar ana reward bölgesidir.
- Çok uzun run'larda ödül artışı devam eder ama diminishing returns uygulanır.

Bu yaklaşım oyuncuyu uzun oynamaya iter, fakat erken exit fırsatını tamamen kapatmaz.

## P/L Tasarımı

Oyun bitimindeki final P/L temel piyasa faktörüdür. Run boyunca time-weighted P/L şu aşamada hedeflenmemektedir.

Önerilen davranış:

- Pozitif P/L reward'u büyütür.
- Negatif P/L reward'u düşürür ama otomatik sıfırlamaz.
- Çok yüksek leveraged P/L doğrudan lineer coin'e çevrilmez.
- P/L multiplier capped ve eğrili olmalıdır.

Örnek hedef davranış:

| Leveraged P/L | Hedef Çarpan |
|---|---|
| `0%` | `1.0x` |
| `+25%` | yaklaşık `1.5x` |
| `+100%` | yaklaşık `2.3x` |
| `+300%` | cap'e yakın |
| `-50%` | yaklaşık `0.5x` |
| `-100%` | minimum çarpana yakın |

Bu sayılar nihai değildir; amaç yüksek kaldıraç abuse'unu engelleyen non-linear davranışı tarif etmektir.

## Leverage Abuse Önlemi

Yüksek kaldıraçta küçük raw hareketlerin reward'u patlatmaması gerekir. Özellikle `100x` kaldıraçta `%1` raw hareketin `%100` leveraged P/L üretmesi doğrudan büyük coin anlamına gelmemelidir.

Önerilen önlemler:

- `leveragedPnl = rawPnl * leverage` hesaplanır ama reward eğrisi capped olur.
- Yüksek leverage için `leverageDampener` uygulanır.
- Maturity scale kaldıraçla büyüyebilir; yüksek kaldıraç erken cashout'u daha verimsiz yapar.
- Portal eşikleri yüksek kaldıraçta sık tetiklense bile reward maturity düşük kaldığı için abuse azaltılır.

## Cashout Portal Döngüsü

Cashout portal ödülün ana kapısıdır. Oyuncu portal geldiğinde karar verir:

- Cashout yaparsa o andaki doğrulanabilir reward'u alır.
- Devam ederse potansiyel ödül artabilir veya P/L düşerse canlı coin azalabilir.
- Portal açıkken ölürse ciddi reward kaybeder.

Portal sadece pozitif P/L için değil, negatif P/L aralıklarında da çıkış şansı sunabilir. Bu, yüksek kaldıraç oyuncularına sürekli `tamam mı devam mı` döngüsü yaratır.

Örnek P/L bantları:

| Pozitif Bantlar | Negatif Bantlar |
|---|---|
| `+10%` | `-10%` |
| `+25%` | `-25%` |
| `+50%` | `-50%` |
| `+100%` | `-75%` |
| `+200%` | |

Portal spam'i önlemek için hysteresis ve cooldown gerekir. Aynı bant tekrar tekrar portal açmamalıdır.

## Canlı Coin Preview

Oyuncu oyun içinde canlı cashout değerini görebilmelidir. Bu değer banked coin değildir:

```text
liveCashoutCoins = if player exits now, server-estimated reward
```

UI hedefleri:

- Şu anki cashout coin değeri gösterilir.
- Peak cashout coin değeri tutulur.
- P/L kötüleşince oyuncu kardan zarar psikolojisini hisseder.
- Örnek gösterim: `Şu an: 870`, `En yüksek: 1240`, `Kardan zarar: -370`.

Bu bilgi risk/reward gerilimini artırır. Kalıcı bakiye her zaman server response ve wallet endpoint'inden okunmalıdır.

## Death ve AFK

Normal death ciddi coin vermemelidir:

```text
deathReward = min(liveCashoutCoins * 0.03, symbolicDeathCap)
```

Örnek symbolic cap aralığı `25-100 coin` olarak değerlendirilebilir. Nihai sayı daha sonra seçilecektir.

AFK death reward'u sıfır olmalıdır:

```text
afkDeathReward = 0
```

AFK önleme gameplay tarafında agresif olmalıdır:

- Belirli süre input, movement, combat veya pickup yoksa AFK suspicion artar.
- AFK pressure başladıktan sonra düşmanlar piranha mode'a geçer.
- Piranha mode enemy speed, aggro ve spawn baskısını artırır.
- AFK flag latch'lenebilir; oyuncu sonradan hareket etse bile reward çarpanı düşebilir.
- AFK sonucu ölüm `afk_death` olarak server'a taşınır ve reward sıfırlanır.

## Leaderboard ve Rekor Ödülleri

Rekor kovalayan oyuncular için ayrı bir ödül hattı düşünülmektedir. Bu reward run içi cashout coin'den ayrı olmalıdır.

Önerilen yapı:

- Günlük veya haftalık survival leaderboard.
- Her oyuncunun epoch içindeki en iyi doğrulanmış survival run'ı sayılır.
- Ödül epoch sonunda dağıtılır, run sonunda değil.
- Cashout reward ve leaderboard reward ayrı kayıtlanır.
- Ölerek biten ama AFK olmayan uzun run leaderboard'a aday olabilir.

Bu model rekor kovalayan oyunculara farklı motivasyon verir. Oyuncu cashout yaparsa anlık coin alır; devam edip ölürse run coin'i sembolik kalır ama survival leaderboard şansı olabilir.

## Açık Kararlar

Bu doküman devam edilecek durumdadır. Bir sonraki oturumda şu kararlar netleştirilmelidir:

- Survival base eğrisi hangi formülle hesaplanacak?
- `survivalMaturity` için başlangıç `maturityScale` değeri ne olacak?
- Final P/L multiplier eğrisi tam olarak hangi fonksiyonla hesaplanacak?
- `leverageDampener` kaldıraçlara göre nasıl ölçeklenecek?
- Portal P/L bantları ve cooldown süreleri kesin olarak ne olacak?
- Death symbolic cap kaç coin olacak?
- AFK latch davranışı kalıcı reward düşürme mi, sadece AFK death sıfırlama mı olacak?
- Leaderboard ödülleri cashout etmeyen death run'ları nasıl ağırlıklandıracak?
- 500 milyon sabit arz veya sezonluk emisyon bütçesi reward cap'lerine nasıl bağlanacak?

## Devam Notu

Bir sonraki adım, bu brainstorm'u nihai reward spec'e çevirmek olmalıdır. Spec içinde formüller, örnek run hesapları, server validation payload değişiklikleri, client preview davranışı ve test senaryoları ayrı ayrı netleştirilmelidir.
