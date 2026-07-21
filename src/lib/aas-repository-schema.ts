export class AasRepositoryValidationError extends Error {}

export type AasRepositoryInput = {
  name: string;
  baseUrl: string;
};

const MAX_NAME_LENGTH = 200;

// Trailing slashes would double up when we build request URLs like
// `${baseUrl}/shells`.
function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function parseAasRepositoryInput(formData: FormData): AasRepositoryInput {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    throw new AasRepositoryValidationError("Name is required.");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new AasRepositoryValidationError(
      `Name must be at most ${MAX_NAME_LENGTH} characters.`
    );
  }

  const rawBaseUrl = formData.get("baseUrl");
  const trimmedBaseUrl =
    typeof rawBaseUrl === "string" ? rawBaseUrl.trim() : "";

  if (!trimmedBaseUrl) {
    throw new AasRepositoryValidationError("Base URL is required.");
  }
  if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
    throw new AasRepositoryValidationError(
      "Base URL must start with http:// or https://."
    );
  }

  return {
    name,
    baseUrl: stripTrailingSlash(trimmedBaseUrl),
  };
}
