---
name: awesome-design-md
description: Reference library of 73 analyzed brand DESIGN.md files (Stripe, Apple, Linear, Notion, Vercel, Nike, Tesla, and more), following the Google Stitch DESIGN.md format. Use when the user wants a UI to look like, match, or take design cues from a specific real-world brand or product, or asks to "build a page that looks like X". Load the matching brand's DESIGN.md from references/design-md/<brand>/DESIGN.md and apply its documented tokens, typography, spacing, and component rules when generating or redesigning UI.
---

# Awesome DESIGN.md

This skill bundles the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
collection: analyzed `DESIGN.md` design-system documents for real products and brands,
in the [DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/) format
introduced by Google Stitch. Each file documents a brand's actual design language —
color tokens, type scale, spacing rules, component patterns, and tone — extracted
from its real site or app.

## When to use this

Use this skill whenever a request references a specific brand's look, e.g.:

- "make this look like Stripe / Linear / Notion / Apple"
- "give me a Vercel-style landing page"
- "redesign this dashboard with a Tesla feel"
- any request naming a brand listed below as a style reference

## How to use it

1. Identify which brand the user means. Match loosely (e.g. "linear" → `linear.app`,
   "x" / "twitter" → `x.ai` only if that's actually the intended brand — confirm with
   the user if ambiguous).
2. Read `references/design-md/<brand>/DESIGN.md` for the full design-system spec
   (tokens, type, spacing, components, motion, tone).
3. Also check `references/design-md/<brand>/README.md` if present — it explains what
   was analyzed and any caveats.
4. Apply the documented system faithfully: use its actual color tokens, font stack,
   spacing scale, and component conventions rather than inventing your own. Don't mix
   two brands' systems together unless asked.
5. If no brand matches or the user just wants "a nice generic design," don't force one
   of these — fall back to normal design judgement (or another design-taste skill).

## Available brands

references/design-md/ contains one folder per brand, each with a `DESIGN.md`:

airbnb, airtable, apple, binance, bmw, bmw-m, bugatti, cal, claude, clay, clickhouse,
cohere, coinbase, composio, cursor, dell-1996, elevenlabs, expo, ferrari, figma,
framer, hashicorp, hp, ibm, intercom, kraken, lamborghini, linear.app, lovable,
mastercard, meta, minimax, mintlify, miro, mistral.ai, mongodb, nike, nintendo-2001,
notion, nvidia, ollama, opencode.ai, pinterest, playstation, posthog, raycast,
renault, replicate, resend, revolut, runwayml, sanity, sentry, shopify, slack,
spacex, spotify, starbucks, stripe, supabase, superhuman, tesla, theverge,
together.ai, uber, vercel, vodafone, voltagent, warp, webflow, wired, wise, x.ai,
zapier

## Notes

- These are third-party analyses of public sites, not official brand assets. Use them
  as design-language inspiration for original UI, not for reproducing a brand's actual
  trademarked identity, logo, or marketing copy.
- Prefer copying the relevant tokens/rules into the project's own design system (e.g.
  a Tailwind config or CSS variables file) rather than referencing this skill's files
  directly at runtime.
