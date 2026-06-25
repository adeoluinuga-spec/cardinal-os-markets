import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Generate a 1536-dimension embedding for the given text using OpenAI.
 * Returns the embedding serialized as a pgvector literal string (e.g.
 * "[0.1,0.2,...]") ready to store in / compare against a vector column.
 * Returns null when OPENAI_API_KEY is not configured so callers can degrade
 * gracefully (store the entry without an embedding, fall back to keyword).
 */
export async function generateEmbedding(text: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const input = text.trim().slice(0, 8000);
  if (!input) {
    return null;
  }

  let response;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });
  } catch {
    return null;
  }

  const vector = response.data[0]?.embedding;
  if (!vector) {
    return null;
  }

  // pgvector accepts its text representation: [v1,v2,...]
  return `[${vector.join(",")}]`;
}
