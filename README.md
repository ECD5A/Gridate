# Gridate Activity Calendar Generator

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./action-preview/gridate-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./action-preview/gridate.svg">
    <img src="./action-preview/gridate.svg" alt="Gridate Activity Calendar Generator preview" width="920">
  </picture>
</p>

<p align="center">
  <strong>Generate GitHub-style activity calendars from JSON or CSV inside GitHub Actions.</strong><br>
  Light and dark SVG output · accessible tooltips · no API token · no external requests
</p>

<p align="center">
  <a href="https://github.com/ECD5A/Gridate/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ECD5A/Gridate/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/ECD5A/Gridate/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/ECD5A/Gridate?display_name=tag&logo=github"></a>
  <a href="https://github.com/ECD5A/Gridate/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/ECD5A/Gridate?style=flat&logo=github"></a>
</p>

## What it does

Gridate Activity Calendar Generator turns activity data into contribution-style SVG calendars for profile READMEs, project pages, release notes, and documentation.

- JSON objects, JSON arrays, and CSV input
- Arbitrary date ranges with optional `from` and `to` values
- Light, dark, or automatic theme output
- Accessible SVG titles, descriptions, legends, and day tooltips
- Stable output paths for scheduled README updates
- Action outputs for generated files, active days, and total activity

## Quick start

```yaml
name: Update Gridate calendar

on:
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * 1"

permissions:
  contents: write

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate Gridate calendars
        uses: ECD5A/Gridate@v1
        with:
          data-file: data/activity.json
          output-dir: assets
          base-name: gridate
          title: My activity
          theme: auto

      - name: Commit generated SVGs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/gridate.svg assets/gridate-dark.svg
          git diff --cached --quiet || git commit -m "Update Gridate activity calendar"
          git push
```

## Input formats

JSON can be an object keyed by ISO date:

```json
{
  "2026-01-05": 2,
  "2026-01-12": 4,
  "2026-02-03": 3
}
```

Or an array of records:

```json
[
  { "date": "2026-01-05", "count": 2 },
  { "date": "2026-01-12", "count": 4 }
]
```

CSV uses `date,count` columns:

```csv
date,count
2026-01-05,2
2026-01-12,4
```

## Embed the generated calendar

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/gridate-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/gridate.svg">
  <img src="./assets/gridate.svg" alt="Activity calendar">
</picture>
```

## The Gridate project

The same repository includes a local-first visual planner for shaping date-based activity and exporting structured timelines. It requires no account, backend, analytics, or repository access.

## Privacy

The planner runs locally in the browser. Timeline data stays in local storage, and the Action does not request external activity data or require an API token.

## Support

If Gridate is useful to your work, support its continued maintenance:

- TON: `pointoncurve.ton`
- Bitcoin (BTC): `1ECDSA1b4d5TcZHtqNpcxmY8pBH1GgHntN`
- USDT (TRC20): `TUF4vPdB6QkjCvZq18rBL4Qj4dK5ihCN75`

## Contact

<p align="left">
  <a href="mailto:stelmak159@gmail.com" aria-label="Email"><img alt="Email" height="24" src="https://cdn.simpleicons.org/gmail/EA4335"></a>
  &nbsp;
  <a href="https://t.me/ECDS4" aria-label="Telegram"><img alt="Telegram" height="24" src="https://cdn.simpleicons.org/telegram/26A5E4"></a>
  &nbsp;
  <a href="https://github.com/ECD5A/Tkach-Security" aria-label="GitHub repository"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/github/FFFFFF"><img alt="GitHub repository" height="24" src="https://cdn.simpleicons.org/github/181717"></picture></a>
</p>
