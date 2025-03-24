import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Kraken API response schemas
export const ohlcSchema = z.array(
  z.tuple([
    z.number(), // time
    z.string(), // open
    z.string(), // high
    z.string(), // low
    z.string(), // close
    z.string(), // vwap
    z.string(), // volume
    z.number(), // count
  ])
);

export const krakenOHLCResponseSchema = z.object({
  error: z.array(z.string()),
  result: z.record(z.union([ohlcSchema, z.number()])),
});

export const tradingPairInfoSchema = z.object({
  altname: z.string(),
  wsname: z.string().optional(),
  aclass_base: z.string(),
  base: z.string(),
  aclass_quote: z.string(),
  quote: z.string(),
  lot: z.string(),
  pair_decimals: z.number(),
  lot_decimals: z.number(),
  lot_multiplier: z.number(),
  leverage_buy: z.array(z.number()),
  leverage_sell: z.array(z.number()),
  fees: z.array(z.tuple([z.number(), z.number()])),
  fees_maker: z.array(z.tuple([z.number(), z.number()])).optional(),
  fee_volume_currency: z.string(),
  margin_call: z.number(),
  margin_stop: z.number(),
  ordermin: z.string().optional(),
});

export const krakenAssetPairsResponseSchema = z.object({
  error: z.array(z.string()),
  result: z.record(tradingPairInfoSchema),
});

export const tickerInfoSchema = z.object({
  a: z.tuple([z.string(), z.number(), z.string()]),
  b: z.tuple([z.string(), z.number(), z.string()]),
  c: z.tuple([z.string(), z.string()]),
  v: z.tuple([z.string(), z.string()]),
  p: z.tuple([z.string(), z.string()]),
  t: z.tuple([z.number(), z.number()]),
  l: z.tuple([z.string(), z.string()]),
  h: z.tuple([z.string(), z.string()]),
  o: z.string(),
});

export const krakenTickerResponseSchema = z.object({
  error: z.array(z.string()),
  result: z.record(tickerInfoSchema),
});
