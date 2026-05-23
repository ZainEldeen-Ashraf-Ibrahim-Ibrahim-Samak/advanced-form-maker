import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const EN_JSON_PATH = path.join(SRC_DIR, 'messages', 'en.json');
const AR_JSON_PATH = path.join(SRC_DIR, 'messages', 'ar.json');

// Helper to find all files recursively
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
}

// 1. Helper to flatten JSON keys
function getFlatKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = [...keys, ...getFlatKeys(obj[key], `${prefix}${key}.`)];
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

// Check 1: Translation Keys match
function checkKeysParity() {
  console.log('--- 1. Checking Translation Keys Parity ---');
  if (!fs.existsSync(EN_JSON_PATH) || !fs.existsSync(AR_JSON_PATH)) {
    console.error('Translation files not found at expected paths.');
    return;
  }

  const en = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf-8'));
  const ar = JSON.parse(fs.readFileSync(AR_JSON_PATH, 'utf-8'));

  const enKeys = getFlatKeys(en);
  const arKeys = getFlatKeys(ar);

  const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
  const missingInEn = arKeys.filter((k) => !enKeys.includes(k));

  if (missingInAr.length === 0 && missingInEn.length === 0) {
    console.log('✅ Keys in en.json and ar.json match perfectly.');
  } else {
    if (missingInAr.length > 0) {
      console.log(`❌ Missing keys in ar.json: (${missingInAr.length} keys)`);
      missingInAr.slice(0, 10).forEach((k) => console.log(`  - ${k}`));
      if (missingInAr.length > 10) console.log(`  ... and ${missingInAr.length - 10} more.`);
    }
    if (missingInEn.length > 0) {
      console.log(`❌ Orphaned keys in ar.json (not in en.json): (${missingInEn.length} keys)`);
      missingInEn.slice(0, 10).forEach((k) => console.log(`  - ${k}`));
      if (missingInEn.length > 10) console.log(`  ... and ${missingInEn.length - 10} more.`);
    }
  }
}

// 2. Check for Hardcoded Text in React components and Arabic characters
function checkHardcodedText() {
  console.log('\n--- 2. Checking for Hardcoded Text in Components ---');
  
  // Find all .tsx and .ts files
  const allFiles = getAllFiles(SRC_DIR);
  const files = allFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

  let hardcodedCount = 0;
  let hardcodedArabicCount = 0;

  files.forEach((filePath) => {
    const file = path.relative(SRC_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Regex to match Arabic characters
    const arabicRegex = /[\u0600-\u06FF]+/g;

    // Simple Regex to match text inside JSX elements: >Text<
    // This is a naive approach but works for many hardcoded strings
    const jsxTextRegex = />([^<>{]+)</g;

    lines.forEach((line, index) => {
      // Skip commented out lines roughly
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        return;
      }

      // 1. Check for Hardcoded Arabic Characters (these should always be in i18n)
      if (arabicRegex.test(line)) {
        console.log(`❌ Hardcoded Arabic in ${file}:${index + 1}`);
        console.log(`   Line: ${line.trim()}`);
        hardcodedArabicCount++;
      }

      // 2. Check for Potential Hardcoded English in JSX
      let match;
      while ((match = jsxTextRegex.exec(line)) !== null) {
        const text = match[1].trim();
        // Ignore empty, pure numbers, or common punctuation/symbols
        if (text && /[a-zA-Z]/.test(text) && !/^[&;]+$/.test(text)) {
           // Filter out common TS generics or math logic
           if (
             line.includes('Promise') || 
             line.includes('VariantProps') || 
             line.includes('Record') || 
             line.includes('Omit') || 
             line.includes('Pick') || 
             line.includes('Array') || 
             /^=|>|<|&/.test(text) ||
             /^[A-Z][a-zA-Z]*$/.test(text) && !text.includes(' ') // Single PascalCase words are often TS types or component names in closing tags
           ) {
             continue;
           }
           // Ignore common single UI words that might just be icons or standard Next.js stuff
           if (['JSON / String'].includes(text)) {
             continue;
           }
           console.log(`⚠️  Potential hardcoded JSX text in ${file}:${index + 1} -> "${text}"`);
           hardcodedCount++;
        }
      }
    });
  });

  if (hardcodedArabicCount === 0) {
    console.log('✅ No hardcoded Arabic text found in .tsx files.');
  }
  if (hardcodedCount === 0) {
    console.log('✅ No obvious hardcoded English text found in JSX.');
  } else {
    console.log(`⚠️  Found ${hardcodedCount} potential hardcoded English strings in JSX. Please review them.`);
  }
}

// 3. Check for Unknown/Unsupported Characters (Not Latin, Not Arabic, Not Common Symbols)
function checkUnknownLanguages() {
  console.log('\n--- 3. Checking for Unknown Letter Languages/Characters ---');
  const files = [EN_JSON_PATH, AR_JSON_PATH];
  
  // This Regex looks for characters outside of Latin, Arabic, Numbers, and common punctuation
  // Ranges:
  // \u0000-\u007F (ASCII - Latin/English, Numbers, Punctuation)
  // \u0600-\u06FF (Arabic)
  // \u0750-\u077F (Arabic Supplement)
  // \u08A0-\u08FF (Arabic Extended-A)
  // \uFB50-\uFDFF (Arabic Presentation Forms-A)
  // \u2190-\u2193 (Arrows)
  // \u2713 (Checkmark)
  const unknownCharRegex = /[^\u0000-\u007F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200B-\u200F\u202A-\u202E\u2190-\u2193\u2713]/g;

  let foundUnknown = false;

  files.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(unknownCharRegex);
      if (match) {
        const uniqueChars = Array.from(new Set(match)).join('');
        // Filter out common symbols like curly quotes, dashes, ellipses which might exist but aren't letters
        const filterPunctuation = uniqueChars.replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u00A0\t]/g, '');
        if (filterPunctuation.length > 0) {
            console.log(`❌ Unknown/Foreign character(s) in ${path.basename(filePath)}:${index + 1}`);
            console.log(`   Characters: ${filterPunctuation}`);
            console.log(`   Line: ${line.trim()}`);
            foundUnknown = true;
        }
      }
    });
  });

  // Also check en.json for Arabic characters (en.json shouldn't contain Arabic)
  if (fs.existsSync(EN_JSON_PATH)) {
    const enContent = fs.readFileSync(EN_JSON_PATH, 'utf-8');
    const lines = enContent.split('\n');
    const arabicRegex = /[\u0600-\u06FF]+/g;
    lines.forEach((line, index) => {
      if (arabicRegex.test(line)) {
        console.log(`❌ Found Arabic text in English translation file (en.json) at line ${index + 1}`);
        console.log(`   Line: ${line.trim()}`);
        foundUnknown = true;
      }
    });
  }

  if (!foundUnknown) {
    console.log('✅ No unknown language characters found in translation files.');
    console.log('✅ No Arabic text found in en.json.');
  }
}

function runAll() {
  console.log('Starting i18n codebase check...\n');
  checkKeysParity();
  checkHardcodedText();
  checkUnknownLanguages();
  console.log('\nCheck complete.');
}

runAll();