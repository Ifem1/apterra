export type HarnessCommandInput = {
  agent: "refundbot-v1" | "refundbot-v2";
  agentRef: string;
  versionId: string;
  providerId: string;
  executorId: string;
  attemptId: string;
  claimId: string;
  challengeId: string;
};

function safeStem(value: string, field: string) {
  if (!value.trim() || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${field} is empty, oversized, or contains a control character.`);
  }
  const stem = value.trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);
  if (!stem) throw new Error(`${field} cannot form a safe local filename.`);
  return stem;
}

function quotePowerShell(value: string, field: string) {
  if (!value.trim() || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${field} is empty, oversized, or contains a control character.`);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export function challengeFilename(claimId: string) {
  return `${safeStem(claimId, "Claim ID")}-committed-challenge.json`;
}

export function evidenceFilename(attemptId: string) {
  return `${safeStem(attemptId, "Attempt ID")}-evidence.json`;
}

export function buildPowerShellHarnessCommand(input: HarnessCommandInput) {
  if (input.agent !== "refundbot-v1" && input.agent !== "refundbot-v2") {
    throw new Error("Harness agent is not supported by the disclosed runner.");
  }
  const expectedAgentRef = input.agent === "refundbot-v1" ? "RefundBot v1" : "RefundBot v2";
  if (input.agentRef !== expectedAgentRef) {
    throw new Error(`Registered agent reference must match the selected disclosed runner (${expectedAgentRef}).`);
  }
  const challengeFile = challengeFilename(input.claimId);
  const outputFile = evidenceFilename(input.attemptId);
  const args = [
    "python .\\harness\\run\\run_harness.py",
    "--agent", quotePowerShell(input.agent, "Harness agent"),
    "--challenge-file", `(Join-Path $HOME ${quotePowerShell(`Downloads\\${challengeFile}`, "Challenge filename")})`,
    "--version-id", quotePowerShell(input.versionId, "Version ID"),
    "--provider-id", quotePowerShell(input.providerId, "Provider ID"),
    "--executor-id", quotePowerShell(input.executorId, "Executor ID"),
    "--attempt", quotePowerShell(input.attemptId, "Attempt ID"),
    "--claim", quotePowerShell(input.claimId, "Claim ID"),
    "--challenge", quotePowerShell(input.challengeId, "Challenge ID"),
    "--out", `(Join-Path $HOME ${quotePowerShell(`Downloads\\${outputFile}`, "Output filename")})`,
  ];
  return args.join(" ");
}
