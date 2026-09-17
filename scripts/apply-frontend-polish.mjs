import fs from "node:fs";

const appPath = "app/components/ApterraApp.tsx";
const cssPath = "app/globals.css";
const testPath = "test/frontend-polish.test.mjs";

function replaceOnce(source, from, to, label) {
  const index = source.indexOf(from);
  if (index === -1) throw new Error(`Missing patch anchor: ${label}`);
  if (source.indexOf(from, index + from.length) !== -1) throw new Error(`Patch anchor is not unique: ${label}`);
  return source.slice(0, index) + to + source.slice(index + from.length);
}

let app = fs.readFileSync(appPath, "utf8");

app = replaceOnce(app,
`  const [challengeInputsRevealed, setChallengeInputsRevealed] = useState(false);\n  const harnessCommand = useMemo(() => {`,
`  const [challengeInputsRevealed, setChallengeInputsRevealed] = useState(false);\n  const [registrationWarning, setRegistrationWarning] = useState("");\n  const [registrationSuccessId, setRegistrationSuccessId] = useState("");\n  const registrationValidationError = useMemo(() => {\n    const required = [\n      ["Version ID", versionId],\n      ["Agent reference", agentRef],\n      ["Model ID", modelId],\n      ["Provider / deployment ID", providerId],\n      ["Adapter ID", adapterId],\n      ["System-policy SHA-256", systemHash],\n      ["Tool-manifest SHA-256", toolsHash],\n      ["Runtime SHA-256", runtimeHash],\n      ["Harness version", harnessVersion],\n    ] as const;\n    const missing = required.find(([, value]) => !value.trim());\n    if (missing) return \`${"${missing[0]}"} is required before preparing registration.\`;\n    const hashes = [["System-policy SHA-256", systemHash], ["Tool-manifest SHA-256", toolsHash], ["Runtime SHA-256", runtimeHash]] as const;\n    const malformed = hashes.find(([, value]) => !/^[a-f0-9]{64}$/.test(value));\n    return malformed ? \`${"${malformed[0]}"} must be 64 lowercase hexadecimal characters.\` : "";\n  }, [adapterId, agentRef, harnessVersion, modelId, providerId, runtimeHash, systemHash, toolsHash, versionId]);\n\n  useEffect(() => {\n    if (!registrationWarning) return;\n    if (!registrationValidationError) setRegistrationWarning("");\n    else if (registrationWarning !== registrationValidationError) setRegistrationWarning(registrationValidationError);\n  }, [registrationValidationError, registrationWarning]);\n\n  useEffect(() => {\n    if (!registrationSuccessId) return;\n    const timer = window.setTimeout(() => setRegistrationSuccessId(""), 5600);\n    return () => window.clearTimeout(timer);\n  }, [registrationSuccessId]);\n\n  const harnessCommand = useMemo(() => {`,
"registration feedback state");

app = replaceOnce(app,
`      setPrepared(quote);\n      setNotice("Fee quote matches the configured Studio Dev profile. Review the exact action before signing.");\n      setNoticeTone("good");\n    } catch (error) {\n      setNotice(error instanceof Error ? error.message : "Could not prepare this write.");\n      setNoticeTone("warn");`,
`      setPrepared(quote);\n      if (action.functionName === "register_agent_version") setRegistrationWarning("");\n      setNotice("Fee quote matches the configured Studio Dev profile. Review the exact action before signing.");\n      setNoticeTone("good");\n    } catch (error) {\n      const message = error instanceof Error ? error.message : "Could not prepare this write.";\n      if (action.functionName === "register_agent_version") setRegistrationWarning(message);\n      setNotice(message);\n      setNoticeTone("warn");`,
"registration prepare errors");

app = replaceOnce(app,
`      const next = pending.map((item) => item.hash === hash`,
`      if (summary.successful && current?.method === "register_agent_version" && current.readId && readback.startsWith("READBACK_MATCH get_agent_version ")) {\n        setRegistrationSuccessId(current.readId);\n      }\n      const next = pending.map((item) => item.hash === hash`,
"confirmed registration toast trigger");

app = replaceOnce(app,
`      </header>\n\n      {view === "home" && <section className="hero" id="top">`,
`      </header>\n\n      {registrationSuccessId && <aside className="registration-success-toast" role="status" aria-live="polite">\n        <div><strong>Agent version registered successfully</strong><p><code>{registrationSuccessId}</code> is now registered on Studio Dev.</p></div>\n        <button type="button" onClick={() => setRegistrationSuccessId("")} aria-label="Dismiss registration success">×</button>\n      </aside>}\n\n      {view === "home" && <section className="hero" id="top">`,
"registration toast markup");

app = replaceOnce(app,
`          <h1>Capability earns<br /><em>authority.</em></h1>\n          <p>Before an agent receives consequential permission, APTERRA asks it to prove what it can do — against a real policy, a committed challenge, and independent GenLayer judgment.</p>`,
`          <h1 className="hero-headline-reveal">Capability earns<br /><em>authority.</em></h1>\n          <p>Before an agent receives consequential permission, APTERRA asks it to prove what it can do against a real policy, a committed challenge, and independent GenLayer judgment.</p>`,
"homepage headline and copy");

for (const [from, to] of [
  ['placeholder="refundbot-v1"', 'placeholder="unique-version-id"'],
  ['placeholder="claim-2026-001"', 'placeholder="unique-claim-id"'],
  ['placeholder="refund-order-123" maxLength={128} /></label>\n                <label>Requested refund ceiling', 'placeholder="resource-or-order-id" maxLength={128} /></label>\n                <label>Requested refund ceiling'],
  ['placeholder="refund-challenge-001"', 'placeholder="unique-challenge-id"'],
  ['placeholder="attempt-001"', 'placeholder="unique-attempt-id"'],
]) {
  app = replaceOnce(app, from, to, `placeholder ${from}`);
}

const oldRegistrationButton = `              <button className="action-button" disabled={busy || !contractAddress || !account || [versionId, agentRef, modelId, providerId, adapterId, systemHash, toolsHash, runtimeHash, harnessVersion].some((value) => !value.trim())} onClick={() => makeAction("Register agent version", "register_agent_version", [versionId, agentRef, modelId, providerId, adapterId, systemHash, toolsHash, runtimeHash, harnessVersion], "A new immutable version record binds provider/deployment, model, adapter, policy, tools, runtime and harness to the connected operator.")}>Prepare version registration <span>→</span></button>`;
const newRegistrationButton = `              {registrationWarning && <div className="registration-warning" role="alert"><span className="registration-warning-mark">!</span><div><strong>Registration needs attention</strong><p>{registrationWarning}</p></div><button type="button" onClick={() => setRegistrationWarning("")} aria-label="Dismiss registration warning">×</button></div>}\n              <button className="action-button" disabled={busy || !contractAddress || !account} onClick={() => {\n                if (registrationValidationError) {\n                  setRegistrationWarning(registrationValidationError);\n                  setNotice(registrationValidationError);\n                  setNoticeTone("warn");\n                  return;\n                }\n                setRegistrationWarning("");\n                void makeAction("Register agent version", "register_agent_version", [versionId, agentRef, modelId, providerId, adapterId, systemHash, toolsHash, runtimeHash, harnessVersion], "A new immutable version record binds provider/deployment, model, adapter, policy, tools, runtime and harness to the connected operator.");\n              }}>Prepare version registration <span>→</span></button>`;
app = replaceOnce(app, oldRegistrationButton, newRegistrationButton, "registration validation button");

if (app.includes('setVersionId("")')) throw new Error("Registration polish must not clear versionId.");
fs.writeFileSync(appPath, app);

let css = fs.readFileSync(cssPath, "utf8");
const cssAppend = `\n/* Frontend polish: registration feedback and homepage reveal. */\n.hero-headline-reveal{clip-path:inset(0 100% 0 0);animation:apterra-headline-reveal .95s steps(18,end) .04s both}\n@keyframes apterra-headline-reveal{to{clip-path:inset(0 0 0 0)}}\n.registration-warning{display:flex;align-items:flex-start;gap:12px;margin:0 0 16px;padding:14px 15px;background:#fff7d6;border:1px solid #e5cb68;border-left:3px solid var(--mint);color:#5e4b13}\n.registration-warning-mark{display:grid;place-items:center;flex:0 0 22px;height:22px;border:1px solid #c79e17;border-radius:50%;font:600 10px var(--mono)}\n.registration-warning>div{flex:1;min-width:0}.registration-warning strong{font:700 10px var(--display);color:#4d3c0b}.registration-warning p{margin:4px 0 0;font-size:10px;line-height:1.6;color:#725d1e}.registration-warning button,.registration-success-toast button{border:0;background:transparent;cursor:pointer;font-size:19px;line-height:1;color:inherit;padding:1px 3px}\n.registration-success-toast{position:fixed;z-index:60;top:100px;right:clamp(18px,4vw,56px);width:min(390px,calc(100vw - 36px));display:flex;align-items:flex-start;gap:14px;padding:17px 18px;background:var(--white);border:1px solid var(--line);border-top:3px solid var(--mint);box-shadow:0 18px 45px rgba(10,17,25,.2);color:var(--ink);animation:apterra-toast-in .22s ease-out both,apterra-toast-out .24s ease-in 5.25s forwards}\n.registration-success-toast>div{flex:1;min-width:0}.registration-success-toast strong{display:block;font:700 12px var(--display);color:var(--ink)}.registration-success-toast p{margin:6px 0 0;font-size:10px;line-height:1.6;color:var(--muted)}.registration-success-toast code{font:500 9px var(--mono);overflow-wrap:anywhere;color:var(--mint-dark)}\n@keyframes apterra-toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes apterra-toast-out{to{opacity:0;transform:translateY(-5px)}}\n:root[data-theme="dark"] .registration-warning{background:#2a2718;border-color:#6e5b1d;color:#e7d58b}:root[data-theme="dark"] .registration-warning strong{color:#f1dda0}:root[data-theme="dark"] .registration-warning p{color:#d3c385}\n@media(max-width:760px){.registration-success-toast{top:88px;right:18px}}\n@media(prefers-reduced-motion:reduce){.hero-headline-reveal{animation:none;clip-path:none}.registration-success-toast{animation:none}}\n`;
if (css.includes("apterra-headline-reveal")) throw new Error("Polish CSS already exists.");
fs.writeFileSync(cssPath, css + cssAppend);

const testSource = `import assert from "node:assert/strict";\nimport fs from "node:fs";\nimport test from "node:test";\n\nconst app = fs.readFileSync("app/components/ApterraApp.tsx", "utf8");\nconst css = fs.readFileSync("app/globals.css", "utf8");\n\ntest("underwriting uses generic guidance without hiding the disclosed RefundBot harness limitation", () => {\n  for (const placeholder of ["unique-version-id", "unique-claim-id", "unique-challenge-id", "unique-attempt-id", "resource-or-order-id"]) {\n    assert.ok(app.includes(\`placeholder=\\"${"${placeholder}"}\\"\`));\n  }\n  assert.ok(app.includes("RefundBot v1"));\n  assert.ok(app.includes("refundbot-v2"));\n});\n\ntest("registration feedback requires canonical readback and keeps versionId populated", () => {\n  assert.ok(app.includes('readback.startsWith("READBACK_MATCH get_agent_version ")'));\n  assert.ok(app.includes("Agent version registered successfully"));\n  assert.ok(app.includes("is now registered on Studio Dev."));\n  assert.ok(app.includes("Registration needs attention"));\n  assert.equal(app.includes('setVersionId("")'), false);\n});\n\ntest("homepage copy and reduced-motion reveal are present", () => {\n  assert.ok(app.includes("Before an agent receives consequential permission, APTERRA asks it to prove what it can do against a real policy, a committed challenge, and independent GenLayer judgment."));\n  assert.equal(app.includes("what it can do — against a real policy"), false);\n  assert.ok(app.includes('className="hero-headline-reveal"'));\n  assert.ok(css.includes("apterra-headline-reveal"));\n  assert.ok(css.includes("prefers-reduced-motion:reduce"));\n});\n`;
fs.writeFileSync(testPath, testSource);
