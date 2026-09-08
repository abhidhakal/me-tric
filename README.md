# MeTric

<p align="left">
  <strong>Personal KPI & Life Telemetry Platform.</strong><br>
  A distraction-free, local-first macOS desktop application designed to translate high-level yearly ambition into daily pacing and execution.
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Web-black?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Architecture-Local--First-black?style=flat-square" alt="Local First">
  <img src="https://img.shields.io/badge/Stack-Electron%20%C2%B7%20React%20%C2%B7%20TypeScript-black?style=flat-square" alt="Stack">
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License">
</p>

---

## Overview

Most productivity software suffers from cognitive bloat—drowning your day in cluttered widgets and complex dashboards before you even start.

**MeTric** is built on a simpler philosophy:
1. **Log what you did today** in a single distraction-free input.
2. **Track the critical metrics that move your life** with 1-click steppers.
3. **Pace your ambitions** so big annual goals decompose into manageable daily and weekly targets.

Zero cloud lock-in. Zero telemetry. Fast, offline, and native.

---

## Key Features

### ⚡ Standalone Accomplishment Logging
* Open the app, type what you completed, and hit <kbd>Enter</kbd>.
* Generates a clean chronological timeline of wins and completed tasks for every date.
* Automatically rolls into weekly and monthly review summaries.

### 🎯 Intelligent Pacing Breakdown Engine
* Set a high-level target (e.g., *12 books/year*, *250 deep work hours/year*).
* MeTric automatically opens a multi-choice pacing breakdown modal:
  * **Monthly Milestone** (`total / 12`)
  * **Weekly Pacing** (`total / 52`)
  * **Daily Habit** (`total / 365`)
* Fine-tune targets inline and confirm with <kbd>Enter</kbd> to generate balanced sub-goals across every cadence.

### 📊 Tactical Metrics & Steppers
* Track durations, numbers, currencies, and boolean habits (*Deep Work*, *Exercise*, *Reading*, *Savings*, *Sleep*).
* Fast 1-click increment chips (`+15m`, `+30m`, `+1h`, `+1k`, `+1`) directly on today's dashboard.
* Visual weekly trend tracks showing daily progress across Monday through Sunday.

### 🔒 100% Local-First & Private
* Your data lives entirely on your machine in `~/Library/Application Support/MeTric/database.json`.
* Instant cold starts, zero latency, works completely offline without internet access.
* One-click JSON backup export and import for seamless migrations.

### 🍎 Native macOS Aesthetics
* Designed to respect macOS Human Interface Guidelines:
  * Sleek 38px native header height perfectly aligned with traffic light controls.
  * Borderless, floating main content workspace.
  * Keyboard-first shortcuts (<kbd>Cmd+1</kbd> to <kbd>Cmd+5</kbd> for quick view switching, <kbd>Enter</kbd> badges on primary actions).
  * Monochromatic obsidian palette with subtle glassmorphism and crisp typography (*Inter* + *Instrument Serif*).

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> + <kbd>1</kbd> | Switch to **Today** view |
| <kbd>⌘</kbd> + <kbd>2</kbd> | Switch to **Dashboard** |
| <kbd>⌘</kbd> + <kbd>3</kbd> | Switch to **Metrics** view |
| <kbd>⌘</kbd> + <kbd>4</kbd> | Switch to **Goals** view |
| <kbd>⌘</kbd> + <kbd>5</kbd> | Switch to **Reviews** view |
| <kbd>Enter ↵</kbd> | Confirm / Log across dialogs & inputs |
| <kbd>Esc</kbd> | Dismiss modals / Skip secondary steps |

---

## Tech Stack

* **Runtime**: Electron 44 (macOS arm64 / x64)
* **Frontend**: React 19, TypeScript, Vite
* **Styling**: Vanilla CSS with customized design tokens and system font stack
* **Storage**: Local filesystem JSON adapter with browser LocalStorage fallback

---

## Getting Started

### Prerequisites
* Node.js (v18 or later)
* npm

### Installation

```bash
# Clone the repository
git clone https://github.com/abhidhakal/me-tric.git
cd me-tric

# Install dependencies
npm install
```

### Running Locally

```bash
# Run the web dev server
npm run dev

# Run inside Electron on macOS
npm run dev:electron
```

### Packaging for macOS

```bash
# Build production bundle and package into native macOS app
npm run build:app
```

The compiled application bundle will be located at:
```
release/mac-arm64/MeTric.app
```

---

## License

MIT License © [Abhinav Dhakal](https://github.com/abhidhakal)
