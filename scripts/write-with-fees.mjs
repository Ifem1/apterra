import { spawnSync } from "node:child_process";

const [address, method, ...args] = process.argv.slice(2);
if (!address || !method) throw new Error("usage: node scripts/write-with-fees.mjs <address> <method> [args...]");
const cli = ".\\node_modules\\.bin\\genlayer.cmd";
const estimate = spawnSync(cli, ["estimate-fees", address, method, "--json", "--args", ...args], { encoding: "utf8", shell: true });
if (estimate.status !== 0) throw new Error(estimate.stdout + estimate.stderr);
const match = estimate.stdout.match(/\{[\s\S]*\}/);
if (!match) throw new Error("FEE_ESTIMATE_JSON_MISSING");
const parsed = JSON.parse(match[0]);
if (!parsed.feeValue || BigInt(parsed.feeValue) <= 0n || !parsed.distribution) throw new Error("INVALID_FEE_ESTIMATE");
const fees = { distribution: parsed.distribution, ...(parsed.messageAllocations?.length ? { messageAllocations: parsed.messageAllocations } : {}) };
console.log(JSON.stringify({ method, feeValue: String(parsed.feeValue), distribution: fees.distribution }, (_, v) => typeof v === "bigint" ? v.toString() : v));
const feesArg = JSON.stringify(fees).replace(/"/g, '\\"');
const write = spawnSync(cli, ["write", address, method, "--args", ...args, "--fees", feesArg, "--fee-value", String(parsed.feeValue)], { encoding: "utf8", shell: true });
process.stdout.write(write.stdout);
process.stderr.write(write.stderr);
process.exit(write.status ?? 1);
