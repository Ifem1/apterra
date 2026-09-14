export type AgentVersionRecord = {
  id: string;
  operator: string;
  agent_ref: string;
  model_id: string;
  provider_id: string;
  adapter_id: string;
  system_policy_hash: string;
  tool_manifest_hash: string;
  runtime_hash: string;
  harness_version: string;
  created_at: string;
  status: "ACTIVE" | "SUSPENDED" | "UNKNOWN";
};

export function parseAgentVersionIds(value: unknown): string[] {
  if (typeof value !== "string" || value.length > 65_536) throw new Error("The contract returned a non-string or oversized version catalog.");
  let decoded: unknown;
  try { decoded = JSON.parse(value); } catch { throw new Error("The contract returned malformed version-catalog JSON."); }
  if (!Array.isArray(decoded) || decoded.length > 256
    || !decoded.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
    || new Set(decoded).size !== decoded.length) {
    throw new Error("The canonical version catalog is outside its supported schema.");
  }
  return decoded;
}

export function parseAgentVersionRecord(value: unknown, expectedId: string): AgentVersionRecord {
  if (typeof value !== "string" || value.length > 8_192) throw new Error("The contract returned a non-string or oversized version record.");
  let decoded: unknown;
  try { decoded = JSON.parse(value); } catch { throw new Error("The contract returned malformed version-record JSON."); }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new Error("The contract returned a version record with the wrong shape.");
  }
  const record = decoded as Record<string, unknown>;
  const required = ["id", "operator", "agent_ref", "model_id", "provider_id", "adapter_id", "system_policy_hash", "tool_manifest_hash", "runtime_hash", "harness_version", "created_at"];
  if (record.id !== expectedId || required.some((field) => typeof record[field] !== "string" || (record[field] as string).length > 1000)) {
    throw new Error("The canonical version record is incomplete or does not match its catalog ID.");
  }
  for (const field of ["system_policy_hash", "tool_manifest_hash", "runtime_hash"]) {
    if (!/^[a-fA-F0-9]{64}$/.test(record[field] as string)) throw new Error(`The canonical version record has an invalid ${field}.`);
  }
  return {
    id: record.id as string,
    operator: record.operator as string,
    agent_ref: record.agent_ref as string,
    model_id: record.model_id as string,
    provider_id: record.provider_id as string,
    adapter_id: record.adapter_id as string,
    system_policy_hash: record.system_policy_hash as string,
    tool_manifest_hash: record.tool_manifest_hash as string,
    runtime_hash: record.runtime_hash as string,
    harness_version: record.harness_version as string,
    created_at: record.created_at as string,
    status: record.status === "ACTIVE" || record.status === "SUSPENDED" ? record.status : "UNKNOWN",
  };
}
