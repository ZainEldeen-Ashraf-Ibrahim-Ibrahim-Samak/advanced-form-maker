import fs from "fs";
import path from "path";
import { logger } from "@/lib/dev-logger";

const MESSAGES_DIR = path.join(process.cwd(), "src", "messages");
const EN_PATH = path.join(MESSAGES_DIR, "en.json");
const AR_PATH = path.join(MESSAGES_DIR, "ar.json");

function getFlatKeys(obj: any, prefix = ""): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys = [...keys, ...getFlatKeys(obj[key], `${prefix}${key}.`)];
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

function main() {
  const en = JSON.parse(fs.readFileSync(EN_PATH, "utf-8"));
  const ar = JSON.parse(fs.readFileSync(AR_PATH, "utf-8"));

  const enKeys = getFlatKeys(en);
  const arKeys = getFlatKeys(ar);

  const missingInAr = enKeys.filter(k => !arKeys.includes(k));
  const missingInEn = arKeys.filter(k => !enKeys.includes(k));

  let failed = false;

  if (missingInAr.length > 0) {
    logger.error("Missing keys in ar.json:");
    missingInAr.forEach((key) => logger.error(` - ${key}`));
    failed = true;
  }

  if (missingInEn.length > 0) {
    logger.error("Orphaned keys in ar.json (not in en.json):");
    missingInEn.forEach((key) => logger.error(` - ${key}`));
    failed = true;
  }

  // Check if any AR key has "[AR]" prefix indicating it was stubbed but not translated yet
  let stubbedCount = 0;
  function checkStubs(obj: any, prefix = "") {
     for (const key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
            checkStubs(obj[key], `${prefix}${key}.`);
        } else if (typeof obj[key] === "string" && obj[key].startsWith("[AR]")) {
            logger.warn(`Stubbed (untranslated) key: ${prefix}${key}`);
            stubbedCount++;
            failed = true;
        }
     }
  }

  checkStubs(ar);

  if (failed) {
    logger.error("Lint failed. Run 'npm run i18n:sync' or translate stubbed keys.", {
      stubbedCount,
      missingInAr: missingInAr.length,
      missingInEn: missingInEn.length,
    });
    process.exit(1);
  } else {
    logger.info("i18n Lint passed.");
  }
}

main();
