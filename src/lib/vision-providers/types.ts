export type VisionProviderType = "ANTHROPIC" | "OPENAI" | "MISTRAL";

export type VisionProviderConfig = {
  provider: VisionProviderType;
  model: string;
  apiKey: string;
};

export type VisionNameplateGuess = {
  manufacturerName: string | null;
  articleNumber: string | null;
};
