<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Demo-only app: all data is seeded mock data in `src/lib/seed.ts`, held in a small external store (`src/lib/store.ts`) persisted to localStorage — no backend, by design (prototype must not connect to real services).
- All cost/routing logic is deterministic and lives in `src/lib/engine.ts`, covered by `src/lib/engine.test.ts`; UI never recomputes rules itself.
- Recommendations, decisions and feedback are append-only versions; never mutate earlier entries.
