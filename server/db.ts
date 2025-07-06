import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Auto-detect database type and environment
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                      process.env.DATABASE_URL.includes('neon.database.url');
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isNeonDatabase) {
  // Neon serverless - works in all environments
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
  console.log(`🐘 Connected to Neon serverless PostgreSQL (${process.env.NODE_ENV})`);
} else {
  // Standard PostgreSQL - auto-configure SSL for production
  const sslConfig = isProduction ? { 
    rejectUnauthorized: false,
    require: true 
  } : false;
  
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    // Production optimizations
    max: isProduction ? 20 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  db = drizzlePg({ client: pool, schema });
  console.log(`🐘 Connected to PostgreSQL server (${process.env.NODE_ENV})`);
  
  // Test connection on startup
  pool.connect()
    .then(client => {
      console.log('✅ Database connection verified');
      client.release();
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
    });
}

export { pool, db };