import { describe, expect, it } from "bun:test";
import { validateCredentials } from "../src/modelResolver.js";
import { MissingCredentialsError } from "../src/errors.js";

/**
 * Test suite for mandatory apiKey and baseUrl credential validation.
 */
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
          baseUrl: "",
        },
        "google",
      ),
    ).toThrow(MissingCredentialsError);
  });

  it("should enforce credentials uniformly across all providers with no exemptions", () => {
    const providers = [
      "openai",
      "anthropic",
      "google",
      "xai",
      "deepseek",
      "groq",
      "mistral",
      "cohere",
      "togetherai",
      "alibaba",
      "openrouter",
      "compatible",
    ];

    for (const provider of providers) {
      // @ts-expect-error Testing missing credentials
      expect(() => validateCredentials({}, provider)).toThrow(MissingCredentialsError);
    }
  });
});
