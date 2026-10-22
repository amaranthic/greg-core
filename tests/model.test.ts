/**
 * @fileoverview Test suite for model string parsing and credential validation.
 */

import { describe, expect, it } from "bun:test";
import {
  parseModelString,
  validateCredentials,
  InvalidModelStringError,
  MissingCredentialsError,
} from "../src/index.js";

describe("modelParsing", () => {
  it("should correctly split simple provider and model ID on the first slash", () => {
    const result = parseModelString("openai/gpt-4o");
    expect(result.provider).toBe("openai");
    expect(result.modelId).toBe("gpt-4o");
  });

  it("should preserve multi-slash model IDs without truncation or re-splitting", () => {
    const result = parseModelString("openrouter/openrouter/free");
    expect(result.provider).toBe("openrouter");
    expect(result.modelId).toBe("openrouter/free");
  });

  it("should preserve multiple slashes in complex nested model identifiers", () => {
    const result = parseModelString("compatible/org/sub-org/custom-model-v1");
    expect(result.provider).toBe("compatible");
    expect(result.modelId).toBe("org/sub-org/custom-model-v1");
  });

  it("should trim surrounding whitespace from provider and modelId", () => {
    const result = parseModelString("  anthropic  /  claude-3-5-sonnet  ");
    expect(result.provider).toBe("anthropic");
    expect(result.modelId).toBe("claude-3-5-sonnet");
  });

  it("should throw InvalidModelStringError when no slash is present", () => {
    expect(() => parseModelString("gpt-4o")).toThrow(InvalidModelStringError);

    try {
      parseModelString("gpt-4o");
    } catch (error) {
      expect(InvalidModelStringError.isInstance(error)).toBe(true);
      if (InvalidModelStringError.isInstance(error)) {
        expect(error.modelString).toBe("gpt-4o");
        expect(error.message).toContain("No '/' delimiter found");
      }
    }
  });

  it("should throw InvalidModelStringError when provider segment is empty", () => {
    expect(() => parseModelString("/gpt-4o")).toThrow(InvalidModelStringError);

    try {
      parseModelString("/gpt-4o");
    } catch (error) {
      expect(InvalidModelStringError.isInstance(error)).toBe(true);
      if (InvalidModelStringError.isInstance(error)) {
        expect(error.message).toContain("Provider identifier before '/' is empty");
      }
    }
  });

  it("should throw InvalidModelStringError when modelId segment is empty", () => {
    expect(() => parseModelString("openai/")).toThrow(InvalidModelStringError);

    try {
      parseModelString("openai/");
    } catch (error) {
      expect(InvalidModelStringError.isInstance(error)).toBe(true);
      if (InvalidModelStringError.isInstance(error)) {
        expect(error.message).toContain("Model identifier after '/' is empty");
      }
    }
  });

  it("should throw InvalidModelStringError when given non-string input", () => {
    // @ts-expect-error Testing non-string input
    expect(() => parseModelString(12345)).toThrow(InvalidModelStringError);
  });
});

describe("credentialsValidation", () => {
  it("should pass when both non-empty apiKey and baseUrl are provided", () => {
    expect(() => {
      validateCredentials(
        {
          apiKey: "sk-valid-key",
          baseUrl: "https://api.openai.com/v1",
        },
        "openai",
      );
    }).not.toThrow();
  });

  it("should throw MissingCredentialsError when apiKey is missing or null", () => {
    // @ts-expect-error Testing missing apiKey
    expect(() => validateCredentials({ baseUrl: "https://api.openai.com/v1" }, "openai")).toThrow(
      MissingCredentialsError,
    );

    try {
      // @ts-expect-error Testing missing apiKey
      validateCredentials({ baseUrl: "https://api.openai.com/v1" }, "openai");
    } catch (error) {
      expect(MissingCredentialsError.isInstance(error)).toBe(true);
      if (MissingCredentialsError.isInstance(error)) {
        expect(error.missingField).toBe("apiKey");
        expect(error.provider).toBe("openai");
      }
    }
  });

  it("should throw MissingCredentialsError when apiKey is an empty string", () => {
    expect(() =>
      validateCredentials(
        {
          apiKey: "   ",
          baseUrl: "https://api.openai.com/v1",
        },
        "openai",
      ),
    ).toThrow(MissingCredentialsError);
  });

  it("should throw MissingCredentialsError when baseUrl is missing", () => {
    // @ts-expect-error Testing missing baseUrl
    expect(() => validateCredentials({ apiKey: "sk-valid-key" }, "anthropic")).toThrow(
      MissingCredentialsError,
    );

    try {
      // @ts-expect-error Testing missing baseUrl
      validateCredentials({ apiKey: "sk-valid-key" }, "anthropic");
    } catch (error) {
      expect(MissingCredentialsError.isInstance(error)).toBe(true);
      if (MissingCredentialsError.isInstance(error)) {
        expect(error.missingField).toBe("baseUrl");
        expect(error.provider).toBe("anthropic");
      }
    }
  });

  it("should throw MissingCredentialsError when baseUrl is an empty string", () => {
    expect(() =>
      validateCredentials(
        {
          apiKey: "sk-valid-key",
          baseUrl: "   ",
        },
        "anthropic",
      ),
    ).toThrow(MissingCredentialsError);
  });
});
