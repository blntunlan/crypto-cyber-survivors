# Codebase Stabilization Analysis
Matched Files: 621
Date: 2026-02-10T11:53:51.541Z

## STYLE
### components\admin\AdminDashboard.tsx
- ⚠️ **Line 853**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### components\admin\EvolutionViewer.tsx
- ⚠️ **Line 55**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### components\DebugPanel.tsx
- ⚠️ **Line 196**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### components\screens\DocScreen.tsx
- ⚠️ **Line 34**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 64**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### components\screens\LevelUpScreen\LevelUpErrorBoundary.tsx
- ⚠️ **Line 24**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### contexts\LanguageProvider.tsx
- ⚠️ **Line 38**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### contexts\ThemeContext.tsx
- ℹ️ **Line 63**: Trace: // TODO: Retro theme temporarily disabled - always start with cyberpunk
- ℹ️ **Line 89**: Trace: // TODO: Retro theme temporarily disabled - always use cyberpunk

### e2e\a11y\accessibility.spec.ts
- ⚠️ **Line 29**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 81**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\cycle-complete.spec.ts
- ⚠️ **Line 31**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 33**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 36**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 46**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 48**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 50**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 60**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 64**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 73**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 81**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 86**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 88**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### e2e\difficulty-waves.spec.ts
- ⚠️ **Line 14**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 46**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 56**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 61**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 66**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 78**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\game-flow.spec.ts
- ⚠️ **Line 110**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\level-up.spec.ts
- ⚠️ **Line 6**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 45**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\menu-interactions.spec.ts
- ⚠️ **Line 149**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\mobile-touch-controls.spec.ts
- ⚠️ **Line 121**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 247**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 248**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 323**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 408**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 534**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\network-error.spec.ts
- ⚠️ **Line 50**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 87**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 97**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 112**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 149**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 205**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 212**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\offline.spec.ts
- ⚠️ **Line 42**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 60**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\performance\fps.spec.ts
- ⚠️ **Line 6**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 101**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 114**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 182**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\performance\memory-leak.spec.ts
- ⚠️ **Line 51**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 60**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 103**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 113**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 122**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\stability\chaos.spec.ts
- ⚠️ **Line 11**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 46**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 89**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### e2e\visual.spec.ts
- ⚠️ **Line 40**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 53**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 70**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 92**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 109**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 123**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 143**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 159**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 172**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### hooks\useMenuNav.ts
- ℹ️ **Line 52**: Trace: // TODO: Add distinct navigation sound, reusing button click for now but quieter if possible?

### schemas\marketSchemas.ts
- ⚠️ **Line 347**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.

### scripts\benchmark-spatial-grid.ts
- ⚠️ **Line 108**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 109**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 110**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 111**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 112**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 115**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 116**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 123**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 126**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 129**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 130**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 131**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 132**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 133**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 134**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 135**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 136**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 139**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 140**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 141**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### scripts\fetch_training_data.ts
- ⚠️ **Line 16**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 27**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 32**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 53**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### scripts\simulate_balancing.ts
- ⚠️ **Line 84**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 85**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 86**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 106**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 109**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 210**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### scripts\supabase-audit.ts
- ⚠️ **Line 114**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 115**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 116**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 117**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 119**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 124**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 588**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 589**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 590**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 658**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 661**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 662**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 668**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 673**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 720**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### scripts\ui-consistency-audit.ts
- ⚠️ **Line 377**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 378**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 429**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 431**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 437**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 438**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 439**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 442**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 443**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 447**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 450**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 451**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 464**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 468**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 472**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 474**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 479**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 485**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 486**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 489**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 491**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 493**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 495**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 498**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 499**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 500**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 501**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 502**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 503**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### services\analytics\DeviceProfiler.ts
- ⚠️ **Line 102**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.

### services\core\GameStateMachine.ts
- ⚠️ **Line 74**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 163**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.

### services\core\SupabaseUtils.ts
- ⚠️ **Line 87**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### services\difficulty\BrainLoader.ts
- ⚠️ **Line 23**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 49**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.

### services\system\CheatManager.ts
- ⚠️ **Line 86**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 263**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### services\system\DebugService.ts
- ⚠️ **Line 119**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 123**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 124**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 125**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 126**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 127**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 128**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 129**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### services\system\Logger.ts
- ⚠️ **Line 83**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 85**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 98**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 100**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 113**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 115**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 125**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 136**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 138**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 147**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### simulation\data\HistoricalDataLoader.ts
- ⚠️ **Line 251**: Direct 'console.warn' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 266**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 280**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### simulation\evolution\DirectorTrainer.ts
- ⚠️ **Line 198**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 199**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 200**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 201**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 238**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 270**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 271**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 272**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### simulation\evolution\GameMasterTrainer.ts
- ⚠️ **Line 472**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 473**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 474**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 475**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 476**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 514**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 528**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 557**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 558**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### simulation\evolution\RealDataTrainer.ts
- ⚠️ **Line 245**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 260**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 274**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 297**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### simulation\evolution\SimulationWorker.ts
- ⚠️ **Line 111**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### simulation\evolution\Trainer.ts
- ⚠️ **Line 41**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 43**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 47**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 48**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 49**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 59**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 76**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 96**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 102**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 103**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 106**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 111**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 113**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 124**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 173**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 213**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### supabase\functions\verify-game\index.ts
- ⚠️ **Line 133**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### supabase\functions\verify-replay\index.ts
- ⚠️ **Line 273**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 499**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### tests\CardSystem.test.ts
- ⚠️ **Line 173**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### tests\DifficultySimulation.ts
- ⚠️ **Line 69**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 70**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 77**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 91**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 99**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### tests\PerformanceBenchmark.test.ts
- ⚠️ **Line 57**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 80**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 90**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 116**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

### tests\screens\CycleCompleteScreen.test.tsx
- ℹ️ **Line 138**: Trace: // TODO: Fix mock setup for icons. These fail because CardIcons mock isn't rendering as expected in test env.

### tests\screens\SettingsPanelFull.test.tsx
- ℹ️ **Line 230**: Trace: // TODO: Retro theme temporarily disabled - this test is skipped

### tests\services\analytics\ErrorTracker.test.ts
- ⚠️ **Line 160**: Direct 'console.error' usage. Use the Logger service or EventBus tracing.

### tests\YoyoAnalysis.test.ts
- ⚠️ **Line 14**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 15**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 16**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 24**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 46**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 57**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.
- ⚠️ **Line 62**: Direct 'console.log' usage. Use the Logger service or EventBus tracing.

## ARCHITECTURE
### services\analytics\DeviceProfiler.ts
- 🔴 **Line 16**: Service class 'DeviceProfiler' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\analytics\ErrorQueue.ts
- 🔴 **Line 19**: Service class 'ErrorQueue' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\analytics\PerformanceTracker.ts
- 🔴 **Line 39**: Service class 'CircularBuffer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\audio\AudioService.ts
- 🔴 **Line 30**: Service class 'AudioService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\audio\HowlerManager.ts
- 🔴 **Line 13**: Service class 'HowlerManager' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\audio\SynthEngine.ts
- 🔴 **Line 28**: Service class 'SynthEngine' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\auth\GameSessionService.ts
- 🔴 **Line 22**: Service class 'GameSessionService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\auth\NicknameValidator.ts
- 🔴 **Line 9**: Service class 'NicknameValidator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\auth\PlayerIdentityService.ts
- 🔴 **Line 11**: Service class 'PlayerIdentityService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\auth\SecurityUtils.ts
- 🔴 **Line 5**: Service class 'SecurityUtils' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\auth\UserPersistenceService.ts
- 🔴 **Line 17**: Service class 'UserPersistenceService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\combat\physics\CollectionSystem.ts
- 🔴 **Line 22**: Service class 'CollectionSystem' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\combat\physics\CombatResolutionService.ts
- 🔴 **Line 23**: Service class 'CombatResolutionService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\combat\physics\MovementSystem.ts
- 🔴 **Line 22**: Service class 'MovementSystem' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\combat\PoolManager.ts
- 🔴 **Line 24**: Service class 'ObjectPool' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\combat\SpatialGrid.ts
- 🔴 **Line 21**: Service class 'SpatialGrid' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\EngineRegistry.ts
- 🔴 **Line 11**: Service class 'EngineRegistryClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\metrics\MetricsAnalyzer.ts
- 🔴 **Line 21**: Service class 'MetricsAnalyzer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\metrics\MetricsCompiler.ts
- 🔴 **Line 43**: Service class 'MetricsCompiler' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\metrics\MetricsExporter.ts
- 🔴 **Line 11**: Service class 'MetricsExporter' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\metrics\MetricsStorage.ts
- 🔴 **Line 31**: Service class 'MetricsStorage' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\core\SupabaseUtils.ts
- 🔴 **Line 9**: Service class 'SupabaseUtils' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\gameplay\CoinService.ts
- 🔴 **Line 113**: Service class 'CoinCalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).
- 🔴 **Line 182**: Service class 'MockCoinProvider' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).
- 🔴 **Line 239**: Service class 'CoinServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\gameplay\ExperienceService.ts
- 🔴 **Line 8**: Service class 'ExperienceService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\gameplay\StatService.ts
- 🔴 **Line 13**: Service class 'StatService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\gameplay\SupabaseCoinProvider.ts
- 🔴 **Line 13**: Service class 'SupabaseCoinProvider' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\indicators\ATRCalculator.ts
- 🔴 **Line 10**: Service class 'ATRCalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\indicators\MACDCalculator.ts
- 🔴 **Line 32**: Service class 'MACDCalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\indicators\RSICalculator.ts
- 🔴 **Line 28**: Service class 'RSICalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\indicators\VolumeAnalyzer.ts
- 🔴 **Line 49**: Service class 'VolumeAnalyzer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\inventory\InventoryService.ts
- 🔴 **Line 32**: Service class 'InventoryServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\lootbox\LootboxDropCalculator.ts
- 🔴 **Line 19**: Service class 'LootboxDropCalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\lootbox\LootboxService.ts
- 🔴 **Line 25**: Service class 'LootboxServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\market\MarketCalculator.ts
- 🔴 **Line 54**: Service class 'MarketCalculator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\market\MarketService.ts
- 🔴 **Line 76**: Service class 'MarketService' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\buffs\BerserkDecorator.ts
- 🔴 **Line 10**: Service class 'BerserkDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\buffs\DiamondHandsDecorator.ts
- 🔴 **Line 10**: Service class 'DiamondHandsDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\buffs\LuckBoostDecorator.ts
- 🔴 **Line 10**: Service class 'LuckBoostDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\buffs\RageModeDecorator.ts
- 🔴 **Line 10**: Service class 'RageModeDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\debuffs\LiquidatedDecorator.ts
- 🔴 **Line 10**: Service class 'LiquidatedDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\debuffs\SlowDecorator.ts
- 🔴 **Line 11**: Service class 'SlowDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\debuffs\VulnerableDecorator.ts
- 🔴 **Line 10**: Service class 'VulnerableDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\debuffs\WeakenedDecorator.ts
- 🔴 **Line 10**: Service class 'WeakenedDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\patterns\decorators\PlayerStatsAdapter.ts
- 🔴 **Line 11**: Service class 'PlayerStatsAdapter' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\renderers\BackgroundRenderer.ts
- 🔴 **Line 18**: Service class 'BackgroundRenderer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\renderers\EffectRenderer.ts
- 🔴 **Line 23**: Service class 'EffectRenderer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\renderers\EntityRenderer.ts
- 🔴 **Line 27**: Service class 'EntityRenderer' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\spawners\SpeedLineSpawner.ts
- 🔴 **Line 5**: Service class 'SpeedLineSpawner' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\system\CloudflareService.ts
- 🔴 **Line 63**: Service class 'CloudflareServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\system\DeviceBenchmarkService.ts
- 🔴 **Line 29**: Service class 'DeviceBenchmarkServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\system\FPSMonitor.ts
- 🔴 **Line 22**: Service class 'FPSMonitorClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### services\system\ThemeService.ts
- 🔴 **Line 17**: Service class 'ThemeServiceClass' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### tests\services\MarketService.test.ts
- 🔴 **Line 16**: Service class 'MockWebSocket' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

### tests\services\patterns\decorators\BaseDecorator.test.ts
- 🔴 **Line 6**: Service class 'MockDecorator' does not appear to implement the Singleton pattern (missing static getInstance() or instance property).

## PERFORMANCE
### services\indicators\ATRCalculator.ts
- ⚠️ **Line 55**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.

### simulation\data\HistoricalDataLoader.ts
- ⚠️ **Line 64**: Array method '.map()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 65**: Array method '.map()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 71**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 72**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 127**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 157**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.
- ⚠️ **Line 158**: Array method '.reduce()' detected in critical loop. Prefer 'for' loops for performance.

