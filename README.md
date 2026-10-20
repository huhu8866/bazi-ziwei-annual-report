# BaZi + ZiWei Annual Fortune Report Generator

An agent skill (SKILL.md format) that turns birth data into a self-validated
Four-Pillars (BaZi) + ZiWei DouShu chart and a dark-themed HTML annual report
with month-by-month and 5-year guidance. Built for AI agents (Claude Skills /
WorkBuddy / compatible runtimes).

## Why it is different
Most AI fortune tools let the LLM compute the chart — and get month pillars wrong
on solar-term boundaries. We measured **34.2% divergence** vs a `lunar-typescript`
baseline across 448 samples. This skill ships a deterministic engine with **6
built-in self-checks** that must all pass before any interpretation is written.

## Quick start
```bash
npm install            # installs iztro + lunar-typescript
node scripts/annual_report.js 1990-08-15 0 14:30 2026-10-05
# usage A: reference date -> current-year months + next 5 years
# usage B: node scripts/annual_report.js <birth> <gender 1=m/0=f> [HH:MM] <startYear> <endYear>
```

## What you get
- 6-block validated output: self-checks, four pillars + day master + life palace,
  twelve palaces with four-transformation flags, **two independent luck cycles**
  (BaZi 大运 via `getYun` vs ZiWei 大限 via `decadal` — never mixed), benefactor
  star placements + 5-year table, current-year monthly table.
- `templates/report-template.html` — dark-theme report skeleton.
- `references/interpretation-guide.md` — methodology (benefactor stars, four
  transformations, favorable elements, report style standard).
- `references/html-style-guide.md` — report color/structure spec.

## Report structure
One-line summary → chart self-check verdict → core conclusion (both luck cycles)
→ current-year monthly action table → 5-year advice → themed cards → action
checklist → disclaimer.

## Compliance
Cultural/astrological reference only. No lifespan/death/illness prediction, no
paid "luck-changing" or ritual offers. Marriage compatibility is personality
reference only.

## Pricing
List at **$1 per full report** (or accept the marketplace's creator reward
points). Bulk / enterprise white-label integration is a separate higher-tier
offer.

## License
MIT (code) / CC BY-NC 4.0 (interpretation text).

## Hire me
Custom reports, white-label deployment, and BaZi/ZiWei API integration:
chenjianhu@agent.qq.com
