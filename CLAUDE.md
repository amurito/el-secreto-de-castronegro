# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

*El Secreto de Castronegro* — a free, deterministic interactive-fiction engine for *La Llamada de Cthulhu* 7e (Call of Cthulhu), entirely in Spanish. No AI, no server, no accounts: the engine runs 100% in the browser, the event log lives in the player's IndexedDB, and the prose is hand-written content per adventure. There *was* an LLM Keeper that narrated with Claude; it was fully removed (see `ROADMAP.md` §3.2-undecies and `README.md`) — "Keeper" in the code now means the deterministic offline resolver in `src/keeper/`, not an AI.

Read `README.md` first — it explains the project's thesis (the engine owns state, nothing else can), the verifiable RNG chain, and the canon/disclosure system in more depth than is repeated here. `CANON.md` holds the campaign's canon bible. `ROADMAP.md` is the running design log — every feature/bugfix this project has shipped gets a dated, reasoned entry there; skim it before assuming something is unbuilt.

## Commands

```bash
npm run dev              # dev server (Vite), http://localhost:5173
npm run check             # typecheck only (tsc --noEmit)
npm run build              # typecheck + vite build → dist/web
npm run preview            # serve the static build, as it would ship
npm run desplegar          # test + build + audit + publish to gh-pages (see README)
npm run revisar:bundle     # audits the built JS for leaked spoilers/secrets

npm run prueba:todo        # every suite below, in order, then build + revisar:bundle — this is what CI runs
npm run prueba:combate     # e.g., run one suite directly with tsx
npx tsx src/prueba-combate.ts   # equivalent — every suite is a standalone script
```

Each `src/prueba-*.ts` is a self-contained Node script (`tsx`, no test runner/framework) that both exercises the engine end-to-end and documents intent in its own header comment and `console.log` section headers. There is no way to run "a single test" inside a suite — the files are small enough (a few hundred lines) to run whole; add new cases to the relevant existing file rather than creating a new suite unless testing a genuinely new subsystem. `package.json`'s `prueba:todo` line is the single source of truth for which suites exist and run in CI (`.github/workflows/verificar.yml` intentionally just runs that one script rather than listing suites itself, to avoid the two lists drifting apart).

Before considering any engine/content change done: `npm run check`, the relevant `prueba:*` suite(s), then `npm run prueba:todo` for a final pass. For UI changes, use the Browser pane to click through the actual flow — there is no component-level test harness.

## Architecture

```
src/
  shared/     types + events + client/server protocol (the vocabulary everything else uses)
  rules/      CoC 7e + Umbral mechanics. PURE: no I/O, no randomness, no network
  engine/     event log · RNG · crypto · reducers · gates · tool dispatch (Turn class)
              store.ts (interface) + store.node.ts (JSONL) + store.browser.ts (IndexedDB)
  scenario/   the six adventures + pregen investigators + the condition DSL
              <aventura>.contenido.json ← places, NPCs, topics, scenes, endings (data)
              <aventura>.logica.ts      ← only the `resolver` function per scene (code)
              <aventura>.ts             ← ~3-line assembler: cargarAventura(json, logica, pregens)
              catalogo.ts registers every adventure, sorted by in-fiction date
  keeper/     intent classification · narration · offline turn resolution (deterministic, no LLM)
  app/        api.ts (interface) + api.local.ts (the only implementation) + sanitize.ts + creacion.ts + plantillas.ts
  web/        React UI
```

**Dependency rule, enforced by convention (not tooling)**: `rules` imports nothing project-internal · `engine` imports `rules` · `keeper` imports `engine` · `engine` never imports `keeper`. The arrow only points one way: whoever narrates depends on state, never the reverse. `app` depends on `engine`+`keeper`; `web` depends on `app`.

**Content is data, branching is code.** A scene declares WHEN it responds, WHAT roll it needs, and WHAT it leaves (`EfectoEscena` in `src/scenario/escena.ts`) — the engine never knows what a specific adventure's objects mean. Conditions (`visible`/`disponible`/`hecha`/`cuando`/`agotado`/`disponible` gates) are a small closed DSL (`src/scenario/condiciones.ts`, type `Condicion`), evaluated purely against `GameState` — e.g. `{op:'pista', contiene:'...'}`, `{op:'consecuencia', contiene:'...'}`, `{op:'y'|'no', de:[...]}`. This is how cross-adventure hooks work: adventure N records a permanent `consequence` (`scope:'campaign'|'world'`), and adventure N+1's gates read it via `{op:'consecuencia', contiene:'...'}` — no new plumbing needed per hook, just a matching substring.

**Engine is genuinely generic; only content is adventure-specific.** When a mechanism needs adventure-specific configuration (e.g. combat's `iniciaCombate`/`salidaPacifica`), the pattern is: the engine reads an optional field the *scene* sets, and behaves as a no-op when it's absent. Follow this when extending the engine — never hardcode a check for a specific NPC id or adventure id inside `src/engine/`.

**Tools are the only way to mutate state.** `Turn.executeTool(name, raw)` in `src/engine/engine.ts` is a flat switch dispatching to private `toolXxx` methods; each validates, may reject (`this.reject(...)`, surfaced to the caller prefixed `RECHAZADO POR EL MOTOR:`), and on success calls `this.emit(eventType, payload)`. Adding a tool means: a `case` in that switch + the private method + (if it produces new state) a payload type in `src/shared/events.ts` + a reducer `case` in `src/engine/reducers.ts`. `src/engine/tools.ts` (an LLM tool-schema catalog) is dead code left over from the removed AI Keeper — nothing imports it; don't feel obliged to keep it in sync.

**RNG is a single verifiable HMAC chain**, never `Math.random()` for anything that counts. Seed is committed (SHA-256 shown to the player) at campaign start and revealed only at the end, so it can't be used to predict future rolls. `tiradaInterna` (in `engine.ts`) is how the engine rolls *for an NPC* without going through the public `request_roll` tool — reuse it for any new "opposed roll against an NPC" mechanic (see `toolResolveManeuver`/`toolResolveIntimidate` for the pattern: investigator rolls via `toolRequestRoll`, NPC resists via `tiradaInterna` using some stat off `Npc.combate` as a stand-in — NPCs have no full characteristic sheet, only the optional `combate: CombateNpc` block).

**No free text, by design.** The player only ever clicks buttons; `src/scenario/acciones.ts`'s `accionesDisponibles()` computes the full available action list from `GameState` every turn, so nothing is ever offered before its gate is satisfied. There is no text input in the shipped UI — don't assume one when reasoning about UX changes.

**Combat** has its own dedicated screen (`src/web/Combate.tsx`), separate from the normal narration UI, entered automatically when `GameState.activeCombat` is set and exited automatically when it clears — no manual "leave" affordance. It's driven by `combateAtacar`/`combateHuir`/`combateManiobra`/`combateIntimidar` in `src/app/api.local.ts`, which call `Turn.executeTool(...)` directly (bypassing the intent classifier) and narrate each asalto into the permanent story log so it survives leaving the screen. `src/web/Simulador.tsx` is a separate, no-narration combat sandbox (any weapon, synthetic rivals) for testing rules in isolation — don't confuse the two when changing combat.

**Canon has two independent axes**: `truth_level` × `disclosure` (a fact can be canon *and* sealed at once). Anything marked `SEALED` must never end up in a published adventure's content — `npm run revisar:bundle` audits the built JS for this before every deploy and fails the build if it finds a leak.

## Conventions specific to this repo

- **Everything is in Spanish**: code comments, domain identifiers (`pista`, `pelea`, `desenlace`, `consecuencia`), commit messages, and all in-game text. Match this when writing new content or comments.
- Comments are used liberally to record *why* a non-obvious decision was made (often "reported playing, on date/version X") — this is a deliberate project convention, not comment bloat to trim. Follow it for genuinely non-obvious rationale; don't add comments that just restate the code.
- New engine-level features go through the same design pass every time: identify the existing tool/pattern closest to what's needed, reuse its shape, and keep the engine ignorant of any specific adventure's content.
