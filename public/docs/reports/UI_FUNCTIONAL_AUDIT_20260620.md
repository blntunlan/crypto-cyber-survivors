# UI Functional Audit 2026-06-20

> **Status** live
> Owner: Product / Frontend
> Scope: Visible pages and overlays with controls that appear functional but are disabled, placeholder-only, mock-backed, or not wired to the runtime.

## Audit Method

- Static route inventory from `App.tsx`, `components/GameScreenRouter.tsx`, and page components.
- Functional checks for visible buttons, tabs, selectors, panels, service calls, mock fallbacks, and missing render paths.
- Documentation check: `npm run docs:check` passed with `missingDocs: 0`, `missingPublicDocs: 0`, and `publicMismatch: false`.
- React scan: `npx -y react-doctor@latest . --verbose --diff` returned score `49/100`; findings were mostly existing `components/admin/AdminDashboard.tsx` accessibility/performance issues plus `vitest@4.0.16` security warning.
- No runtime browser crawl was performed in this pass; this is a code-backed functional audit baseline.

## Severity

| Level | Meaning | Action |
|---|---|---|
| P0 | User clicks a visible control and nothing meaningful happens | Fix or hide before beta |
| P1 | Feature exists but key data or business behavior is missing | Implement or label as unavailable |
| P2 | Feature works partially but can mislead users | Add status, fallback, or copy guard |
| P3 | Minor UX, keyboard, or dev-only completeness issue | Schedule after core flow |

## Page Inventory

| Surface | Entry | Current Status | Notes |
|---|---|---|---|
| Landing | `showLanding` in `App.tsx` | Partial | Main CTA, docs, privacy, terms work; social links are placeholders |
| Docs | `/docs`, `#docs`, docs nav | Partial | Navigation is valid; share button is visual-only |
| Legal | `/privacy`, `/terms` | Mostly functional | Navigation works; copy references unsupported social auth |
| Nickname | `NicknameEntryScreen` | Functional | Local mode uses local-only identity |
| Hub | `hubScreen === 'hub'` | Partial | Three main tiles are disabled and have no routed pages |
| Profile Modal | Hub avatar click | Partial | Stats and achievements are mostly empty or static |
| Play Setup | `hubScreen === 'play'` | Mostly functional | Start flow works; challenge constraints are not enforced |
| Upgrades | Feature overlay `upgrades` | Partial | UI exists; server state initialize is not called |
| Challenges | Feature overlay `challenges` | Partial | Activation is memory-only; constraints are not enforced at run start |
| Replays | Feature overlay `replays` | P0 gap | List can load, but Watch only logs |
| Ranks | `hubScreen === 'ranks'` | Partial | API-backed but silently falls back to mock data |
| Settings | `SettingsPanel` | Partial | Theme switch is disabled; mixer keyboard focus misses two categories |
| Game Overlays | Pause, LevelUp, GameOver, CycleComplete, Disconnect | Mostly functional | Core handlers are wired |
| Dev/Admin | Ctrl+Shift shortcuts, Darwin, VFX Lab | Partial | VFX and Darwin render; Admin/Analytics shortcut state is discarded |

## Landing Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Discord button is visible but only opens `alert('Discord link coming soon!')` | `components/screens/landing/LandingFooter.tsx:39`, `components/screens/landing/LandingFooter.tsx:43` | Replace with real URL or hide until available |
| P1 | Twitter/X button is visible but only opens `alert('Twitter/X link coming soon!')` | `components/screens/landing/LandingFooter.tsx:56`, `components/screens/landing/LandingFooter.tsx:60` | Replace with real URL or hide until available |
| P2 | Legal copy references optional Twitter/X account while OAuth is unsupported | `components/screens/LegalModals.tsx:462`, `services/auth/RailwayAuthService.ts:335` | Update copy or ship social auth |
| P3 | Footer contact uses domain email without in-app support confirmation | `components/screens/landing/LandingFooter.tsx:97` | Confirm mailbox or route to support form |

## Docs Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Share icon is rendered as a button with no `onClick` | `components/screens/DocScreen.tsx:560`, `components/screens/DocScreen.tsx:563` | Implement copy URL/share behavior or remove button |
| P2 | Missing document fallback says content will be available soon, but nav validation currently has zero missing links | `components/screens/DocScreen.tsx:63`, `npm run docs:check` result | Keep fallback, but do not use it to mask broken links |
| OK | Sidebar links and public mirror are currently consistent | `docs/navigation.json`, `public/docs/navigation.json` | Keep `npm run docs:check` in audit loop |

## Nickname Entry

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| OK | Nickname form validates and calls `login(nickname)` | `components/screens/NicknameEntryScreen.tsx:167`, `components/screens/NicknameEntryScreen.tsx:386` | Keep |
| P2 | Local/dev login stores a fixed local profile id, which can make downstream profile API screens fail or merge local users | `contexts/UserContext.tsx:43`, `contexts/UserContext.tsx:201` | Use a stable generated local profile id per browser profile |
| P2 | App init comment says auth check is intentionally disabled, while `UserProvider` owns auth restore separately | `hooks/useAppInitialization.ts:8`, `contexts/UserContext.tsx:115` | Clarify architecture in code comments and docs |

## Hub Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P0 | `STASH` tile is visible but disabled | `components/hub/useHubButtons.tsx:61`, `components/hub/useHubButtons.tsx:76` | Build inventory page or hide the tile |
| P0 | `LOOT` tile is visible but disabled | `components/hub/useHubButtons.tsx:79`, `components/hub/useHubButtons.tsx:96` | Build lootbox page or hide the tile |
| P0 | `SKINS` tile is visible but disabled | `components/hub/useHubButtons.tsx:99`, `components/hub/useHubButtons.tsx:113` | Build skin selector or hide the tile |
| P0 | Router only renders `hub`, `play`, and `ranks`; no `stash`, `loot`, or `skins` screens exist | `components/GameScreenRouter.tsx:254`, `components/GameScreenRouter.tsx:287`, `components/GameScreenRouter.tsx:324` | Add routed screens before enabling tiles |
| P2 | Hub card crypto balances are hardcoded to zero | `components/hub/HubMenu.tsx:255`, `components/hub/HubMenuV2.tsx:243` | Connect wallet/token balance source or remove crypto balance display |
| P2 | Classic hub count state reads lootbox/inventory counts once on mount | `components/hub/HubMenu.tsx:63`, `components/hub/HubMenu.tsx:64` | Subscribe to inventory/lootbox events or refresh on focus |

## Profile Modal

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Achievements tab is structurally present but achievement service returns empty arrays | `services/gameplay/AchievementService.ts:19`, `services/gameplay/AchievementService.ts:33`, `components/hub/PlayerProfile.tsx:629` | Add Railway achievement endpoints or mark tab unavailable |
| P1 | Stats tab mostly shows defaults; only wallet balance is fetched | `services/auth/ProfileStatsService.ts:79`, `services/auth/ProfileStatsService.ts:99` | Fetch gameplay aggregate stats from backend |
| P2 | Overview can show zero totals for real users when stats endpoint is missing | `services/auth/ProfileStatsService.ts:81`, `services/auth/ProfileStatsService.ts:83` | Show “not tracked yet” state separately from zero |
| P2 | “Combat Analytics top 15%” is static copy, not calculated | `components/hub/PlayerProfile.tsx:618`, `components/hub/PlayerProfile.tsx:621` | Replace with real percentile or remove claim |
| P2 | Profile settings only supports display name update; avatar/provider/email are read-only or unsupported | `components/settings/ProfileSettings.tsx:226`, `services/auth/RailwayAuthService.ts:321`, `services/auth/RailwayAuthService.ts:335` | Scope UI copy to display name or add provider/avatar features |
| P2 | Local nickname user can fail profile load because `ProfileStatsService` treats fixed UUID as non-guest and requires Railway profile | `services/auth/ProfileStatsService.ts:27`, `services/auth/ProfileStatsService.ts:37`, `contexts/UserContext.tsx:43` | Treat local-only profile id as guest/local profile in profile service |

## Play Setup Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| OK | Pair, mode, leverage, long, and short controls are wired to start flow | `components/screens/MainMenu.tsx:289`, `components/screens/MainMenu.tsx:489`, `components/screens/MainMenu.tsx:517` | Keep |
| P1 | Challenge constraints are defined but never checked in `startGame` | `services/challenges/ChallengeService.ts:68`, `components/GameAppShell.tsx:247`, `components/GameAppShell.tsx:329` | Call `ChallengeService.validateConstraints` before starting a challenge run |
| P2 | Feature buttons only live on Play setup, not Hub tiles | `components/screens/MainMenu.tsx:558`, `components/GameScreenRouter.tsx:287` | Decide whether Upgrades/Challenges/Replays belong in Hub main navigation |

## Meta Upgrades Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Server meta state fetch exists but is not called anywhere in app code | `services/progression/MetaProgressionService.ts:35`, search result only shows service definition | Call `MetaProgressionService.initialize()` after identity restore |
| P1 | Purchase failure only logs warning; UI gives no error feedback | `services/progression/MetaProgressionService.ts:58`, `components/screens/MetaUpgradeScreen.tsx:77`, `components/screens/MetaUpgradeScreen.tsx:364` | Return purchase result to screen and show success/error toast |
| OK | Purchased bonuses are partially wired into run start and level-up choices | `components/GameAppShell.tsx:258`, `hooks/useGameFlowController.ts:124`, `services/progression/MetaProgressionService.ts:161` | Keep, then cover with integration tests |
| P2 | Store persists local meta state, but server authority can drift because initialize is missing | `stores/metaProgressionStore.ts:62`, `services/progression/MetaProgressionService.ts:38` | Server sync on app launch and after purchase |

## Challenges Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Activate stores active challenge only in memory | `components/screens/ChallengeScreen.tsx:181`, `services/challenges/ChallengeService.ts:51` | Persist active challenge per profile/session |
| P1 | Position/leverage constraints display but are not enforced at run start | `components/screens/ChallengeScreen.tsx:90`, `services/challenges/ChallengeService.ts:68`, `components/GameAppShell.tsx:247` | Block invalid start with a visible message |
| P2 | Fetch failures collapse to empty state, making backend failure indistinguishable from no challenge | `services/challenges/ChallengeService.ts:25`, `services/challenges/ChallengeService.ts:34`, `components/screens/ChallengeScreen.tsx:225` | Show explicit load error and retry |
| OK | Objective HUD is wired once a challenge is active | `components/hud/ChallengeProgressHUD.tsx:14`, `components/GameHUD.tsx:124` | Keep |

## Replay Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P0 | Watch button only closes overlay and logs the replay id | `App.tsx:484`, `App.tsx:486` | Call `ReplayPlayerService.loadReplayFromServer` and enter playback UI |
| P0 | Replay player service and `ReplayOverlay` exist but are not mounted by app routing | `services/replay/ReplayPlayerService.ts:24`, `components/hud/ReplayOverlay.tsx:13`, `rg ReplayOverlay` result | Add replay mode state and render overlay/canvas playback |
| P1 | Fetch errors return an empty list with no error state | `services/replay/ReplayPlayerService.ts:101`, `services/replay/ReplayPlayerService.ts:108`, `components/screens/ReplayListScreen.tsx:66` | Show backend error and retry |
| OK | Replay recording starts at run start and saves after verified submission | `components/GameAppShell.tsx:330`, `hooks/useGameFlowController.ts:286`, `services/replay/ReplayRecorderService.ts:96` | Keep |

## Ranks Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Leaderboard silently falls back to mock player data when API is empty or fails | `services/leaderboard/LeaderboardService.ts:64`, `services/leaderboard/LeaderboardService.ts:238`, `services/leaderboard/LeaderboardService.ts:279` | Label demo data clearly or show empty/error state in production |
| P2 | Current player highlight is impossible in mock fallback | `services/leaderboard/LeaderboardService.ts:315` | Add current player row from backend or mark mock as sample |
| OK | Sort tabs and refresh button call the leaderboard service | `components/screens/LeaderboardScreen.tsx:361`, `components/screens/LeaderboardScreen.tsx:672` | Keep |

## Settings Page

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | Theme panel is visible but Cyberpunk button is disabled and Retro button is commented out | `components/settings/ThemeSection.tsx:32`, `components/settings/ThemeSection.tsx:51`, `components/settings/ThemeSection.tsx:72` | Hide theme section or finish retro theme |
| P1 | `toggleTheme` does nothing and `setTheme` always forces cyberpunk | `contexts/ThemeContext.tsx:99`, `contexts/ThemeContext.tsx:107` | Remove keyboard/theme affordance or implement real switching |
| P2 | Sound mixer renders eight categories, but keyboard navigation only covers six | `components/settings/SoundMixerSection.tsx:59`, `components/settings/SoundMixerSection.tsx:66`, `components/settings/SettingsPanel.tsx:77` | Set `mixerCount` from shared category list |
| P2 | Controls section is informational only; no key remapping exists | `components/settings/ControlsSection.tsx:2` | Rename to “Controls Reference” or implement remapping |
| OK | Audio, graphics, mobile controls, quality, language, reset, close, and replay tutorial actions are wired | `components/settings/AudioSection.tsx:26`, `components/settings/GraphicsSection.tsx:40`, `components/settings/MobileSection.tsx:54`, `components/settings/QualitySection.tsx:65`, `components/settings/LanguageSection.tsx:45` | Keep |

## Game Overlays

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| Pause Menu | OK | `components/screens/PauseMenu.tsx:212`, `components/screens/PauseMenu.tsx:225`, `components/screens/PauseMenu.tsx:250` | Resume, restart, menu, settings, mute are wired |
| Level Up | OK | `components/screens/LevelUpScreen/LevelUpScreen.tsx:71`, `components/screens/LevelUpScreen/LevelUpScreen.tsx:286` | Card select and competitive auto-select are wired |
| Game Over | OK | `components/screens/GameOverScreen.tsx:165`, `components/screens/GameOverScreen.tsx:230` | Details toggle and back-to-menu work |
| Cycle Complete | OK | `components/screens/CycleCompleteScreen.tsx:222`, `components/screens/CycleCompleteScreen.tsx:236` | Cash out and continue call shell handlers |
| Market Disconnected | OK | `components/screens/MarketDisconnectedScreen.tsx:88` | Exit terminal calls reset/menu handler |

## Dev And Admin Surfaces

| Severity | Finding | Evidence | Expected Fix |
|---|---|---|---|
| P1 | `Ctrl+Shift+A` and `Ctrl+Shift+D` update state, but `App.tsx` discards those states and never renders the dashboards | `hooks/useDevShortcuts.ts:37`, `hooks/useDevShortcuts.ts:51`, `App.tsx:306`, `App.tsx:307` | Render `AnalyticsDashboard` and `AdminDashboard` or remove shortcuts |
| OK | `Ctrl+Shift+V` VFX Lab is rendered in dev | `hooks/useDevShortcuts.ts:65`, `App.tsx:540` | Keep |
| OK | Darwin spectator mode renders via `?mode=darwin` in dev | `App.tsx:100`, `App.tsx:371` | Keep |
| P3 | React Doctor flags admin dashboard accessibility and performance issues, but dashboard is currently unreachable | `components/admin/AdminDashboard.tsx`, React Doctor output | Fix after deciding whether admin surface ships |

## Fix Queue

| Priority | Work Item | Target Files | Acceptance |
|---|---|---|---|
| P0 | Implement or hide Hub Stash/Loot/Skins | `components/hub/useHubButtons.tsx`, `components/GameScreenRouter.tsx` | No visible disabled primary tiles without roadmap label |
| P0 | Wire replay watch mode | `App.tsx`, `services/replay/ReplayPlayerService.ts`, `components/hud/ReplayOverlay.tsx` | Clicking Watch loads replay and shows playback controls |
| P1 | Replace profile empty data | `services/auth/ProfileStatsService.ts`, `services/gameplay/AchievementService.ts`, `components/hub/PlayerProfile.tsx` | Profile stats and achievements show real backend data or explicit unavailable states |
| P1 | Sync meta progression state | `components/GameAppShell.tsx`, `services/progression/MetaProgressionService.ts` | Meta balance/upgrades load from server and purchases show result feedback |
| P1 | Enforce challenge constraints | `components/GameAppShell.tsx`, `services/challenges/ChallengeService.ts` | Invalid challenge run starts are blocked with clear message |
| P1 | Render or remove admin shortcuts | `App.tsx`, `hooks/useDevShortcuts.ts` | Ctrl+Shift shortcuts either open panels or are not advertised |
| P2 | Label mock leaderboard data | `services/leaderboard/LeaderboardService.ts`, `components/screens/LeaderboardScreen.tsx` | Users can distinguish demo data from live rankings |
| P2 | Fix placeholder secondary actions | `components/screens/landing/LandingFooter.tsx`, `components/screens/DocScreen.tsx`, `components/settings/ThemeSection.tsx` | No visible social/share/theme controls are placeholder-only |

## Next Audit Pass

- Run app locally and click through each surface with seeded Railway/local fixtures.
- Add Playwright smoke coverage for Hub tiles, Replay watch, Profile tabs, Challenge activation, Meta purchase feedback, Docs share, and Settings keyboard navigation.
- Convert confirmed gaps into GitHub issues or a beta readiness checklist with owners.
