/**
 * LLM Client
 *
 * All AI calls go through here. Currently using OpenAI GPT-4o.
 * To switch to Claude, replace the client and model — nothing else changes.
 */

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are AjoFi's AI Treasurer — an autonomous financial agent managing rotating savings groups for West Africans on the Stellar blockchain.

You make real decisions that affect real people's savings. You reason carefully, act proportionally, and always explain your decisions clearly so group members can understand and trust them.

You respond only in valid JSON. No markdown. No explanation outside the JSON object.`;

export async function askAI(prompt) {
  const response = await client.chat.completions.create({
    model:           "gpt-4o",
    temperature:     0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
  });

  const raw = response.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch {
    console.error("[LLM] Non-JSON response:", raw);
    throw new Error("AI returned non-JSON response");
  }
}
