import { describe, expect, it } from "vitest";
import { decodeJwtClaims } from "./graph";

// Build a fake JWT payload-only token. Header and signature don't matter for
// the decoder — it only looks at the middle segment.
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.signature`;
}

describe("decodeJwtClaims", () => {
  it("extracts scp, roles, aud, appid, tid, upn, exp from a well-formed token", () => {
    const token = makeToken({
      scp: "User.Read Sites.Selected Mail.Send.Shared",
      roles: [],
      aud: "https://graph.microsoft.com",
      appid: "abc-123",
      tid: "tenant-xyz",
      upn: "ray.white@altronic-llc.com",
      exp: 1748000000,
      name: "Ray White", // should be ignored
    });
    const claims = decodeJwtClaims(token)!;
    expect(claims.scp).toBe("User.Read Sites.Selected Mail.Send.Shared");
    expect(claims.roles).toEqual([]);
    expect(claims.aud).toBe("https://graph.microsoft.com");
    expect(claims.appid).toBe("abc-123");
    expect(claims.tid).toBe("tenant-xyz");
    expect(claims.upn).toBe("ray.white@altronic-llc.com");
    expect(claims.exp).toBe(new Date(1748000000 * 1000).toISOString());
    // Make sure we didn't leak extra fields.
    expect((claims as Record<string, unknown>).name).toBeUndefined();
  });

  it("returns null for a malformed token", () => {
    expect(decodeJwtClaims("not-a-jwt")).toBeNull();
    expect(decodeJwtClaims("only.two")).toBeNull();
    expect(decodeJwtClaims("")).toBeNull();
  });

  it("returns null when the payload isn't valid JSON", () => {
    const token = `aaa.${btoa("garbage payload")}.bbb`;
    expect(decodeJwtClaims(token)).toBeNull();
  });

  it("handles partial payloads gracefully (some claims missing)", () => {
    const token = makeToken({ scp: "User.Read" });
    const claims = decodeJwtClaims(token)!;
    expect(claims.scp).toBe("User.Read");
    expect(claims.roles).toBeUndefined();
    expect(claims.aud).toBeUndefined();
  });

  it("handles base64url-encoded payloads that need '=' padding", () => {
    // Construct a payload whose length doesn't divide by 4, exercising the
    // pad-with-= branch. {"x":1} → eyJ4IjoxfQ (10 chars, needs 2 pads).
    const token = `aaa.eyJ4IjoxfQ.bbb`;
    const claims = decodeJwtClaims(token);
    // No recognised diagnostic claims, but should still parse successfully.
    expect(claims).not.toBeNull();
    expect(claims!.scp).toBeUndefined();
  });
});
