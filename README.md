# figma-bridge

> Agent-driven Figma-to-React CLI — powered by Claude.

figma-bridge turns Figma frames into production-ready React + Tailwind components using an iterative AI agent loop. It renders the output, compares it pixel-by-pixel against the Figma reference, and feeds specific mismatches back to Claude for self-correction — converging on an accurate component in up to 3 passes.

---

## Table of Contents

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
  - [init](#init)
  - [scaffold](#scaffold)
  - [audit](#audit)
  - [tokens sync](#tokens-sync)
  - [components scan](#components-scan)
- [Project structure](#project-structure)
- [Development](#development)
- [Roadmap](#roadmap)

---

## How it works

```
Figma URL
    │
    ▼
┌─────────────────────────────────────────────┐
│  1. Parse URL → extract fileId + nodeId     │
│  2. Fetch Figma node tree (REST API)         │
│  3. Export frame as reference PNG (2×)       │
│  4. Resolve design tokens → Tailwind classes │
│  5. Scan component library for context       │
└──────────────────────┬──────────────────────┘
                       │  Assembled prompt
                       ▼
              ┌─────────────────┐
              │   Claude API    │  ← system prompt + design tree
              │  (generation)   │    + token map + component index
              └────────┬────────┘
                       │  TSX
                       ▼
              ┌─────────────────┐
              │   Playwright    │  ← renders component in headless browser
              │   renderer      │
              └────────┬────────┘
                       │  Screenshot
                       ▼
        ┌──────────────────────────────┐
        │  Visual diff  (pixelmatch)   │  ← pixel-level comparison
        │  Property diff (CSS vs spec) │  ← spacing, color, font audit
        └──────────────┬───────────────┘
                       │  Feedback (score + mismatches)
                       ▼
              ┌─────────────────┐
              │   Claude API    │  ← iterative refinement (≤ 3×)
              │  (refinement)   │
              └────────┬────────┘
                       │  Final TSX
                       ▼
              Written to --out path
```

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Figma account | Personal access token |
| Anthropic account | API key |

---

## Installation

```bash
# Global install (recommended for CLI use)
npm install -g figma-bridge

# Or use directly without installing
npx figma-bridge init
```

---

## Quick start

**1. Run the interactive setup wizard**

```bash
figma-bridge init
```

This will:
- Prompt for your Figma access token and default file ID
- Auto-detect your `tailwind.config.ts`
- Ask for component and output directory paths
- Write `figma-bridge.config.ts` to your project root
- Create a `.figma-bridge/` cache directory

**2. Set your API keys in `.env`**

```bash
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

**3. Generate a component from a Figma frame**

```bash
figma-bridge scaffold \
  --url "https://www.figma.com/design/ABC123/MyApp?node-id=1-23" \
  --out src/components/HeroSection.tsx \
  --name HeroSection
```

---

## Configuration

figma-bridge is configured via `figma-bridge.config.ts` in your project root (also supports `.js`, `.mjs`, `.json`).

```ts
// figma-bridge.config.ts
import { type FigmaBridgeConfig } from 'figma-bridge';

const config: FigmaBridgeConfig = {
  figma: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN ?? '',
    fileId: 'ABC123XYZ',           // optional default file
  },

  paths: {
    components: './src/components', // existing component library (for scanning)
    output:     './src/generated',  // where generated files are written
    tailwindConfig: './tailwind.config.ts',
  },

  agent: {
    model:                'claude-sonnet-4-5-20250514',
    maxIterations:        3,        // max self-correction passes
    targetScore:          95,       // stop early when score ≥ this (0–100)
    includeVisualDiff:    true,
    includePropertyDiff:  true,
    temperature:          0,
    // apiKey: '...'  // falls back to ANTHROPIC_API_KEY env var
  },

  audit: {
    devServerUrl: 'http://localhost:3000',
    tolerance: {
      spacing:  2,  // px
      color:    5,  // Delta-E
      fontSize: 0,  // px (exact match)
    },
  },

  scaffold: {
    importStyle: 'alias',           // 'alias' | 'relative' | 'absolute'
    importAlias: '@/components',
    prettier:    true,
    previewRoute: '/__figma-bridge-preview',
  },

  // Map Figma component names to local imports
  componentMap: {
    'Icon/Arrow': '@/components/icons/Arrow',
    'Button/Primary': '@/components/ui/Button',
  },
};

export default config;
```

### Config search order

figma-bridge searches upward from `cwd` for the first matching file:

1. `figma-bridge.config.ts`
2. `figma-bridge.config.js`
3. `figma-bridge.config.mjs`
4. `figma-bridge.config.json`
5. `.figma-bridgerc`
6. `.figma-bridgerc.json`

The access token is also read from the `FIGMA_ACCESS_TOKEN` environment variable as a fallback.

---

## Commands

### `init`

Interactive first-run setup wizard.

```bash
figma-bridge init
```

Creates `figma-bridge.config.ts` and the `.figma-bridge/` cache directory. Safe to re-run — prompts before overwriting an existing config.

---

### `scaffold`

Generate a React component from a Figma frame URL.

```bash
figma-bridge scaffold --url <figma-url> [options]
```

| Option | Description | Default |
|---|---|---|
| `--url <url>` | Figma frame URL **(required)** | — |
| `--out <path>` | Output file path | prints to stdout |
| `--name <name>` | Component name | inferred from Figma frame name |
| `--dry-run` | Print to terminal instead of writing file | `false` |
| `--no-cache` | Skip Figma API cache | — |
| `--no-vision` | Skip image input to Claude | — |
| `--iterations <n>` | Override `agent.maxIterations` | config value |
| `--score <n>` | Override `agent.targetScore` | config value |
| `--verbose` | Log each iteration's score and feedback | `false` |

**Examples**

```bash
# Write to a file
figma-bridge scaffold \
  --url "https://www.figma.com/design/XYZ/App?node-id=12-34" \
  --out src/components/NavBar.tsx

# Preview output without writing (dry run)
figma-bridge scaffold \
  --url "https://www.figma.com/design/XYZ/App?node-id=12-34" \
  --dry-run

# Force fresh Figma data and show iteration details
figma-bridge scaffold \
  --url "https://www.figma.com/design/XYZ/App?node-id=12-34" \
  --no-cache --verbose
```

---

### `audit`

Compare a rendered page route against its Figma source of truth.

```bash
figma-bridge audit --url <figma-url> --page <route> [options]
```

| Option | Description | Default |
|---|---|---|
| `--url <url>` | Figma frame URL **(required)** | — |
| `--page <route>` | Dev server route to audit **(required)** | — |
| `--server <url>` | Dev server base URL | `audit.devServerUrl` in config |
| `--selector <sel>` | CSS selector to scope the audit | `body` |
| `--format <fmt>` | Output format: `terminal` \| `json` \| `summary` | `terminal` |
| `--min-score <n>` | Exit with error if score is below this | — |
| `--ai` | Include AI-assisted interpretation of ambiguous diffs | `false` |
| `--strict` | Zero-tolerance mode (any mismatch = failure) | `false` |

**Examples**

```bash
# Audit the /dashboard route in your running dev server
figma-bridge audit \
  --url "https://www.figma.com/design/XYZ/App?node-id=56-78" \
  --page /dashboard

# Output a JSON report and fail CI if score < 90
figma-bridge audit \
  --url "https://www.figma.com/design/XYZ/App?node-id=56-78" \
  --page /dashboard \
  --format json \
  --min-score 90
```

---

### `tokens sync`

Re-parse `tailwind.config.ts` and rebuild the token map stored in `.figma-bridge/token-map.json`.

```bash
figma-bridge tokens sync
```

Run this after updating your Tailwind theme.

---

### `components scan`

Re-scan the component directory defined in `paths.components` and rebuild the component index at `.figma-bridge/component-index.json`.

```bash
figma-bridge components scan
```

Run this after adding or renaming components.

---

## Project structure

```
figma-bridge/
├── bin/
│   └── figma-bridge.ts          # CLI entry point (Commander.js)
├── src/
│   ├── commands/
│   │   ├── init.ts              # Interactive setup wizard
│   │   ├── scaffold.ts          # Component generation (Phase 2)
│   │   ├── audit.ts             # Design compliance audit (Phase 3)
│   │   ├── tokens-sync.ts       # Token re-sync (Phase 2)
│   │   └── components-scan.ts   # Component re-scan (Phase 2)
│   ├── config/
│   │   └── loader.ts            # cosmiconfig + jiti loader
│   ├── figma/
│   │   ├── client.ts            # Figma REST API client
│   │   ├── url-parser.ts        # Figma URL → fileId + nodeId
│   │   ├── normalizer.ts        # FigmaNode → DesignNode (Phase 2)
│   │   └── image-exporter.ts    # Frame PNG export (Phase 2)
│   ├── agent/                   # Claude agent loop (Phase 2)
│   │   ├── loop.ts
│   │   ├── prompt-builder.ts
│   │   ├── claude-client.ts
│   │   ├── response-parser.ts
│   │   └── feedback-builder.ts
│   ├── comparison/              # Visual + property diff (Phase 3)
│   │   ├── renderer.ts
│   │   ├── visual-diff.ts
│   │   ├── property-diff.ts
│   │   ├── matcher.ts
│   │   └── dom-extractor.ts
│   ├── context/                 # Context assembly (Phase 2)
│   │   ├── token-resolver.ts
│   │   ├── component-indexer.ts
│   │   ├── tailwind-parser.ts
│   │   └── style-examples.ts
│   ├── types/
│   │   ├── figma.ts             # Raw Figma API types
│   │   ├── design-node.ts       # Normalised DesignNode tree
│   │   ├── dom-node.ts          # DOM comparison node
│   │   ├── config.ts            # FigmaBridgeConfig schema
│   │   ├── tokens.ts            # Design token types
│   │   ├── report.ts            # Audit + iteration feedback
│   │   └── component-index.ts   # Component scanner types
│   └── utils/
│       ├── logger.ts            # chalk + ora structured logger
│       └── cache.ts             # SHA-256-keyed FS cache with TTL
├── prompts/                     # System prompt templates
├── tests/                       # Vitest test suites
├── figma-bridge.config.ts       # Your project config (gitignored token)
├── tsconfig.json
└── tsup.config.ts
```

---

## Development

```bash
# Install dependencies
npm install

# Build (ESM + .d.ts)
npm run build

# Watch mode
npm run dev

# Type-check without emitting
npm run typecheck

# Run tests
npm test
```

The CLI can be tested directly from the build output:

```bash
node dist/bin/figma-bridge.js --help
```

Or link it globally while developing:

```bash
npm link
figma-bridge --help
```

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| **1 — Scaffolding** | ✅ Complete | CLI, Figma client, URL parser, config system, `init` command |
| **2 — Generation** | 🚧 Planned | Figma normalizer, token resolver, component indexer, Claude agent loop, `scaffold` command |
| **3 — Audit** | 🚧 Planned | Playwright renderer, visual diff (pixelmatch), property diff, `audit` command |
| **4 — Polish** | 🚧 Planned | Multi-breakpoint support, Claude Code integration, watch mode |

---

## License

MIT
