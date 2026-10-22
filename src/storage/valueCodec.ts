/**
 * @fileoverview Tagged lossless value codec for binary, URLs, and complex message payloads.
 * @packageDocumentation
 */

export type EncodedValue =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "undefined" }
  | { readonly type: "binary"; readonly base64: string }
  | { readonly type: "url"; readonly href: string }
  | { readonly type: "array"; readonly items: readonly EncodedValue[] }
  | { readonly type: "object"; readonly entries: Record<string, EncodedValue> };

/**
 * Encodes an arbitrary JavaScript value into a lossless tagged JSON-safe representation.
 *
 * @param value - Any JavaScript value.
 * @returns Tagged EncodedValue.
 */
export function encodeValue(value: unknown): EncodedValue {
  if (value === null) return { type: "null" };
  if (value === undefined) return { type: "undefined" };

  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "number") return { type: "number", value };
  if (typeof value === "boolean") return { type: "boolean", value };

  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      type: "binary",
      base64: Buffer.from(value).toString("base64"),
    };
  }

  if (value instanceof URL) {
    return {
      type: "url",
      href: value.href,
    };
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.map(encodeValue),
    };
  }

  if (typeof value === "object") {
    const entries: Record<string, EncodedValue> = {};
    for (const [k, v] of Object.entries(value)) {
      entries[k] = encodeValue(v);
    }
    return { type: "object", entries };
  }

  return { type: "string", value: String(value) };
}

/**
 * Decodes a tagged EncodedValue back to its original JavaScript form.
 *
 * @param encoded - The EncodedValue.
 * @returns Restored original JavaScript value.
 */
export function decodeValue(encoded: EncodedValue): unknown {
  switch (encoded.type) {
    case "null":
      return null;
    case "undefined":
      return undefined;
    case "string":
      return encoded.value;
    case "number":
      return encoded.value;
    case "boolean":
      return encoded.value;
    case "binary":
      return Buffer.from(encoded.base64, "base64");
    case "url":
      return new URL(encoded.href);
    case "array":
      return encoded.items.map(decodeValue);
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(encoded.entries)) {
        result[k] = decodeValue(v);
      }
      return result;
    }
  }
}
