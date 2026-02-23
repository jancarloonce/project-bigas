# Bigas - Rice Farming Bot Challenge

A coding challenge web platform where players submit Python bots that control a farmer on a 64×64 rice paddy grid. The bot with the highest average rice yield wins.

---

## How It Works

1. Write a Python bot using the **Bigas SDK** (`bigas` package)
2. Submit it on the web app (paste code or upload a `.py` file)
3. The engine runs your bot through **5 cycles × 100 AP** inside a Docker container
4. Watch the animated replay, see your per-cycle scores, and check the leaderboard

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + uvicorn (Python 3.11) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Code editor | Monaco Editor |
| Bot sandbox | Docker (one container per run) |
| Job queue | In-memory asyncio queue, HTTP polling |

---

## Project Structure

```
project-bigas/
├── bigas/          # SDK package — players import this
├── engine/         # Core game engine + bot runner
├── api/            # FastAPI server
├── frontend/       # React + Vite web app
├── bots/           # Sample and boilerplate bots
├── main.py         # CLI runner (no Docker needed)
├── Dockerfile      # Bot runner image
├── Dockerfile.api  # API server image
└── docker-compose.yml
```

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node 20+
- Docker Desktop

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the API

```bash
uvicorn api.main:app --reload --port 8000
```

The API will build the `bigas-runner` Docker image on first start (~30s).

### 3. Start the frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Docker Compose (Production)

```bash
docker compose up --build
```

- API: [http://localhost:8000](http://localhost:8000)
- Frontend: [http://localhost:5173](http://localhost:5173)

---

## CLI Runner (No Docker)

Test a bot locally without the web app:

```bash
python main.py bots/sample_bot.py
python main.py bots/sample_bot.py --seed 42 --out replay.json
```

---

## Writing a Bot

Bots are Python 3.11 scripts using the `bigas` SDK.

**Allowed imports:** `bigas`, `math`, `random`, `logging`, `json`, `collections`, `heapq`

```python
import bigas
from bigas.actions import Action

game = bigas.Game()
game.ready("MyBot")

while True:
    game.update_cycle()
    farmer = game.farmer
    farm_map = game.farm_map

    # Your strategy here
    game.end_turn(Action.WAIT)
```

See `bots/boilerplate.py` for the full reference and `bots/sample_bot.py` for a working example.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/submit` | Submit a bot (form: `bot_name`, `code` or `file`) |
| `GET` | `/jobs/{id}` | Poll job status and result |
| `GET` | `/leaderboard` | All completed runs ranked by score |
| `GET` | `/health` | Health check |

---

## Google AdSense

Ad slots are built into the frontend layout using the `AdBanner` component.

To activate:
1. Add your AdSense `<script>` tag to `frontend/index.html` (see the comment there)
2. Set `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX` in `frontend/.env.local`
3. Replace the `slot` prop values in each `<AdBanner>` with your actual ad unit IDs

In development (no AdSense script loaded), ad slots show as labeled placeholders.

---

## Game Rules Summary

- **Grid:** 64×64, origin at bottom-left, shed at (0,0), farmer spawns at (1,0)
- **Cycles:** 5 cycles per run, 100 AP per cycle
- **Soil yields:** good=250g, great=500g, best=1000g
- **Growth:** seeds ripen after 5 passive AP ticks
- **Score:** average grams deposited at shed across 5 cycles

