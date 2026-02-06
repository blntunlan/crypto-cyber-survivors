const fs = require('fs');
const path = require('path');

const localesPath = 'd:/crypto-cyber-survivors/public/locales';
const en = JSON.parse(fs.readFileSync(path.join(localesPath, 'en/common.json'), 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], fullName));
    } else {
      keys.push(fullName);
    }
  }
  return keys;
}

const enKeys = getKeys(en);

const dirs = fs.readdirSync(localesPath).filter(d => d !== 'en' && fs.statSync(path.join(localesPath, d)).isDirectory());

dirs.forEach(lang => {
  const filePath = path.join(localesPath, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const langKeys = getKeys(data);
    const missing = enKeys.filter(k => !langKeys.includes(k));
    console.log(`--- Language: ${lang} ---`);
    if (missing.length > 0) {
      missing.forEach(m => console.log(m));
    } else {
      console.log('None');
    }
  }
});
