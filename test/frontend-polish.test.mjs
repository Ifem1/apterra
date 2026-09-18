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

test("registration success is panel-local, finality-gated, exact, and cleared when version changes", () => {
  const finalityGate = 'summary.successful && current?.method === "register_agent_version" && current.readId && readback.startsWith("READBACK_MATCH get_agent_version ")';
  const successSetter = "setRegistrationSuccessId(current.readId);";
  const panelStart = app.indexOf("<h3>Register an agent version</h3>");
  const successRender = app.indexOf('{registrationSuccessId && <div className="registration-success"', panelStart);
  const nextPanel = app.indexOf("<h3>Create a capability claim</h3>", panelStart);

  assert.ok(app.includes(finalityGate), "success state must remain behind successful finality plus exact canonical readback");
  assert.ok(app.indexOf(successSetter) > app.indexOf(finalityGate), "verified readback must set the existing success state");
  assert.equal(app.split(successSetter).length - 1, 1, "no pre-finality success setter may exist");
  assert.ok(panelStart >= 0 && successRender > panelStart && successRender < nextPanel, "success callout must render inside the registration panel");
  assert.ok(app.includes("<strong>Agent version registered successfully</strong>"));
  assert.ok(app.includes("<code>{registrationSuccessId}</code> is now recorded on Studio Dev."));
  assert.ok(app.includes('if (registrationSuccessId && registrationSuccessId !== versionId) setRegistrationSuccessId("");'));
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
