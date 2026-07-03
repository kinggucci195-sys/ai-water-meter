import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool } from "pg";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const fastify = Fastify({ logger: true });

// Enable CORS for Chrome Extension origins and Vercel app domain
fastify.register(cors, {
  origin: [
    /^chrome-extension:\/\//,
    "http://localhost:5173",
    "http://localhost:5174",
    "https://web-app-woad-rho.vercel.app"
  ],
  methods: ["GET", "POST", "OPTIONS"]
});

// 1. Initialize PostgreSQL Connection Pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max concurrent database connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// 2. Initialize Redis Client (Graceful Fallback if offline)
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on("error", (err) => {
    fastify.log.error("Redis Error: " + err.message);
  });
} else {
  fastify.log.warn("REDIS_URL not set. Serving queries without cache layer.");
}

// 3. User Authentication Helper
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
}

function verifySupabaseToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET is not configured on the server");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload;
    return decoded.sub; // Returns the user's UUID
  } catch (error: any) {
    throw new Error("Token verification failed: " + error.message);
  }
}

// 4. API Endpoint: POST /api/usage (Sync user telemetry)
fastify.post("/api/usage", async (request, reply) => {
  try {
    const userId = verifySupabaseToken(request.headers.authorization);
    const body = request.body as {
      device_id: string;
      usage_date: string;
      input_tokens: number;
      output_tokens: number;
      water_ml: number;
    };

    if (!body.device_id || !body.usage_date || body.water_ml === undefined) {
      return reply.code(400).send({ error: "Missing required payload parameters" });
    }

    const idempotencyKey = `${body.device_id}:${body.usage_date}`;

    // Write to PostgreSQL using connection pool
    const query = `
      INSERT INTO public.usage_daily 
        (user_id, device_id, usage_date, input_tokens_est, output_tokens_est, water_ml_mid, idempotency_key)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, device_id, usage_date, idempotency_key) 
      DO UPDATE SET 
        water_ml_mid = usage_daily.water_ml_mid + EXCLUDED.water_ml_mid,
        input_tokens_est = usage_daily.input_tokens_est + EXCLUDED.input_tokens_est,
        output_tokens_est = usage_daily.output_tokens_est + EXCLUDED.output_tokens_est
    `;

    await pgPool.query(query, [
      userId,
      body.device_id,
      body.usage_date,
      body.input_tokens,
      body.output_tokens,
      body.water_ml,
      idempotencyKey
    ]);

    // Update Redis sorted sets for the real-time leaderboard (ZINCRBY)
    if (redis) {
      const scoreKey = `leaderboard:all-time`;
      await redis.zincrby(scoreKey, body.water_ml, userId);
      
      // Also cache daily/weekly metrics
      const dailyKey = `leaderboard:daily:${body.usage_date}`;
      await redis.zincrby(dailyKey, body.water_ml, userId);
    }

    return reply.code(200).send({ status: "success", synced: true });
  } catch (error: any) {
    return reply.code(401).send({ error: error.message });
  }
});

// 5. API Endpoint: GET /api/leaderboard (Fetch ranking lists)
fastify.get("/api/leaderboard", async (request, reply) => {
  try {
    const queryParams = request.query as { period?: string };
    const period = queryParams.period || "all_time"; // all_time, daily, weekly
    
    const cacheKey = `cache:leaderboard:${period}`;

    // Try serving directly from Redis Cache
    if (redis) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return reply.code(200).send(JSON.parse(cachedData));
      }
    }

    // Cache miss - Fetch from Postgres
    const query = `
      SELECT 
        l.user_id,
        p.opted_in_name as display_name,
        l.score as points,
        l.water_saved_ml_estimate as water_saved
      FROM public.leaderboard_entries l
      LEFT JOIN public.profiles p ON l.user_id = p.id
      WHERE l.period = $1
      ORDER BY l.rank ASC
      LIMIT 50
    `;
    
    const { rows } = await pgPool.query(query, [period]);

    // Save to Redis Cache with a 30-second TTL (Time-To-Live)
    if (redis && rows.length > 0) {
      await redis.setex(cacheKey, 30, JSON.stringify(rows));
    }

    return reply.code(200).send(rows);
  } catch (error: any) {
    return reply.code(500).send({ error: "Failed to fetch leaderboard: " + error.message });
  }
});

// Start fastify listener
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    await fastify.listen({ port, host: "0.0.0.0" });
    fastify.log.info(`API Gateway active on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
