const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = Number.parseInt(
  process.env.PORT || process.env.API_PORT || "5000",
  10,
);

const isCloudDb = Boolean(process.env.DATABASE_URL);
const useSsl =
  process.env.DB_SSL === "true" ||
  (isCloudDb && process.env.DB_SSL !== "false");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number.parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME || "shop",
      user: process.env.DB_USER || "shop_user",
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

const sampleProducts = [
  {
    slug: "canvas-backpack",
    name: "Canvas Backpack",
    description: "A lightweight everyday bag with room for all your essentials.",
    category: "Everyday",
    emoji: "🎒",
    price: 39.99,
  },
  {
    slug: "ceramic-mug",
    name: "Ceramic Coffee Mug",
    description: "A sturdy, minimalist mug for your morning coffee or tea.",
    category: "Home",
    emoji: "☕",
    price: 14.5,
  },
  {
    slug: "wireless-headphones",
    name: "Wireless Headphones",
    description: "Comfortable over-ear headphones for music, study, and travel.",
    category: "Tech",
    emoji: "🎧",
    price: 79.0,
  },
  {
    slug: "desk-lamp",
    name: "Adjustable Desk Lamp",
    description: "Focused, warm light with an adjustable neck for your workspace.",
    category: "Home",
    emoji: "💡",
    price: 32.25,
  },
  {
    slug: "steel-water-bottle",
    name: "Steel Water Bottle",
    description: "A reusable insulated bottle to keep drinks cold or warm.",
    category: "Everyday",
    emoji: "🧴",
    price: 22.0,
  },
  {
    slug: "notebook-set",
    name: "Pocket Notebook Set",
    description: "Three compact notebooks for ideas, lists, and daily notes.",
    category: "Stationery",
    emoji: "📓",
    price: 12.75,
  },
];

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      emoji TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
    )
  `);

  for (const product of sampleProducts) {
    await pool.query(
      `INSERT INTO products (slug, name, description, category, emoji, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [
        product.slug,
        product.name,
        product.description,
        product.category,
        product.emoji,
        product.price,
      ],
    );
  }
}

async function connectAndInitialize() {
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initializeDatabase();
      console.log("Database initialized successfully.");
      return;
    } catch (error) {
      console.error(
        `Database initialization attempt ${attempt}/${maxAttempts} failed:`,
        error.message,
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

app.get("/api/products", async (_request, response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, description, category, emoji, price
       FROM products
       ORDER BY id`,
    );
    response.json(rows);
  } catch (error) {
    console.error("Failed to fetch products:", error.message);
    response.status(503).json({ error: "Products are temporarily unavailable." });
  }
});

app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database query failed:", error.message);
    response.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.use((error, _request, response, _next) => {
  console.error("Unhandled request error:", error);
  response.status(500).json({ error: "An unexpected server error occurred." });
});

async function start() {
  await connectAndInitialize();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Shop API listening on 0.0.0.0:${port}`);
  });
}

start().catch(async (error) => {
  console.error("Could not start the API:", error);
  await pool.end();
  process.exitCode = 1;
});

async function shutdown() {
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
