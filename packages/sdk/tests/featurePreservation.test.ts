import { describe, expect, it } from "bun:test";
import * as nativeAi from "ai";
import * as gregSdk from "../src/index.js";

/**
 * Test suite auditing feature preservation and export parity against the pinned AI SDK version.
 *
 * Ensures Greg preserves 100% of the underlying Vercel AI SDK public capability surface.
 */
describe("featurePreservation", () => {
  it("should preserve and expose all public exports from the pinned ai package", () => {
    const nativeExportKeys = Object.keys(nativeAi);
    const missingExports: string[] = [];

    for (const exportKey of nativeExportKeys) {
      if (!(exportKey in gregSdk)) {
        missingExports.push(exportKey);
      }
    }

    // Every single export from the pinned AI SDK must be available in Greg SDK
    expect(missingExports).toEqual([]);
    expect(nativeExportKeys.length).toBeGreaterThan(100);
  });

  it("should expose Greg runtime execution functions alongside native capabilities", () => {
    expect(typeof gregSdk.generateText).toBe("function");
    expect(typeof gregSdk.streamText).toBe("function");
    expect(typeof gregSdk.generateObject).toBe("function");
    expect(typeof gregSdk.streamObject).toBe("function");
  });

  it("should expose Greg model resolution and provider management functions", () => {
    expect(typeof gregSdk.resolveModel).toBe("function");
    expect(typeof gregSdk.parseModelString).toBe("function");
    expect(typeof gregSdk.validateCredentials).toBe("function");
    expect(typeof gregSdk.getProviderAdapter).toBe("function");
    expect(typeof gregSdk.getSupportedProviders).toBe("function");
    expect(typeof gregSdk.hasProvider).toBe("function");
    expect(typeof gregSdk.registerProviderAdapter).toBe("function");
  });

  it("should expose Greg canonical error classes", () => {
    expect(typeof gregSdk.InvalidModelStringError).toBe("function");
    expect(typeof gregSdk.MissingCredentialsError).toBe("function");
    expect(typeof gregSdk.UnsupportedProviderError).toBe("function");

    // All Greg errors must inherit from AI SDK's AISDKError
    expect(gregSdk.InvalidModelStringError.prototype instanceof nativeAi.AISDKError).toBe(true);
    expect(gregSdk.MissingCredentialsError.prototype instanceof nativeAi.AISDKError).toBe(true);
    expect(gregSdk.UnsupportedProviderError.prototype instanceof nativeAi.AISDKError).toBe(true);
  });

  it("should preserve key AI SDK v7 classes, stream helpers, and tools directly", () => {
    expect(typeof gregSdk.ToolLoopAgent).toBe("function");
    expect(typeof gregSdk.tool).toBe("function");
    expect(typeof gregSdk.toTextStream).toBe("function");
    expect(typeof gregSdk.toUIMessageStream).toBe("function");
    expect(typeof gregSdk.createTextStreamResponse).toBe("function");
    expect(typeof gregSdk.createUIMessageStreamResponse).toBe("function");
    expect(typeof gregSdk.pipeTextStreamToResponse).toBe("function");
    expect(typeof gregSdk.pipeUIMessageStreamToResponse).toBe("function");
  });
});
