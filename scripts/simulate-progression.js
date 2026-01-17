/**
 * Progression Simulation Script
 * Testing the new ExperienceService logic.
 */

const CONFIG = {
  BASE_EXP: 100,
  CURVE_EXPONENT: 1.5,
  LINEAR_STEP: 500,
  PLATEAU_LEVEL: 25,
};

function getRequiredExp(level) {
  if (level < CONFIG.PLATEAU_LEVEL) {
    return Math.floor(CONFIG.BASE_EXP + Math.pow(level, CONFIG.CURVE_EXPONENT) * 40);
  } else {
    const plateauExp = Math.floor(
      CONFIG.BASE_EXP + Math.pow(CONFIG.PLATEAU_LEVEL - 1, CONFIG.CURVE_EXPONENT) * 40
    );
    const levelsOverPlateau = level - (CONFIG.PLATEAU_LEVEL - 1);
    return plateauExp + levelsOverPlateau * CONFIG.LINEAR_STEP;
  }
}

function runSimulation() {
  console.log('--- HYBRID PROGRESSION MODEL SIMULATION ---');
  console.log('Description: Power curve up to Level 25, then Linear +500/level.');
  console.log('-------------------------------------------');

  let totalGems = 0;
  for (let i = 1; i <= 50; i++) {
    const nextLevelExp = getRequiredExp(i);
    const gemsNeeded = Math.ceil(nextLevelExp / 10); // 10 exp per normal gem
    totalGems += gemsNeeded;

    let marker = '';
    if (i === CONFIG.PLATEAU_LEVEL - 1) marker = ' [PLATEAU START]';
    if (i === CONFIG.PLATEAU_LEVEL) marker = ' [LINEAR PHASE]';

    console.log(
      `Level ${String(i).padStart(2, ' ')} -> ${String(i + 1).padStart(2, ' ')}: ${String(Math.round(nextLevelExp)).padStart(5, ' ')} EXP (~${String(gemsNeeded).padStart(4, ' ')} gems)${marker}`
    );

    if (i % 10 === 0) {
      console.log(`-- Stats: Cumulative gems needed for Lvl ${i}: ${totalGems}`);
    }
  }
}

runSimulation();
