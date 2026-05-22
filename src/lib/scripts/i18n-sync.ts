import fs from "fs";
import path from "path";
import { logger } from "@/lib/dev-logger";

// Run from root, so path is src/messages
const MESSAGES_DIR = path.join(process.cwd(), "src", "messages");
const EN_PATH = path.join(MESSAGES_DIR, "en.json");
const AR_PATH = path.join(MESSAGES_DIR, "ar.json");

function syncKeys(source: any, target: any, prefix = ""): any {
  const result: any = { ...target };
  let added = 0;

  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!result[key] || typeof result[key] !== "object") {
        result[key] = {};
      }
      const syncResult = syncKeys(source[key], result[key], `${prefix}${key}.`);
      result[key] = syncResult.result;
      added += syncResult.added;
    } else {
        if (result[key] === undefined) {
          result[key] = `[AR] ${source[key]}`;
          added++;
          logger.info(`Added missing key: ${prefix}${key}`);
        }
      }
  }
  
  // Remove keys in target that don't exist in source to keep perfectly synced
  for (const key in result) {
     if (source[key] === undefined) {
        logger.info(`Removed orphaned key: ${prefix}${key}`);
        delete result[key];
     }
  }

  return { result, added };
}

function main() {
  logger.info("Syncing i18n JSON configurations...");
  if (!fs.existsSync(EN_PATH)) {
    logger.error("en.json not found!");
    process.exit(1);
  }

  const enContent = JSON.parse(fs.readFileSync(EN_PATH, "utf-8"));
  let arContent = {};
  if (fs.existsSync(AR_PATH)) {
    try {
      arContent = JSON.parse(fs.readFileSync(AR_PATH, "utf-8"));
    } catch(e) {}
  }

  const { result, added } = syncKeys(enContent, arContent);

  fs.writeFileSync(AR_PATH, JSON.stringify(result, null, 2) + "\n");

  logger.info(`Synchronization complete. ${added} keys added. orphans removed.`);
}

main();
