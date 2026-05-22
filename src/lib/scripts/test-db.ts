import { MongoClient } from "mongodb";
import * as dns from "dns";
import * as net from "net";
import * as dotenv from "dotenv";
import path from "path";
import { devlogger } from "@/lib/devlogger";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;

async function runDiagnostics() {
  devlogger.info("--- MongoDB Connectivity Diagnostics ---");
  
  if (!uri) {
    devlogger.error("❌ MONGODB_URI is not defined in .env.local");
    return;
  }

  devlogger.info(`Checking URI: ${uri.replace(/:([^@]+)@/, ":****@")}`);

  // 1. Parse Host
  const hostMatch = uri.match(/@([^/?#]+)/);
  const host = hostMatch ? hostMatch[1] : null;

  if (!host) {
    devlogger.error("❌ Could not parse host from URI");
    return;
  }

  devlogger.info(`Target Host: ${host}`);

  // 2. DNS Check
  devlogger.info("\n1. Testing DNS Resolution...");
  try {
    const addresses = await dns.promises.resolve4(host).catch(() => []);
    if (addresses.length > 0) {
      devlogger.info(`✅ DNS Resolved to: ${addresses.join(", ")}`);
    } else {
      // Try SRV if it's a +srv URI
      const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`).catch(() => []);
      if (srvRecords.length > 0) {
        devlogger.info(`✅ SRV Records Found: ${srvRecords.length} records`);
        srvRecords.forEach(r => devlogger.info(`   - ${r.name}:${r.port}`));
      } else {
        devlogger.error("❌ DNS Resolution failed for both A and SRV records.");
      }
    }
  } catch (err: any) {
    devlogger.error(`❌ DNS Error: ${err.message}`);
  }

  // 3. Port Check (Standard 27017)
  devlogger.info("\n2. Testing Port 27017 (Standard MongoDB)...");
  const socket = new net.Socket();
  const timeout = 5000;
  
  socket.setTimeout(timeout);
  socket.on("connect", () => {
    devlogger.info("✅ Successfully reached Port 27017.");
    socket.destroy();
  }).on("timeout", () => {
    devlogger.error("❌ Connection timed out on Port 27017 (Check Firewall/VPN).");
    socket.destroy();
  }).on("error", (err) => {
    devlogger.error(`❌ Connection refused on Port 27017: ${err.message}`);
  }).connect(27017, host.startsWith("cluster") ? host : host.split('.')[0] + ".mongodb.net");

  // 4. Actual Client Connect attempt
  devlogger.info("\n3. Attempting full MongoClient connection...");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    devlogger.info("✅ SUCCESS: Connected to MongoDB Atlas!");
    await client.db().admin().ping();
    devlogger.info("✅ SUCCESS: Database ping successful.");
  } catch (err: any) {
    devlogger.error(`❌ Full Connection Failed: ${err.message}`);
    devlogger.info("\nSuggested Fixes:");
    if (err.message.includes("ECONNREFUSED")) {
      devlogger.info("- Check if your IP is whitelisted in Atlas Network Access.");
      devlogger.info("- Check if a VPN or Firewall is blocking the connection.");
    }
  } finally {
    await client.close();
  }
}

runDiagnostics();
