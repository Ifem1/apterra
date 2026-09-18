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

test("newly submitted writes automatically track the same hash without retry or resubmission", () => {
  const submitCall = "const hash = await submitPreparedWrite(walletClient, contractAddress, prepared);";
  assert.equal(app.split(submitCall).length - 1, 1, "the prepared write must be submitted exactly once");
  assert.ok(app.indexOf("await trackPendingEntry(entry, updated);") > app.indexOf(submitCall), "the new entry must be tracked after its one submission");
  assert.ok(app.includes("waitForFinalization({ hash: current.hash as never"), "automatic tracking must use the exact submitted hash");
  assert.ok(app.includes("no automatic retry or resubmission will be sent"));
  assert.ok(app.includes('onClick={() => void trackDecision(item.hash)}>Check decision'));
  assert.ok(app.includes('onClick={() => void trackTransaction(item.hash)}>Check finality'));
});

test("registration success requires successful finality, execution, and exact canonical Version ID readback", () => {
  const panelStart = app.indexOf("<h3>Register an agent version</h3>");
  const successRender = app.indexOf('{registrationSuccessId && <div className="registration-success"', panelStart);
  const nextPanel = app.indexOf("<h3>Create a capability claim</h3>", panelStart);
  assert.ok(app.includes("const confirmed = summary.successful && readbackMatched;"));
  assert.ok(app.includes("readback.startsWith(`READBACK_MATCH ${current.readMethod} ${current.readId}`)"));
  assert.equal(app.split("setRegistrationSuccessId(current.readId);").length - 1, 1, "failure or pre-finality paths must never set registration success");
  assert.ok(panelStart >= 0 && successRender > panelStart && successRender < nextPanel);
  assert.ok(app.includes("<strong>Agent version registered successfully</strong>"));
  assert.ok(app.includes("<code>{registrationSuccessId}</code> is now recorded on Studio Dev."));
  assert.ok(app.includes("Transaction finalized successfully, but canonical readback was not verified"));
});

test("registration success persists until dismissal, Version ID change, or another registration preparation", () => {
  assert.equal(app.includes("setTimeout(() => setRegistrationSuccessId"), false);
  assert.equal(css.includes("apterra-toast-out"), false);
  assert.equal(css.includes("5.25s"), false);
  assert.ok(app.includes('if (registrationSuccessId && registrationSuccessId !== versionId) setRegistrationSuccessId("");'));
  assert.ok(app.includes('if (action.functionName === "register_agent_version") setRegistrationSuccessId("");'));
  assert.ok(app.includes('onClick={() => setRegistrationSuccessId("")} aria-label="Dismiss registration success"'));
});

test("wallet chrome only labels proven stewardship and explains injected-wallet mobile scope", () => {
  assert.equal(app.includes('"Reviewer"'), false);
  assert.equal(app.includes("const isExecutor = false"), false);
  assert.equal(app.includes("const isApprover = false"), false);
  assert.equal(app.includes("const isConsumer = false"), false);
  assert.ok(app.includes('{account && isOwner && <span className="role-label">Steward</span>}'));
  assert.ok(app.includes("On mobile, open APTERRA inside an injected-wallet/dapp browser; standard mobile browsers cannot sign."));
});
test("homepage copy and reduced-motion reveal are present", () => {
  assert.ok(app.includes("Before an agent receives consequential permission, APTERRA asks it to prove what it can do against a real policy, a committed challenge, and independent GenLayer judgment."));
  assert.equal(app.includes("what it can do — against a real policy"), false);
  assert.ok(app.includes('className="hero-headline-reveal"'));
  assert.ok(css.includes("apterra-headline-reveal"));
  assert.ok(css.includes("prefers-reduced-motion:reduce"));
});
