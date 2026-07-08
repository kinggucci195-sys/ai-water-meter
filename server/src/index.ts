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

pgPool.on("error", (err) => {
  fastify.log.error("Idle PG client error: " + err.message);
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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as SupabaseJwtPayload;
    return decoded.sub; // Returns the user's UUID
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error("Token verification failed: " + errMsg, { cause: error });
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
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return reply.code(401).send({ error: errMsg });
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
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return reply.code(500).send({ error: "Failed to fetch leaderboard: " + errMsg });
  }
});

// 6. API Endpoint: GET /api/badge/:displayName (Fetch GitHub README SVG stats badge)
fastify.get("/api/badge/:displayName", async (request, reply) => {
  const params = request.params as { displayName: string };
  const displayNameInput = params.displayName;

  try {
    // 1. Find user by display name (case-insensitive)
    let userRow: { user_id: string; display_name: string } | null = null;

    const profileQuery = `
      SELECT user_id, display_name 
      FROM public.leaderboard_profiles 
      WHERE LOWER(display_name) = LOWER($1) 
      LIMIT 1
    `;
    const profileRes = await pgPool.query(profileQuery, [displayNameInput]);

    if (profileRes.rows.length > 0) {
      userRow = profileRes.rows[0];
    } else {
      const fallbackQuery = `
        SELECT id as user_id, display_name 
        FROM public.profiles 
        WHERE LOWER(display_name) = LOWER($1) 
        LIMIT 1
      `;
      const fallbackRes = await pgPool.query(fallbackQuery, [displayNameInput]);
      if (fallbackRes.rows.length > 0) {
        userRow = fallbackRes.rows[0];
      }
    }

    // If user not found, render a beautiful "User Not Registered" SVG badge
    if (!userRow) {
      const notFoundSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="350" height="96" viewBox="0 0 350 96">
          <defs>
            <style>
              .label { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 10px; fill: #9ca3af; text-transform: uppercase; font-weight: 700; }
              .value { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 13px; fill: #ffffff; font-weight: 700; }
              .title-text { font-family: 'Space Grotesk', sans-serif; font-size: 13px; fill: #ffe066; font-weight: 700; }
            </style>
          </defs>
          <rect width="350" height="96" rx="6" fill="#030611" stroke="#ffe066" stroke-width="1" stroke-opacity="0.15"/>
          <rect x="3" y="3" width="344" height="90" rx="4" fill="none" stroke="#ffe066" stroke-width="1" stroke-opacity="0.04"/>
          
          <g transform="translate(15, 30)">
            <text x="0" y="0" class="title-text">⚡ AI WATER METER</text>
            <text x="0" y="24" class="label">STATUS</text>
            <text x="0" y="44" class="value" fill="#9ca3af">Explorer '${displayNameInput}' Not Found</text>
          </g>
        </svg>
      `.trim();
      reply.type("image/svg+xml");
      reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
      return reply.send(notFoundSvg);
    }

    const { user_id, display_name } = userRow;

    // 2. Fetch Leaderboard Rank, Score, and Water Saved
    let rank = "Unranked";
    let score = 0;
    let waterSavedMl = 0;

    const rankQuery = `
      SELECT rank, score, water_saved_ml_estimate
      FROM public.leaderboard_entries
      WHERE user_id = $1 AND period = 'all_time'
      LIMIT 1
    `;
    const rankRes = await pgPool.query(rankQuery, [user_id]);

    if (rankRes.rows.length > 0) {
      rank = `#${String(rankRes.rows[0].rank).padStart(2, "0")}`;
      score = Number(rankRes.rows[0].score);
      waterSavedMl = Number(rankRes.rows[0].water_saved_ml_estimate);
    } else {
      // Fallback: sum water from usage_daily
      const sumQuery = `
        SELECT COALESCE(SUM(water_ml_mid), 0) as total_water
        FROM public.usage_daily
        WHERE user_id = $1
      `;
      const sumRes = await pgPool.query(sumQuery, [user_id]);
      waterSavedMl = Number(sumRes.rows[0].total_water);
      score = Math.floor(waterSavedMl);
    }

    // 3. Calculate Active Streak
    let streak = 0;
    const streakQuery = `
      WITH dates AS (
        SELECT DISTINCT usage_date
        FROM public.usage_daily
        WHERE user_id = $1
        ORDER BY usage_date DESC
      ),
      numbered AS (
        SELECT usage_date,
               usage_date - (ROW_NUMBER() OVER (ORDER BY usage_date DESC))::integer * INTERVAL '1 day' as grp
        FROM dates
      ),
      streaks AS (
        SELECT grp, COUNT(*) as streak_length, MIN(usage_date) as start_date, MAX(usage_date) as end_date
        FROM numbered
        GROUP BY grp
      )
      SELECT streak_length
      FROM streaks
      WHERE end_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY streak_length DESC
      LIMIT 1
    `;
    const streakRes = await pgPool.query(streakQuery, [user_id]);
    if (streakRes.rows.length > 0) {
      streak = Number(streakRes.rows[0].streak_length);
    }

    // 4. Format outputs
    const formattedWater =
      waterSavedMl >= 1000
        ? `${(waterSavedMl / 1000).toFixed(1)} L`
        : `${Math.round(waterSavedMl)} mL`;

    const streakText = streak > 0 ? `${streak} Day${streak === 1 ? "" : "s"} 🔥` : "0 Days";

    // 5. Generate beautiful high-contrast SVGs
    const rankTitleColor = rank === "Unranked" ? "#9ca3af" : "#00f0ff";
    const rankValColor = rank === "Unranked" ? "#9ca3af" : "#00f0ff";

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="350" height="96" viewBox="0 0 350 96">
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#0df2a7" stop-opacity="0.03"/>
          </linearGradient>
          <style>
            .label { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 10px; fill: #9ca3af; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
            .value { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 13px; fill: #ffffff; font-weight: 700; }
            .rank-title { font-family: 'Space Mono', 'JetBrains Mono', monospace; font-size: 10px; fill: ${rankTitleColor}; font-weight: 700; text-transform: uppercase; }
            .rank-val { font-family: 'Space Grotesk', sans-serif; font-size: 24px; fill: ${rankValColor}; font-weight: 900; }
          </g>
          </style>
        </defs>
        <!-- Background -->
        <rect width="350" height="96" rx="6" fill="#030611" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.12"/>
        <!-- Outline offset border -->
        <rect x="3" y="3" width="344" height="90" rx="4" fill="none" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.04"/>
        <!-- Left Side rank panel -->
        <rect x="12" y="12" width="72" height="72" rx="4" fill="url(#glow)" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.1"/>
        <text x="48" y="30" text-anchor="middle" class="rank-title">RANK</text>
        <text x="48" y="58" text-anchor="middle" class="rank-val">${rank}</text>
        <!-- Stats list -->
        <text x="100" y="30" class="label">Explorer</text>
        <text x="200" y="30" class="value">${display_name}</text>
        
        <text x="100" y="52" class="label">Water Saved</text>
        <text x="200" y="52" class="value" fill="#0df2a7">${formattedWater}</text>
        
        <text x="100" y="74" class="label">Active Streak</text>
        <text x="200" y="74" class="value" fill="#ffe066">${streakText}</text>
      </svg>
    `.trim();

    reply.type("image/svg+xml");
    // Ensure badges bypass browser caching to render the latest score live
    reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
    reply.header("Pragma", "no-cache");
    reply.header("Expires", "0");
    return reply.send(svg);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    fastify.log.error("SVG Badge compilation error: " + errMsg);
    return reply.code(500).send({ error: "Failed to generate badge" });
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
