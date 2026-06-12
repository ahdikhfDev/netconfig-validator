# NetConfig Validator & Visualizer (NetSim Lite)

Parse, validate & visualize network configurations (RouterOS, Linux host). Built for students who need quick config validation without firing up GNS3/Packet Tracer.

## Features

- **Multi-device input** — paste multiple config blocks, auto-split by marker
- **Auto topology** — detects links by subnet matching across devices
- **Rule-based validation** — IP conflicts, subnet issues, gateway mismatches
- **Interactive graph** — react-flow topology with error highlights
- **Export reports** — markdown/txt error summary

## Tech Stack

- **Frontend:** React 18 + Vite + react-flow + TailwindCSS
- **Backend:** Node.js (ESM) + Express
- **Parsing:** Custom regex-based (zero heavy deps)

## Quick Start

```bash
# Server
cd server && npm install && npm run dev

# Client
cd client && npm install && npm run dev
```

## Project Structure

```
netconfig-validator/
├── server/          # Express API
│   ├── routes/      # API endpoints
│   ├── pipeline/    # Validation pipeline modules
│   │   ├── parsers/ # RouterOS, Linux host parsers
│   │   └── rules/   # Validation rules (modular)
│   └── utils/       # CIDR helpers
├── client/          # React + Vite frontend
│   └── src/         # Components, API layer
└── PLANNING_NetSimValidator.txt
```

## License

MIT
