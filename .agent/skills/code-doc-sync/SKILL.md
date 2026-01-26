---
name: code-doc-sync
description: Sync code changes with README, GEMINI.md, and technical documentation
---

# Documentation Sync Skill

Kod değişikliklerini projenin ana dokümantasyon dosyalarıyla (README, GEMINI.md) senkronize tut.

## Usage

```
/code-doc-sync [scope]
```

**Scopes**: `architecture`, `features`, `standard`, `dependencies`.

## Core Files to Sync

1. **`GEMINI.md`**: Claude/Agent bağlam dosyası. Yeni bir servis veya kural eklendiğinde güncellenmeli.
2. **`README.md`**: Proje özeti, kurulum ve özellik listesi.
3. **`docs/`**: Feature-specific markdown dosyaları.
4. **`package.json`**: Dependency listesi güncellendiğinde README'de belirtilmeli.

## Sync Trigger Events

- **Yeni Servis**: `GEMINI.md` içindeki "Proje Yapısı" ve "Servis Mimarisi" bölümlerine ekle.
- **Yeni Feature**: `README.md` "Özellikler" listesini güncelle.
- **Zorunlu Kural**: `GEMINI.md` "Kodlama Standartları" kısmına yeni kuralı ekle.
- **Refactor**: Klasör yapısı değiştiyse dokümantasyondaki ağaç yapısını (`tree`) güncelle.

## Guidelines

- **Style**: Dokümanlarda her zaman teknik ama anlaşılır bir dil kullan.
- **ASCII Art**: Klasör yapılarını `tree` formatında göster.
- **Badges**: Build status, test coverage ve tech stack badge'lerini güncel tut.
- **Links**: Doküman içi linklerin kırılmadığından emin ol.

## Checklist

- [ ] `GEMINI.md` en son state'i yansıtıyor mu?
- [ ] `README.md` içinde kurulum komutları hala geçerli mi?
- [ ] Yeni eklenen skill'ler veya workflow'lar dokümante edildi mi?
- [ ] TypeScript tip tanımları (`types.ts`) ile dokümanlardaki örnekler uyumlu mu?

## Automation Tips

```bash
# Proje yapısını README için kopyala
tree /F /A | clip
```

Bu skill, `/quick-commit` öncesinde dokümantasyonun unutulmadığını doğrulamak için mükemmeldir.
