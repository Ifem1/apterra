import fs from "node:fs";

const url = process.env.APTERRA_PROVIDER_URL || "https://api.groq.com/openai/v1/chat/completions";
const key = process.env.APTERRA_PROVIDER_KEY;
const model = process.env.APTERRA_PROVIDER_MODEL || "openai/gpt-oss-20b";
if (!key) throw new Error("APTERRA_PROVIDER_KEY is not configured");
const prompt = fs.readFileSync(0, "utf8");
const response = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0 }),
});
const payload = await response.json();
if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
const content = payload?.choices?.[0]?.message?.content;
if (typeof content !== "string") throw new Error("PROVIDER_RESPONSE_SHAPE_INVALID");
process.stdout.write(content);
