import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("app/components/ApterraApp.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("underwriting uses generic guidance without hiding the disclosed RefundBot harness limitation", () => {
  for (const placeholder of ["unique-version-id", "unique-claim-id", "unique-challenge-id", "unique-attempt-id", "resource-or-order-id"]) {
    assert.ok(app.includes(`placeholder="${placeholder}"`));
  }
  assert.ok(app.includes("RefundBot v1"));
  assert.ok(app.includes("refundbot-v2"));
});

test("registration feedback requires canonical readback and keeps versionId populated", () => {
  assert.ok(app.includes('readback.startsWith("READBACK_MATCH get_agent_version ")'));
  assert.ok(app.includes("Agent version registered successfully"));
  assert.ok(app.includes("is now registered on Studio Dev."));
  assert.ok(app.includes("Registration needs attention"));
  assert.equal(app.includes('setVersionId("")'), false);
});

test("homepage copy and reduced-motion reveal are present", () => {
  assert.ok(app.includes("Before an agent receives consequential permission, APTERRA asks it to prove what it can do against a real policy, a committed challenge, and independent GenLayer judgment."));
  assert.equal(app.includes("what it can do — against a real policy"), false);
  assert.ok(app.includes('className="hero-headline-reveal"'));
  assert.ok(css.includes("apterra-headline-reveal"));
  assert.ok(css.includes("prefers-reduced-motion:reduce"));
});
