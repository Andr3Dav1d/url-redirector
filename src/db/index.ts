import postgres from "postgres";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

export default sql;
