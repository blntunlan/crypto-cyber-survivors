---
description: Stage 3 - Release, Tagging & Future Promotion
---

# 🚀 Stage 3: Beta Release & Tagging

Final step to push the Beta Release to the world.

## 📦 Deployment Actions

### 1. Version Bump
Update `package.json` version to `1.0.0-beta.1`.

### 2. Git Tagging
Tag the current commit on the `beta` branch.
```bash
git checkout beta
git tag -a v1.0.0-beta.1 -m "Official Beta Release 1"
git push origin v1.0.0-beta.1
```

### 3. Deploy to Railway (Beta/Production)
```bash
npm run railway:deploy
```

### 4. Promotion Policy
From now on:
1. All new features go to `develop`.
2. Stabilized `develop` is merged into `beta` via Pull Request after running Stage 1 & 2.
3. Successful `beta` (after user feedback) is merged into `main`.

---
🎉 **Beta Release Complete!**
