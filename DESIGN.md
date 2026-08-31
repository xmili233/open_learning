# Open Learning Design System

> Status: approved
>
> Approved by: project owner
>
> Approved at: 2026-08-31

This document is the source of truth for Open Learning product UI. It governs
application chrome, onboarding, settings, forms, menus, overlays, status UI,
and other user-facing surfaces. Learning-content rendering may use a dedicated
renderer, but its surrounding controls and overlays still follow this system.

## 1. Product character

Open Learning should feel calm, precise, and ready to teach. The interface
stays visually quiet so the learner's attention remains on the current lesson.

- One surface has one primary user job and one visually dominant action.
- Content and decisions appear before navigation, branding, and metadata.
- Start simple and reveal advanced controls only in context.
- Prefer familiar, accessible interaction primitives over custom behavior.
- Use color to communicate state, never to decorate the interface.
- Keep consequential actions explicit, interruptible, and recoverable where
  recovery is possible.
- Treat English and Simplified Chinese as complete product experiences.

## 2. Source hierarchy

When references conflict, resolve them in this order:

1. Open Learning's live-learning job, accessibility, and internationalization.
2. The product and content-design principles adapted from Polaris.
3. shadcn/ui component behavior and composition.
4. The restrained visual character observed in the third-party Vercel design
   reference.

The Vercel reference is an automatically extracted, AI-interpreted design-bites
artifact, not an official Vercel specification. Open Learning borrows visual
principles rather than Vercel identity, page composition, or proprietary marks.

## 3. Color

Open Learning v1 is light-only. Product components consume semantic tokens;
raw colors belong only in the token definition file.

### 3.1 Neutral and interactive tokens

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#fafafa` | Application canvas and page background |
| `surface` / `card` / `popover` | `#ffffff` | Controls, cards, dialogs, menus |
| `surface-secondary` | `#f3f3f3` | Recessed and selected neutral surfaces |
| `surface-tertiary` | `#ededed` | Stronger neutral separation |
| `foreground` | `#171717` | Primary text |
| `muted-foreground` | `#5d5d5d` | Supporting text |
| `subtle-foreground` | `#8f8f8f` | Disabled and low-priority text |
| `primary` | `#181818` | Primary actions |
| `primary-hover` | `#303030` | Primary action hover |
| `primary-active` | `#414141` | Primary action active |
| `primary-foreground` | `#ffffff` | Text on primary actions |
| `interactive` | `#0169cc` | Links and keyboard focus |
| `border-subtle` | `rgb(23 23 23 / 6%)` | Quiet grouping |
| `border` | `rgb(23 23 23 / 10%)` | Controls and containers |
| `border-strong` | `rgb(23 23 23 / 16%)` | Emphasized boundaries |
| `disabled` | `rgb(23 23 23 / 5%)` | Disabled control background |

Black primary actions and blue interactive affordances have different jobs.
Blue must not become a decorative brand wash or a second primary-button color.

### 3.2 State tokens

| State | Soft surface | Solid | Text |
| --- | --- | --- | --- |
| Info | `#e5f3ff` | `#0285ff` | `#0169cc` |
| Success | `#d9f4e4` | `#04b84c` | `#008635` |
| Warning | `#fff6d9` | `#ba8e00` | `#916f00` |
| Danger | `#ffd9d9` | `#e02e2a` | `#ba2623` |

State color always accompanies text and, when useful, an icon. Prefer a small
indicator and text for routine state. Reserve tinted surfaces for bounded alerts
that need attention.

## 4. Typography

Use the platform system stack so English and Simplified Chinese render naturally:

```css
ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans",
"Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
sans-serif
```

Use the platform monospace stack for code. Product UI uses only weights `400`,
`500`, and `600`. Body text is normally `14/20` or `16/24`; small metadata is
`12/18`. Use `18`, `20`, `24`, `32`, and `48` px headings only when the hierarchy
requires them.

- Use `600` for headings and `500` for controls and compact emphasis.
- Keep tracking at normal for Chinese and body text.
- Do not force uppercase or wide tracking on localized product copy.
- Never use text below 12 px for user-facing information.

## 5. Geometry

### 5.1 Spacing

Use a 4 px base grid. Allowed spacing values are:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96`

Prefer `8`, `12`, `16`, `24`, and `32` for product UI. Use `gap-*` for sibling
spacing. Negative spacing requires a documented geometric reason.

### 5.2 Radius

| Radius | Use |
| --- | --- |
| `6px` | Compact controls and small surfaces |
| `8px` | Buttons and inputs |
| `12px` | Cards, menus, popovers, dialogs |
| `16px` | Large bounded surfaces |
| `9999px` | Status dots, avatars, and true pills only |

### 5.3 Control and icon size

- Compact control: 32 px.
- Default control: 36 px.
- Large control: 40 px.
- Primary pointer target: at least 44 by 44 px when space allows.
- Icons: 14, 16, 18, 20, or 24 px, inherited from component size.

Do not turn every text button into a pill. Equal width and height use `size-*`.

## 6. Depth and motion

In-flow product surfaces are flat. Use background contrast and a semantic
border before elevation.

- Cards and lists: border only; no default drop shadow.
- Tooltip and small popover: border plus restrained small elevation.
- Menu and dialog: layered border-shadow plus elevation appropriate to the
  overlay.
- Focus: `0 0 0 2px var(--surface), 0 0 0 4px var(--interactive)`.
- Never use glow, glass, or decorative shadow.

Color transitions use 150 ms. Popovers may enter or exit in 200 ms; dialogs in
250 ms. Buttons and links change color without scale or translation. Motion
must explain state or hierarchy and must respect `prefers-reduced-motion`.

## 7. Layout

- Application chrome is sparse and secondary to the current learning task.
- Standard horizontal padding is 24 px and may reduce to 16 px on narrow
  windows.
- Narrow forms use a maximum width of 400 px.
- Onboarding and settings content use a maximum width of 672 px.
- General content uses a maximum width of 768 or 960 px when the job benefits
  from the width.
- Use spacing and surface changes before divider lines.
- Keep primary actions close to the decision they complete.

Use standard responsive thresholds at 640, 768, 1024, and 1280 px. Components
adapt at the smallest threshold required by their content; do not add device-
specific breakpoints without evidence.

## 8. Component system

All product-level UI must use shadcn/ui or a shadcn ecosystem component. This
includes navigation, cards, menus, forms, settings, dialogs, confirmations,
toasts, loading states, and empty states.

The learning-content renderer is the only boundary that may use renderer-owned
primitives. Product chrome, authoring controls, overlays, and status UI remain
shadcn compositions.

Before creating a component:

1. Inspect `src/renderer/components/ui`.
2. Search or view the current shadcn registry when the primitive is absent.
3. Add source through the shadcn CLI.
4. Compose installed primitives before writing custom styled markup.
5. Record why existing primitives cannot express any custom interaction.

Repository conventions:

- Use semantic Tailwind classes such as `bg-background`, `text-foreground`,
  `border-border`, and `text-muted-foreground`.
- Use `cn()` for conditional classes.
- Use Lucide through the configured icon library.
- Button icons use `data-icon`; component variants own their size.
- Overlays use the full accessible shadcn composition, including titles and
  descriptions.
- Use `AlertDialog` for destructive confirmation, `Skeleton` for loading,
  `Empty` for empty states, and Sonner for transient feedback.
- A `Card` represents a real bounded group; it is not the default wrapper for
  every block of content.

## 9. Product language and state

Every string has one job. Use concrete verbs and stable nouns. A primary action
names its result; avoid generic labels such as “OK”, “Submit”, or “Continue” when
a more specific verb exists.

Every applicable surface defines:

- loading;
- empty;
- disabled;
- success;
- error and recovery;
- offline or unavailable;
- cancellation;
- destructive consequence.

Error copy follows: what happened, effect on the learner's goal, next action.
Do not expose queue names, IPC terms, stack traces, or internal error codes.

English and Simplified Chinese copy live in dictionaries, including accessible
names and announcements. Initial locale follows the system; a saved override
wins. User-authored learning content is never translated automatically.

## 10. Accessibility

- Meet WCAG 2.2 AA contrast.
- Preserve semantic HTML and logical keyboard order.
- Every interactive element has a visible keyboard focus state.
- Icon-only actions have localized accessible names and tooltips where useful.
- State is never communicated by color alone.
- Dialogs trap focus and restore it on close through their shadcn primitive.
- Destructive confirmations name the affected object and consequence.
- Layout remains usable with longer English and Chinese strings and at 200%
  text zoom.

## 11. Do and do not

Do:

- Keep the interface achromatic and content-led.
- Use semantic tokens and shared shadcn components.
- Use compact, explicit controls and quiet surfaces.
- Design normal, asynchronous, empty, and error states together.
- Verify both languages and keyboard interaction before completion.

Do not:

- Use gradients, glass effects, decorative patterns, or colored page washes.
- Add raw colors or one-off dimensions inside product components.
- Use negative display tracking that damages Chinese text.
- Recreate a Dialog, Select, Menu, Tooltip, Toast, or other established
  primitive from styled `div` elements.
- Copy Vercel, OpenAI, or Polaris names, marks, fonts, or page composition.

## References

- Polaris `DESIGN.md`, `docs/design/content-design.md`, and UI rules in
  `AGENTS.md` at `/Users/zhiwei/repos/polaris`.
- shadcn/ui official documentation: <https://ui.shadcn.com/docs>.
- Third-party Vercel visual reference:
  <https://github.com/educlopez/design-bites/blob/main/design-mds/vercel.com/DESIGN.md>.
- design-bites generation method and MIT license:
  <https://github.com/educlopez/design-bites>.
