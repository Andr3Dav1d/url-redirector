import postgres from "postgres";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

const databaseUrl = process.env.DATABASE_URL;
const sslMode = new URL(databaseUrl).searchParams.get("sslmode") ?? process.env.PGSSLMODE;
const useSsl = sslMode ? !["disable", "false", "0"].includes(sslMode.toLowerCase()) : false;
const sql = postgres(databaseUrl, useSsl ? { ssl: "require" } : {});

export default sql;
