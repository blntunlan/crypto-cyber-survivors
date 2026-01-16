# Railway MCP Server Kullanım Rehberi

## İçindekiler
- [Giriş](#giriş)
- [MCP Nedir?](#mcp-nedir)
- [Railway MCP Server Nedir?](#railway-mcp-server-nedir)
- [Kurulum](#kurulum)
- [Claude Code ile Kullanım](#claude-code-ile-kullanım)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Mevcut Araçlar](#mevcut-araçlar)
- [Güvenlik Hususları](#güvenlik-hususları)
- [Sorun Giderme](#sorun-giderme)

---

## Giriş

Railway MCP Server, Railway projelerinizi ve altyapınızı doğal dil kullanarak yönetmenizi sağlayan deneysel bir araçtır. Claude Code ile birlikte kullanıldığında, terminalden Railway işlemlerinizi yapay zeka desteğiyle gerçekleştirebilirsiniz.

> ⚠️ **UYARI**: Railway MCP Server yüksek derecede deneyseldir. Hatalar ve eksik özellikler bekleyebilirsiniz. Yıkıcı işlemler (servis/ortam silme gibi) tasarım gereği hariç tutulmuş olsa da, her işlemi çalıştırmadan önce dikkatlice gözden geçirmelisiniz.

---

## MCP Nedir?

**Model Context Protocol (MCP)**, yapay zeka uygulamalarının (hosts) harici araçlar ve veri kaynaklarıyla nasıl etkileşime geçeceğini tanımlayan bir standarttır.

### MCP Mimarisi

```
┌─────────────────┐
│  AI Host        │  (Cursor, VS Code, Claude Code, Windsurf)
│  ┌───────────┐  │
│  │  Client   │  │  ← Host içindeki MCP bağlantı katmanı
│  └─────┬─────┘  │
└────────┼────────┘
         │
         │ MCP Protokolü
         │
┌────────▼────────┐
│  MCP Server     │  (Railway MCP Server)
│  ┌───────────┐  │
│  │   Tools   │  │  ← Railway CLI komutlarını çalıştırır
│  └───────────┘  │
└─────────────────┘
         │
         ▼
    Railway API
```

### Temel Bileşenler

- **Host (Ana Bilgisayar)**: Cursor, VS Code, Claude Desktop veya Claude Code gibi MCP sunucularına bağlanan uygulamalar
- **Client (İstemci)**: Host içindeki, bireysel MCP sunucularıyla birebir bağlantıları sürdüren katman
- **Server (Sunucu)**: Harici sistemleri yönetmek için araçlar ve iş akışları sunan bağımsız programlar

---

## Railway MCP Server Nedir?

Railway MCP Server, doğal dil isteklerini Railway CLI iş akışlarına dönüştüren bir MCP sunucusudur. Bu sayede:

- Doğal dille Railway projeleri oluşturabilirsiniz
- Şablonlardan hızlıca deploy edebilirsiniz
- Ortamları yönetebilirsiniz
- Environment variable'ları çekebilir ve ayarlayabilirsiniz
- Logları görüntüleyebilirsiniz
- Domain atayabilirsiniz

### Nasıl Çalışır?

1. Siz Claude Code'a doğal dille bir istek gönderirsiniz
2. Claude Code, Railway MCP Server'a uygun bir araç çağrısı yapar
3. Railway MCP Server, Railway CLI komutlarını çalıştırır
4. Sonuç size geri döndürülür

---

## Kurulum

### Ön Gereksinimler

Railway MCP Server kullanmadan önce:

1. **Railway CLI kurulu olmalı**
   ```bash
   # Railway CLI'yi kurun
   npm i -g @railway/cli
   # veya
   brew install railway
   ```

2. **Railway CLI kimlik doğrulaması yapılmış olmalı**
   ```bash
   railway login
   ```

### Claude Code İçin Kurulum

Claude Code ile Railway MCP Server'ı kurmak çok basittir:

```bash
claude mcp add Railway npx @railway/mcp-server
```

Bu komut:
- Railway MCP Server'ı Claude Code yapılandırmanıza ekler
- Her çalışmada `npx @railway/mcp-server` komutunu kullanarak MCP server'ı başlatır
- Herhangi bir manuel yapılandırma gerektirmez

### Kurulumu Doğrulama

Kurulumun başarılı olduğunu doğrulamak için:

```bash
# Claude Code'u başlatın
claude

# Sonra şunu sorun:
"Railway MCP server kurulu mu? Durumunu kontrol et."
```

Claude, `check-railway-status` aracını kullanarak Railway CLI'nin kurulu ve kimlik doğrulamasının yapılmış olduğunu doğrulayacaktır.

---

## Claude Code ile Kullanım

### Temel Kullanım Akışı

1. **Claude Code'u başlatın**
   ```bash
   claude
   ```

2. **Doğal dille istekte bulunun**
   
   Railway ile ilgili herhangi bir işlemi doğal dille talep edebilirsiniz. Claude Code, arka planda gerekli MCP araçlarını otomatik olarak çağıracaktır.

### Kullanım İpuçları

#### ✅ İyi Örnekler

```
"Bu dizinde yeni bir Next.js projesi oluştur ve Railway'e deploy et. 
Ayrıca bir domain ata."

"Bir PostgreSQL veritabanı deploy et"

"Production ortamından environment variable'ları çek ve .env dosyasına kaydet"

"Development adında, production'dan klonlanmış yeni bir ortam oluştur 
ve bunu linked ortam olarak ayarla"
```

#### ❌ Kaçınılması Gerekenler

```
# Çok belirsiz
"Railway ile bir şeyler yap"

# Yıkıcı işlemler (bunlar zaten desteklenmiyor)
"Production ortamını sil"
"Bu servisi kaldır"
```

### Proje Bağlamında Çalışma

Railway MCP Server, mevcut dizininizin bağlamında çalışır:

```bash
# Proje dizininize gidin
cd ~/projelerim/my-app

# Claude Code'u başlatın
claude

# Proje bağlamında işlem yapın
"Bu projeyi Railway'e deploy et"
```

---

## Kullanım Örnekleri

### 1. Yeni Proje Oluşturma ve Deploy Etme

**Senaryo**: Sıfırdan yeni bir uygulama oluşturmak ve Railway'e deploy etmek istiyorsunuz.

```
# Claude Code'da
"Bu dizinde yeni bir Express.js API oluştur ve Railway'e deploy et. 
Production ortamı için bir domain ata."
```

**Arka planda olacaklar:**
1. `create-project-and-link` - Yeni Railway projesi oluşturulur
2. `deploy` - Kod Railway'e deploy edilir
3. `generate-domain` - Railway domain'i oluşturulur

### 2. Şablondan Deploy Etme

**Senaryo**: Railway Template Library'den hazır bir şablon kullanmak istiyorsunuz.

```
# PostgreSQL için
"Bir PostgreSQL veritabanı deploy et"

# Redis için
"Redis cache deploy et"

# ClickHouse için
"Tek node ClickHouse veritabanı deploy et"
```

**Arka planda olacaklar:**
- `deploy-template` - Belirtilen şablon Railway'e deploy edilir
- Gerekli environment variable'lar otomatik ayarlanır
- Servis başlatılır

### 3. Environment Variable'ları Yönetme

**Senaryo**: Production ortamından environment variable'ları yerel geliştirme için çekmek istiyorsunuz.

```
"Projemin environment variable'larını çek ve .env dosyasına kaydet"
```

**Alternatif kullanımlar:**
```
"DATABASE_URL ve API_KEY environment variable'larını göster"

"NODE_ENV değişkenini development olarak ayarla"

"Tüm environment variable'ları listele"
```

### 4. Çoklu Ortam Yönetimi

**Senaryo**: Production'dan klonlanmış yeni bir staging ortamı oluşturmak istiyorsunuz.

```
"Production'dan klonlanmış 'staging' adında yeni bir ortam oluştur 
ve bunu bu dizine linked ortam olarak ayarla"
```

**Adım adım:**
1. `create-environment` - Yeni ortam oluşturulur
2. `link-environment` - Ortam mevcut dizine bağlanır
3. Environment variable'lar production'dan kopyalanır

### 5. Servisleri İzleme

**Senaryo**: Bir servisin son loglarını görüntülemek istiyorsunuz.

```
"API servisimin son 100 log satırını göster"

"Web servisinin hata loglarını göster"

"Bu projedeki tüm servislerin loglarını göster"
```

### 6. Domain Yönetimi

**Senaryo**: Servisinize bir Railway domain'i eklemek istiyorsunuz.

```
"Bu servise bir Railway domain'i ata"

"Production ortamı için özel bir domain yapılandır"
```

### 7. Karmaşık İş Akışı Örneği

**Senaryo**: Tam bir full-stack uygulama deploy etme.

```
"Şunları yap:
1. Bu Next.js uygulamasını Railway'e deploy et
2. Bir PostgreSQL veritabanı ekle
3. Veritabanı URL'sini environment variable olarak ayarla
4. Production için bir domain ata
5. Development ortamı oluştur"
```

Claude Code bu işlemleri sırayla gerçekleştirir ve her adımı size raporlar.

---

## Mevcut Araçlar

Railway MCP Server, aşağıdaki araçları sağlar. AI asistanınız isteğinizin bağlamına göre bu araçları otomatik olarak çağırır.

### 📊 Durum Kontrolü

#### `check-railway-status`
Railway CLI'nin kurulu ve kimlik doğrulamasının yapılmış olduğunu doğrular.

**Ne zaman kullanılır:**
- İlk kurulumda
- Bağlantı sorunları yaşandığında
- Kimlik doğrulama kontrolü için

**Örnek:**
```
"Railway bağlantımı kontrol et"
```

### 🗂️ Proje Yönetimi

#### `list-projects`
Tüm Railway projelerinizi listeler.

**Ne zaman kullanılır:**
- Hangi projelere sahip olduğunuzu görmek için
- Proje seçmeden önce

**Örnek:**
```
"Railway projelerimi listele"
```

#### `create-project-and-link`
Yeni bir proje oluşturur ve mevcut dizine bağlar.

**Ne zaman kullanılır:**
- Yeni bir uygulama başlatırken
- Mevcut kodu Railway'e ilk kez deploy ederken

**Örnek:**
```
"Bu dizin için yeni bir Railway projesi oluştur"
```

### ⚙️ Servis Yönetimi

#### `list-services`
Projedeki tüm servisleri listeler.

**Ne zaman kullanılır:**
- Projenizdeki servisleri görmek için
- Belirli bir servisi seçmek için

**Örnek:**
```
"Bu projedeki servisleri göster"
```

#### `link-service`
Bir servisi mevcut dizine bağlar.

**Ne zaman kullanılır:**
- Monorepo yapısında çalışırken
- Belirli bir servis üzerinde çalışırken

**Örnek:**
```
"API servisini bu dizine bağla"
```

#### `deploy`
Bir servisi deploy eder.

**Ne zaman kullanılır:**
- Kod değişikliklerini production'a gönderirken
- Manuel deploy tetiklerken

**Örnek:**
```
"Bu servisi şimdi deploy et"
```

#### `deploy-template`
Railway Template Library'den deploy eder.

**Ne zaman kullanılır:**
- Veritabanı eklerken
- Hazır çözümler kullanırken

**Desteklenen şablonlar:**
- PostgreSQL
- MySQL
- MongoDB
- Redis
- ClickHouse
- ve daha fazlası...

**Örnek:**
```
"PostgreSQL veritabanı ekle"
```

### 🌍 Ortam Yönetimi

#### `create-environment`
Yeni bir ortam oluşturur.

**Ne zaman kullanılır:**
- Development/staging ortamı oluştururken
- Production'dan izole test ortamı isterken

**Örnek:**
```
"Staging ortamı oluştur"
```

#### `link-environment`
Ortamı mevcut dizine bağlar.

**Ne zaman kullanılır:**
- Belirli bir ortamda çalışırken
- Ortam değiştirirken

**Örnek:**
```
"Bu dizini development ortamına bağla"
```

### 🔐 Yapılandırma ve Değişkenler

#### `list-variables`
Environment variable'ları listeler.

**Ne zaman kullanılır:**
- Mevcut yapılandırmayı görmek için
- Değişken isimlerini kontrol ederken

**Örnek:**
```
"Bu ortamdaki tüm environment variable'ları göster"
```

#### `set-variables`
Environment variable'ları ayarlar.

**Ne zaman kullanılır:**
- Yeni yapılandırma eklerken
- Mevcut değişkenleri güncellerken

**Örnek:**
```
"API_KEY'i abc123 olarak ayarla"
```

#### `generate-domain`
Railway domain'i oluşturur.

**Ne zaman kullanılır:**
- Servisinize public erişim eklerken
- Hızlı test URL'si isterken

**Örnek:**
```
"Bu servis için bir domain oluştur"
```

### 📋 İzleme ve Loglar

#### `get-logs`
Servis loglarını alır.

**Ne zaman kullanılır:**
- Hata ayıklarken
- Deploy durumunu kontrol ederken
- Uygulama davranışını izlerken

**Örnek:**
```
"Son 50 log satırını göster"
"Hata loglarını göster"
```

---

## Güvenlik Hususları

Railway MCP Server, Railway CLI komutlarını arka planda çalıştırır. Yıkıcı işlemler kasıtlı olarak hariç tutulmuş ve MCP araçları olarak sunulmamış olsa da, yine de:

### ✅ Yapmanız Gerekenler

1. **Her işlemi gözden geçirin**: LLM tarafından istenen işlemleri çalıştırmadan önce inceleyin
2. **Erişimi kısıtlayın**: Sadece güvenilir kullanıcıların MCP server'ı çağırabildiğinden emin olun
3. **Production risklerinden kaçının**: Kullanımı yerel geliştirme ve kritik olmayan ortamlarla sınırlayın
4. **Yedekleme yapın**: Önemli ortamlarda çalışmadan önce yedek alın

### ⚠️ Dikkat Edilmesi Gerekenler

- **Environment variable'lar hassas bilgi içerebilir**: API anahtarları, database credential'ları gibi
- **Deploy işlemleri production'ı etkileyebilir**: Her zaman doğru ortamda olduğunuzdan emin olun
- **Domain değişiklikleri erişimi etkileyebilir**: Domain yapılandırmalarını dikkatli yapın
- **Log'lar hassas veri içerebilir**: Log'ları paylaşırken dikkatli olun

### 🚫 Hariç Tutulan İşlemler

Aşağıdaki işlemler kasıtlı olarak desteklenmez:
- Proje silme
- Servis silme
- Ortam silme
- Kalıcı verileri silme
- Faturalama değişiklikleri

---

## Sorun Giderme

### Yaygın Sorunlar ve Çözümler

#### 1. "Railway CLI not found" Hatası

**Sorun**: Railway CLI kurulu değil.

**Çözüm**:
```bash
# npm ile kur
npm i -g @railway/cli

# veya Homebrew ile (macOS)
brew install railway

# Kurulumu doğrula
railway --version
```

#### 2. "Not logged in" Hatası

**Sorun**: Railway CLI kimlik doğrulaması yapılmamış.

**Çözüm**:
```bash
# Giriş yap
railway login

# Tarayıcıda açılan sayfada Railway hesabınıza giriş yapın
# Kimlik doğrulamasını kontrol et
railway whoami
```

#### 3. "No project linked" Hatası

**Sorun**: Mevcut dizin bir Railway projesine bağlı değil.

**Çözüm**:
```bash
# Mevcut projeleri listele
railway list

# Bir projeye bağlan
railway link

# veya Claude Code'da
"Bu dizini [proje-adı] projesine bağla"
```

#### 4. "Service not found" Hatası

**Sorun**: Belirtilen servis bulunamıyor.

**Çözüm**:
```bash
# Servisleri listele
railway status

# veya Claude Code'da
"Bu projedeki servisleri listele"
```

#### 5. MCP Server Başlamıyor

**Sorun**: Claude Code, Railway MCP Server'a bağlanamıyor.

**Çözüm**:
```bash
# MCP yapılandırmasını kontrol edin
claude mcp list

# Railway MCP Server'ı yeniden ekleyin
claude mcp remove Railway
claude mcp add Railway npx @railway/mcp-server

# Claude Code'u yeniden başlatın
```

#### 6. Deploy Başarısız Oluyor

**Sorun**: Deploy sırasında hatalar oluşuyor.

**Kontrol edilecekler**:
- Railway hesabınızda kredi var mı?
- Doğru ortama deploy ediyor musunuz?
- Gerekli environment variable'lar ayarlı mı?
- Build hatası var mı?

**Çözüm**:
```
# Claude Code'da
"Son deploy loglarını göster"
"Bu servisin build hatalarını incele"
```

### Debug Modu

Railway CLI'yi debug modunda çalıştırmak için:

```bash
# Environment variable ayarlayın
export RAILWAY_DEBUG=1

# Sonra Claude Code'u başlatın
claude
```

Bu, daha detaylı log çıktıları sağlar.

---

## Gelişmiş Kullanım Senaryoları

### Monorepo Yapısı

Monorepo'da her servis için ayrı deploy:

```
"Bu monorepo'da:
1. /apps/frontend dizinini web servisi olarak deploy et
2. /apps/backend dizinini api servisi olarak deploy et  
3. Her ikisi için de ayrı domain'ler oluştur
4. Ortam değişkenlerini ayarla"
```

### CI/CD Entegrasyonu

GitHub Actions ile Railway deploy:

```
"Railway deploy işlemini GitHub Actions workflow'una ekle.
Her main branch push'unda otomatik deploy olsun."
```

### Mikroservis Mimarisi

Birden fazla servisi koordine etme:

```
"Bu mikroservis projesini deploy et:
1. Auth servisi
2. User servisi  
3. Notification servisi
4. Hepsi için PostgreSQL veritabanı
5. Redis cache
6. Servisleri birbirine bağla"
```

---

## Faydalı Bağlantılar

- 📚 [Railway Resmi Dokümantasyonu](https://docs.railway.com)
- 🐙 [Railway MCP Server GitHub](https://github.com/railwayapp/railway-mcp-server)
- 🌐 [Model Context Protocol](https://modelcontextprotocol.org)
- 💬 [Railway Community (Central Station)](https://station.railway.com)
- 🚂 [Railway Template Library](https://railway.com/templates)

---

## Geri Bildirim

Railway MCP Server devam eden bir çalışmadır. Özellik istekleri için [Central Station feedback](https://station.railway.com/feedback/model-context-protocol-for-railway-railw-c040b796) sayfasını ziyaret edebilirsiniz.

---

## Sonuç

Railway MCP Server ile Claude Code, Railway altyapınızı yönetmek için güçlü bir kombinasyon oluşturur. Doğal dil kullanarak:

✅ Hızlıca proje oluşturabilir ve deploy edebilirsiniz
✅ Environment'ları kolayca yönetebilirsiniz  
✅ Karmaşık iş akışlarını otomatikleştirebilirsiniz
✅ Log'ları ve izleme işlemlerini basitleştirebilirsiniz

**Unutmayın**: Bu deneysel bir araçtır, her işlemi dikkatle gözden geçirin!

---

*Son güncelleme: Ocak 2025*
*Railway MCP Server Versiyonu: Experimental*