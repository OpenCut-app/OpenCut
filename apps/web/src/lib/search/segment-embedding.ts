interface EmbeddingProvider {
  createEmbedding: (inputText: string) => Promise<number[] | null>;
}

interface HttpEmbeddingProviderOptions {
  apiUrl: string;
  apiKey?: string;
  model: string;
  dimensions?: number;
}

const createNoopEmbeddingProvider = (): EmbeddingProvider => ({
  createEmbedding: async () => null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseEmbeddingResponse = (payload: unknown): number[] | null => {
  if (!isRecord(payload)) return null;
  const data = payload.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (!isRecord(first)) return null;
  const embedding = first.embedding;
  if (!Array.isArray(embedding)) return null;
  const numbers = embedding.filter((value) => typeof value === "number");
  if (numbers.length === 0) return null;
  return numbers;
};

const createHttpEmbeddingProvider = (
  options: HttpEmbeddingProviderOptions
): EmbeddingProvider => ({
  createEmbedding: async (inputText) => {
    if (!inputText.trim()) return null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }

    const response = await fetch(options.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: options.model,
        input: inputText,
        dimensions: options.dimensions,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return parseEmbeddingResponse(data);
  },
});

export type { EmbeddingProvider, HttpEmbeddingProviderOptions };
export { createNoopEmbeddingProvider, createHttpEmbeddingProvider };
