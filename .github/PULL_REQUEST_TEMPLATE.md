## 📋 Description
Provide a brief summary of the changes and the motivation behind them.

Fixes # (issue)

## 🧪 Type of Change
- [ ] 🧯 Stabilization (broken gate, contract mismatch, lifecycle leak)
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] ♻️ Refactor (architecture boundary move without feature behavior change)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] ⚡ Performance optimization
- [ ] 📝 Documentation update
- [ ] 🎨 UI/UX refinement

## 🧭 Work Mode Discipline
- [ ] This PR uses exactly one primary mode: Stabilization, Feature Slice, or Refactor
- [ ] Feature work does not include opportunistic architecture rewrites
- [ ] Refactor work does not include player-visible behavior changes
- [ ] Session gameplay state is not introduced as a new global singleton

## 🛠️ How Has This Been Tested?
Please describe the tests that you ran to verify your changes. Include details of your testing environment and the tests you ran.

- [ ] Baseline (`npm run check:baseline`)
- [ ] Unit Tests (`npm run test`)
- [ ] E2E Tests (`npm run test:e2e`)
- [ ] Manual testing (please describe)

## 📸 Screenshots (if applicable)
Add screenshots to help explain your changes.

## 🏁 Checklist:
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing baseline gates pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## 🎨 Production UI Review
- [ ] Each surface has one primary CTA and deliberate visual hierarchy
- [ ] Modern and retro preserve the same structure and interaction behavior
- [ ] Mobile layout, 44px touch targets and visible keyboard focus are verified
- [ ] Reduced-motion behavior is verified where motion is present
- [ ] No raw interactive element, direct theme branch or visual primitive override bypasses `check:ui-contract`
