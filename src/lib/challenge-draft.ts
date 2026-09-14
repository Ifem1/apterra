export type ChallengeInput = {
  case_id: string;
  case_type: "ROUTINE_ELIGIBLE" | "CLEARLY_INELIGIBLE" | "AMBIGUOUS_EXCEPTION" | "ADVERSARIAL_POLICY_OVERRIDE";
  customer: string;
};

export type ChallengeDraft = {
  claimId: string;
  challengeId: string;
  executor: string;
  cases: ChallengeInput[];
  commitment: string;
};

export const CHALLENGE_DRAFT_KEY = "apterra:studio-dev:challenge-draft:v1";
const EXPECTED_CASE_TYPES: ChallengeInput["case_type"][] = [
  "ROUTINE_ELIGIBLE", "CLEARLY_INELIGIBLE", "AMBIGUOUS_EXCEPTION", "ADVERSARIAL_POLICY_OVERRIDE",
];

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function computeChallengeCommitment(
  cases: ChallengeInput[], policyHash: string, riskPolicyHash: string, rubricHash: string,
): Promise<string> {
  const payload = canonical({ cases, policy_hash: policyHash, risk_policy_hash: riskPolicyHash, rubric_hash: rubricHash });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isDraft(value: unknown): value is ChallengeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (typeof draft.claimId !== "string" || draft.claimId.length < 1 || draft.claimId.length > 128
    || typeof draft.challengeId !== "string" || draft.challengeId.length < 1 || draft.challengeId.length > 128
    || typeof draft.executor !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(draft.executor)
    || typeof draft.commitment !== "string" || !/^[a-f0-9]{64}$/.test(draft.commitment)
    || !Array.isArray(draft.cases) || draft.cases.length !== EXPECTED_CASE_TYPES.length) return false;
  const cases = draft.cases as unknown[];
  if (!cases.every((item, index) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return typeof record.case_id === "string" && record.case_id.length > 0 && record.case_id.length <= 128
      && record.case_type === EXPECTED_CASE_TYPES[index]
      && typeof record.customer === "string" && record.customer.length > 0 && record.customer.length <= 1000;
  })) return false;
  return new Set(cases.map((item) => (item as ChallengeInput).case_id)).size === cases.length;
}

export async function restoreChallengeDraft(
  storage: Pick<Storage, "getItem">,
  policyHash: string,
  riskPolicyHash: string,
  rubricHash: string,
): Promise<ChallengeDraft | null> {
  try {
    const encoded = storage.getItem(CHALLENGE_DRAFT_KEY);
    if (!encoded) return null;
    const value: unknown = JSON.parse(encoded);
    if (!isDraft(value)) return null;
    const actual = await computeChallengeCommitment(value.cases, policyHash, riskPolicyHash, rubricHash);
    return actual === value.commitment ? value : null;
  } catch { return null; }
}

export async function persistChallengeDraft(
  storage: Pick<Storage, "setItem">,
  draft: Omit<ChallengeDraft, "commitment">,
  policyHash: string,
  riskPolicyHash: string,
  rubricHash: string,
): Promise<ChallengeDraft> {
  if (!isDraft({ ...draft, commitment: "0".repeat(64) })) throw new Error("Challenge draft is incomplete or outside the supported schema.");
  const complete = {
    ...draft,
    commitment: await computeChallengeCommitment(draft.cases, policyHash, riskPolicyHash, rubricHash),
  };
  storage.setItem(CHALLENGE_DRAFT_KEY, JSON.stringify(complete));
  return complete;
}
