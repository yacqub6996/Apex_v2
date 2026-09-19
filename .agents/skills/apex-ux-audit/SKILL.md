---
name: apex-ux-audit
description: Reusable UX research and benchmarking workflow for Project Apex. Use this skill when conducting visual, responsive, accessibility (WCAG 2.2), and interaction audits of the authenticated Apex trading platform.
---

# Project Apex UX Research & Benchmarking Protocol

This skill coordinates a structured, evidence-based visual UX audit of the authenticated Apex application across mobile, tablet, and desktop viewports.

## Core Workflow Overview

```text
[Pre-Flight Verification]
       │
       ▼
[apex-ux-observer] ──(Screenshots / DOM / Console)──> [Evidence Archive]
       │                                                      │
       ▼                                                      ▼
[apex-ux-benchmarker] ──(Fintech Pattern Research)───> [Pattern Mapping]
                                                              │
                                                              ▼
                                                   [Structured Audit Report]
                                                              │
                                                              ▼
                                                   [Human Approval Gate]
```

## Step 1: Pre-Flight & Safety Checks
1. **Target Verification**: Confirm the target URL is reachable (e.g. `http://localhost:5173` or designated staging domain).
2. **Controlled Test Account**: Ensure credentials belong exclusively to a disposable, non-personal sandbox test account with pre-seeded states:
   - Level 2 KYC status
   - Funded paper wallet balance
   - 30-day portfolio history
   - 1 active copy-trading session
   - 1 completed trade, 1 pending deposit, 1 pending limit order
   - Unread/read notification inbox
3. **No Secret Storage**: Never write passwords, tokens, or private keys to files or logs.
4. **Read-Only Verification**: Confirm git writes and deployments are blocked.

## Step 2: Visual & DOM Exploration (`apex-ux-observer`)
Invoke the `apex-ux-observer` subagent to audit key user journeys across 4 required viewport classes:
- **Mobile Compact**: 390 × 844 px (iPhone 14/15/16 baseline)
- **Mobile Large**: 430 × 932 px (iPhone Pro Max / Plus)
- **Tablet**: 768 × 1024 px (iPad Mini / Air portrait)
- **Desktop**: 1440 × 900 px (Standard laptop/desktop)

### Critical User Journeys to Traverse
1. **Authentication & Session Landing**: Sign-in flow, 2FA prompt, landing dashboard redirect.
2. **Portfolio & Asset Allocation**: Total balance clarity, fiat/crypto breakdown, unrealized vs. realized P&L, historical chart toggles.
3. **Trader Discovery & Profile**: Trader performance cards, win-rate metrics, max drawdown, risk score disclosure, historical trade log.
4. **Copy-Trading Setup & Execution**: Allocation form, copy stop-loss slider, performance fee disclosure, confirmation modal/drawer.
5. **Active Copy-Trading Management**: Managing followed trader, pausing copy, modifying allocation, cancelling copy-trading (destructive confirmation).
6. **Wallet & Transaction Ledger**: Deposit/Withdrawal screens, fee schedules, pending status indicators, completed receipt details.
7. **System States**: Loading skeletons, empty search states, input validation errors, network interruption banners.

### Technical & Visual Evidence Captured
- High-resolution full-page and element screenshots saved to `<appDataDir>/brain/<conversation-id>/screenshots/`.
- Browser console warnings, uncaught exceptions, and sourcemapped errors.
- Network activity inspection: failed API calls (4xx/5xx) and slow responses (>1000ms).
- DOM snapshots and computed CSS properties (touch target sizes, focus indicators).

## Step 3: Industry Benchmark Sweep (`apex-ux-benchmarker`)
Invoke `apex-ux-benchmarker` to evaluate observed friction points against established industry standards:
- **Copy-Trading & Social Investing**: eToro, Bybit, Binance Copy Trading, ZuluTrade.
- **Portfolio & Balance Architecture**: Coinbase, Revolut, Robinhood, Kraken Pro.
- **Trade Slips & Confirmation Ergonomics**: Uniswap, dYdX, Interactive Brokers.
- **Pattern Synthesis**: Document whether the observed behavior follows, deviates from, or improves upon industry conventions without blindly copying any single brand.

## Step 4: Accessibility & Financial UX Evaluation
Assess every flow against:
- **WCAG 2.2 Level AA**:
  - Target size minimum: 24×24px (and 44×44px for primary mobile tap targets) (SC 2.5.8).
  - Focus visible and focus appearance (SC 2.4.7 & 2.4.13).
  - Text contrast ≥ 4.5:1 (standard text) and ≥ 3:1 (large financial KPIs) (SC 1.4.3).
  - Information not conveyed solely by color (green/red P&L paired with +/− or directional glyphs) (SC 1.4.1).
  - Clear inline form validation and error identification (SC 3.3.1).
- **Financial Integrity**:
  - Fees disclosed before trade confirmation (management fees, performance fees, network fees, spread).
  - Clear distinction between available cash, reserved margin, and unrealized profit.
  - Two-step confirmation for destructive actions with explicit consequence descriptions.

## Step 5: Report Synthesis & Finding Schema
Compile all findings into a structured markdown report using this schema:

| Field | Description |
| :--- | :--- |
| **ID & Title** | Unique identifier (e.g. `[FINDING-001] Ambiguous Copy-Trading Fee Disclosure`) |
| **Screen / Flow** | Exact route and view state (`/traders/:id/copy`) |
| **Viewport** | Viewport class and dimensions (e.g. `Mobile Compact - 390×844px`) |
| **User Goal** | What the user is trying to accomplish |
| **Observed Behavior** | Objective description of what happens |
| **Evidence** | Links to screenshots, DOM snippet, computed CSS, console logs |
| **Severity** | `Critical` \| `High` \| `Medium` \| `Low` \| `Enhancement` |
| **Industry Benchmark** | Established pattern in Tier-1 fintech products |
| **Usability Impact** | Financial confusion, accessibility barrier, or cognitive friction |
| **Recommendation** | Concrete, actionable UX/UI remediation |
| **Confidence** | `High` \| `Medium` \| `Low` with rationale |

## Step 6: Human Approval Gate
Present the synthesized report to the human reviewer. **Do not modify product code, create branches, or write implementations until the human reviewer provides explicit approval for specific prioritized recommendations.**
