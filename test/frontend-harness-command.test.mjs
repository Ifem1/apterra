import assert from "node:assert/strict";
import test from "node:test";
import { buildPowerShellHarnessCommand, challengeFilename, evidenceFilename } from "../src/lib/harness-command.ts";

const input = {
  agent: "refundbot-v1",
  agentRef: "RefundBot v1",
  versionId: "version-one",
  providerId: "provider-one",
  executorId: "0x1111111111111111111111111111111111111111",
  attemptId: "attempt-1",
  claimId: "claim-1",
  challengeId: "challenge-1",
};

test("harness command binds form values and exact browser-download filenames", () => {
  const command = buildPowerShellHarnessCommand(input);
  assert.match(command, /--version-id 'version-one'/);
  assert.match(command, /--provider-id 'provider-one'/);
  assert.match(command, /--executor-id '0x1111111111111111111111111111111111111111'/);
  assert.match(command, /Downloads\\claim-1-committed-challenge\.json/);
  assert.match(command, /Downloads\\attempt-1-evidence\.json/);
  assert.equal(challengeFilename("claim / 1"), "claim___1-committed-challenge.json");
  assert.equal(evidenceFilename("attempt.1"), "attempt_1-evidence.json");
});

test("PowerShell quoting escapes apostrophes and rejects command-line control characters", () => {
  assert.match(buildPowerShellHarnessCommand({ ...input, providerId: "provider's test" }), /--provider-id 'provider''s test'/);
  assert.throws(() => buildPowerShellHarnessCommand({ ...input, versionId: "version\n; malicious" }), /control character/);
  assert.throws(() => buildPowerShellHarnessCommand({ ...input, agent: "other-agent" }), /Harness agent/);
  assert.throws(() => buildPowerShellHarnessCommand({ ...input, agent: "refundbot-v2" }), /Registered agent reference must match/);
});
