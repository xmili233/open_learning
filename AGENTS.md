# Repository instructions

## Product source of truth

- Read `docs/MVP_PROPOSAL.md` before changing product scope, learning behavior,
  the Plugin contract, or the MCP tool surface.
- Read `DESIGN.md` before changing any user-visible layout, component, style,
  interaction, copy, or state.
- For a material UI change, copy `docs/design/UI_CHANGE_TEMPLATE.md` into the
  feature work and obtain explicit approval before implementation. A material
  change adds or changes a screen, flow, primary action, component behavior,
  user promise, consequential action, or user-visible state meaning.

## UI workflow

All product-level UI uses shadcn/ui or a shadcn ecosystem component. The
learning-content renderer may own its rendering primitives; its surrounding
chrome, controls, overlays, status, settings, and onboarding still use shadcn.

Before creating product UI:

1. Inspect `src/renderer/components/ui`.
2. Use the current shadcn CLI to search or view a missing primitive.
3. Add source with the shadcn CLI.
4. Compose installed primitives before writing a custom component.
5. Document why existing primitives are insufficient when custom interaction
   remains necessary.

Use semantic tokens from `DESIGN.md`, `cn()` for conditional classes, `gap-*`
for sibling spacing, and `size-*` for equal dimensions. Use Lucide icons through
the configured library; button icons use `data-icon`. Use `AlertDialog` for
destructive confirmation, `Skeleton` for loading, `Empty` for empty states, and
Sonner for transient feedback.

## Completion

Keep MCP tool input free of HTML, CSS, SVG, and absolute coordinates. Preserve
the sandboxed Electron renderer and authenticated local IPC boundary. Run
`npm run check` after implementation; UI work also requires a production
renderer build and keyboard, reduced-motion, English, and Simplified Chinese
verification for each changed surface.
