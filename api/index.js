export default function handler(req, res) {
  const runtimeConfig = {
    SERVICE_MODE: process.env.SERVICE_MODE || "demo",
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    DESIGN_BUCKET: process.env.DESIGN_BUCKET
  };

  res.statusCode = 200;
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.end(`export const APP_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`);
}
