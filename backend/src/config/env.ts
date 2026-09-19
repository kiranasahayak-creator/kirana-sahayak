import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",

  SARVAM_API_KEY: process.env.SARVAM_API_KEY || "",
  SARVAM_API_BASE_URL: process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai",
  SARVAM_STT_MODEL: process.env.SARVAM_STT_MODEL || "saaras:v3",
  SARVAM_STT_MODE: process.env.SARVAM_STT_MODE || "transcribe",

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || "",

  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),

  PORT: Number(process.env.PORT || 4000),
};

export const isSarvamConfigured = () => Boolean(env.SARVAM_API_KEY);
export const isGeminiConfigured = () => Boolean(env.GEMINI_API_KEY);
