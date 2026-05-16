# PushInn

> **"Strava meets Chess.com for skateboarding."**

PushInn is a trustless geospatial battle network for skateboarding. It replaces vanity metrics with objective skill verification through community consensus and a Triple-Score portfolio system designed to connect verified riders with brand sponsors.

---

## Core Systems

| System | Description |
|---|---|
| **Heat Alerts & Spot Status** | Live geospatial intel with 4-hour TTL: Wet, Dry, Locked Off, Security Active, Session Alive |
| **Async S.K.A.T.E. Engine** | Turn-based battle logic with timezone-safe turns, timeout/forfeit handling, and democratic outcome verification |
| **Tribal Verification** | Community consensus validates clips; Ranking Score controls vote weight to keep the system objective |
| **Triple-Score Pipeline** | Map Score + Player Score + Ranking Score = a verifiable portfolio for brands and shops |

## Pages

| Page | Path | Purpose |
|---|---|---|
| Home | `index.html` | Hero, features overview, bottom stats |
| Beta | `beta.html` | App store waitlist |
| Athlete Missions | `bounties.html` | Dynamic mission feed (loaded from `missions.json`) |
| Sponsor-Heat Portal | `partners.html` | Brand and sponsor scouting pipeline |
| Contact | `contact.html` | Formspree contact form (subject-prefill via `?subject=` param) |
| Help / System Briefing | `help.html` | Platform documentation |
| Privacy Policy | `privacy.html` | Data and privacy details |
| Terms of Service | `terms.html` | Platform terms |
| Thank You | `thank-you.html` | Post-form submission confirmation |

## Development

This is a **pure static site** — no build system, no package manager, no framework.

To run locally:
```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Or use any static file server (e.g. VS Code Live Server, `npx serve`).

## Deployment

Hosted on GitHub Pages at **[pushinn.app](https://pushinn.app)** via the `CNAME` file.

## Brand Voice

- Gritty but professional
- Data-driven, cyberpunk/tactical aesthetic
- Proof over clout — metrics over hype
