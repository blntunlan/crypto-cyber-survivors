import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function run(mode = 'desktop') {
  console.log('Starting Lighthouse audit in ' + mode + ' mode...');
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });

  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    formFactor: mode === 'desktop' ? 'desktop' : 'mobile',
    screenEmulation: mode === 'desktop' ? {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    } : {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },
    throttling: mode === 'desktop' ? {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    } : undefined,
  };

  try {
    const runnerResult = await lighthouse('http://127.0.0.1:4173/', options);
    const reportJson = runnerResult.report;
    const outputPath = 'output/lh-' + mode + '.json';
    fs.writeFileSync(outputPath, reportJson);

    const lhr = runnerResult.lhr;
    console.log('\n=== LIGHTHOUSE SCORES (' + mode.toUpperCase() + ') ===');
    Object.keys(lhr.categories).forEach(c => {
      console.log(lhr.categories[c].title + ': ' + Math.round(lhr.categories[c].score * 100) + '/100');
    });

    console.log('\n=== METRICS (' + mode.toUpperCase() + ') ===');
    const perfRefs = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'];
    perfRefs.forEach(id => {
      const a = lhr.audits[id];
      if (a) {
        console.log(a.title + ': ' + a.displayValue + ' (score: ' + a.score + ')');
      }
    });
  } finally {
    await chrome.kill();
  }
}

const targetMode = process.argv[2] || 'desktop';
run(targetMode).catch(err => {
  console.error('Lighthouse runner failed:', err);
  process.exit(1);
});
