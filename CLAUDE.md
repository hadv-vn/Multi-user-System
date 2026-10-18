# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This repository is currently empty — no code, configuration, or documentation has been added yet. There are no build, lint, or test commands to document, and no architecture to describe.

When this project is initialized (e.g. framework chosen, source files added, git repo set up), update this file with:
- Build / run / lint / test commands (including how to run a single test)
- High-level architecture and major components

## UI Design Principles

All UI must have a futuristic look and feel. When building or reviewing UI:
- Prefer dark, high-contrast themes with accent colors (neon/glow tones) over flat light themes.
- Use glassmorphism (translucency, blur) and subtle gradients instead of plain solid backgrounds.
- Use geometric, clean sans-serif typography — avoid ornate or overly traditional fonts.
- Favor smooth motion/transition effects (fade, glow, slide) over static, abrupt UI changes.
- Avoid skeuomorphic or dated Web 1.0/Material-default styling; lean toward sci-fi/HUD-inspired visual language.

## Code Style Principles

Code must be clear and object-oriented. When writing or reviewing code:
- Model domains with classes/objects (OOP) rather than loose procedural scripts or God functions/files.
- Follow SOLID:
  - **S**ingle Responsibility — each class/module has one reason to change.
  - **O**pen/Closed — extend behavior via new code (subclasses, strategies), avoid editing stable code for every new case.
  - **L**iskov Substitution — subtypes must be usable anywhere their base type is expected, without surprises.
  - **I**nterface Segregation — prefer small, focused interfaces over large catch-all ones.
  - **D**ependency Inversion — depend on abstractions/interfaces, not concrete implementations; inject dependencies rather than hardcoding them.
- Apply standard design patterns (Factory, Strategy, Observer, Repository, Adapter, Singleton, etc.) where they genuinely fit the problem — don't force a pattern where plain code is clearer.
- Favor clear, descriptive naming and small, cohesive classes/methods over clever or terse code.
- Avoid premature abstraction: only introduce a pattern/interface when there is a real current need (e.g. multiple implementations, need to swap behavior), not speculative future-proofing.
- No "free-style" formatting — follow the official Google Style Guide for the language in use (e.g. Google Java Style Guide, Google TypeScript/JavaScript Style Guide, Google C++ Style Guide, PEP 8 for Python per Google's Python Style Guide), including naming conventions, indentation, file/class layout, and import ordering.
- Use/configure the matching linter/formatter for the chosen language (e.g. ESLint+Prettier with Google config, clang-format, checkstyle) once the stack is decided, and keep code passing it — do not hand-roll inconsistent formatting.

## File & Folder Naming Conventions

Names must be consistent and predictable — no mixing styles within the same project:
- **Folders**: `kebab-case` (e.g. `user-profile/`, `order-service/`).
- **Source files**: follow the language's Google Style Guide convention —
  - Java/Kotlin: `PascalCase.java`/`.kt` matching the public class name.
  - Python: `snake_case.py`.
  - JS/TS: `kebab-case.ts` for modules/utilities, `PascalCase.tsx` for components/classes.
  - C++: `snake_case.cc`/`.h`.
- **Classes/Types**: `PascalCase` (e.g. `UserRepository`, `OrderController`).
- **Functions/variables**: `camelCase` (JS/TS/Java) or `snake_case` (Python), per that language's Google Style Guide — never mixed within one file.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Test files**: mirror the file under test with a `*.test.*`/`*_test.*`/`*Test.*` suffix matching the language convention, placed alongside or in a parallel `tests/`/`__tests__/` structure.
- **No spaces, no uppercase folder names, no ambiguous abbreviations** — prefer clear full words over cryptic shortenings.

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary, imperative mood, lowercase, no trailing period>

<optional body: explain why, not what>

<optional footer: BREAKING CHANGE:, Refs:, Closes:>
```

- **Allowed types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `build`, `ci`.
- **Scope** (optional): the affected module/feature, e.g. `feat(auth): add refresh token rotation`.
- **Summary**: ≤ 72 chars, describes what the commit does, not a changelog of files touched.
- **Breaking changes**: add `!` after type/scope (e.g. `feat(api)!: ...`) and a `BREAKING CHANGE:` footer explaining the impact.
- One logical change per commit — do not bundle unrelated fixes/features into a single commit.
