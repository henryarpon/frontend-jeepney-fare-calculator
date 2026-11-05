# Frontend (Angular)

Angular (latest stable), TypeScript strict mode, standalone components.
Classic file layout: every component has its own `.ts`, `.html`, and `.css` file.
The owner reads this code personally, so keep it easy to follow.

## Commands
Run from `frontend/`.
- Install: `npm install`
- Dev server: `npm start` (http://localhost:4200)
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint` (if configured)
- Generate component: `ng generate component features/<feature>/components/<name> --type=component`
- Generate service: `ng generate service core/services/<name> --type=service`

## Component file format (IMPORTANT)
- Every component = three separate files: `<name>.component.ts`, `<name>.component.html`, `<name>.component.css`.
- NEVER use inline `template:` or `styles:`. Always `templateUrl` and `styleUrl`.
- Keep the `.component.ts` / `.service.ts` suffixes in file names (use `--type=component` / `--type=service` when generating).
- Keep logic in the `.ts` file, markup in `.html`, styling in `.css`. No logic-heavy expressions in templates; compute in the class.

## Architecture
Feature-based folders:

```
src/app/
  core/        # singletons: auth, interceptors, guards, API/config services
  shared/      # reusable dumb components, pipes, directives, utilities
  features/
    <feature>/
      pages/        # routed (smart) components
      components/   # feature-specific presentational components
      services/     # feature data access and state
      models/       # interfaces and types for this feature
      <feature>.routes.ts
  app.routes.ts
```

- Lazy-load each feature through its routes file.
- Smart components (pages) fetch data and coordinate. Presentational components take `input()`s, emit `output()`s, and call no services.
- Features may import from `core` and `shared`, never from other features. Move shared code into `shared`.
- One component per file set. Keep components small; split when a template gets long.

## Conventions
- Standalone components only. No NgModules.
- Use signals for local state. Use RxJS where streams are genuinely needed (HTTP, events).
- Use the built-in control flow (`@if`, `@for`, `@switch`), with `track` in every `@for`.
- Use `inject()` for dependencies and `ChangeDetectionStrategy.OnPush` on components.
- Use `input()` / `output()` functions rather than the decorators.
- HTTP calls live in services, never in components. Services return typed results.
- Strong typing: no `any`. Define interfaces in `models/` that mirror backend DTOs.
- Forms: reactive forms with typed `FormGroup`s.
- Avoid manual `subscribe()` in components. Prefer the `async` pipe, `toSignal`, or `takeUntilDestroyed`.
- Naming: `kebab-case` files, `PascalCase` classes, `camelCase` members, `Component`/`Service` suffixes, selectors prefixed `app-`.
- CSS: component-scoped styles in the component's `.css`. Global styles and design tokens (colors, spacing) go in `src/styles.css`.
- API base URL comes from environment config, never hardcoded.

## Gotchas
- <e.g. dev server proxies `/api` to the backend via `proxy.conf.json`>
- <e.g. auth tokens are attached by an interceptor in `core/`>
- <e.g. models in `features/*/models` must be updated when backend DTOs change>
