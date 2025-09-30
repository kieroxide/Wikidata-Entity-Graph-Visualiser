# Wikidata Entity Graph Visualizer

A full-stack project for exploring and visualizing entity-relationship graphs from Wikidata using a custom force-directed layout. The project consists of a Python backend for crawling, cleaning, and serving Wikidata graphs, and a TypeScript/Vite frontend for interactive visualization.

---
## Try it out now online!

Deployed github page: https://kieroxide.github.io/Wikidata-Entity-Graph-Visualiser/

## What I Learnt

-   **SPARQL and Wikidata API:** Gained hands-on experience with SPARQL queries, batching, and handling the quirks of the Wikidata endpoint.
-   **Graph Data Cleaning:** Learned the importance of cleaning and validating graph data, including handling missing labels, disconnected nodes, and invalid references.
-   **Efficient Optionial Caching:** Implemented caching to avoid redundant API calls and speed up repeated queries. However this is turned off in production as to not waste space on the server.
-   **RESTful API Design:** Built a robust Flask API with clear endpoints and flexible parameters for graph exploration.
-   **Raw Canvas Rendering:** Built a force-directed graph visualizer from scratch using only TypeScript and the HTML5 Canvas API—no d3, no gl-matrix, just custom logic and a Rust/WASM module for physics.
-   **UI/UX for Graphs:** Designed intuitive controls for panning, zooming, searching, and expanding graphs, making large and complex data feel interactive and approachable.
-   **Frontend-Backend Integration:** Learned to coordinate async data fetching, error handling, and real-time updates between the frontend and a Flask backend.
-   **Performance Optimization:** Managed animation frame queues, optimized rendering, and handled large graphs smoothly in the browser.
-   **Deployment:** Automated deployment to Railway using Gunicorn, and made the server auto-detect its environment for seamless local and cloud use.
-   **Testing and Debugging:** Developed backend tests to check for data consistency, connectivity, and filtering correctness.
-   **Vite & Modern Tooling:** Used Vite for fast development and deployment, and set up proxying for seamless local development.

---

## Challenges

-   **Wikidata Rate Limiting:** Had to tune worker counts and batch sizes to avoid being throttled or blocked by the Wikidata SPARQL endpoint.
-   **Data Inconsistencies:** Encountered missing or malformed labels, orphaned relations, and other real-world data issues that required robust cleaning logic.
-   **Graph Expansion Control:** It was difficult to precisely control the number of entities/relations due to the unpredictable nature of graph crawling and filtering.
-   **Deployment Path Issues:** Ensured that config and data files were always found regardless of local or cloud deployment paths.
-   **Maintaining Consistent Data Formats:** Needed to keep entity and property data formats consistent between cache, API, and frontend expectations.
-   **Debugging in Production:** Diagnosed and fixed issues that only appeared after deployment, such as environment variable handling and file path mismatches.
-   **No Visualization Libraries:** Everything from graph layout to rendering and interaction was implemented manually, which was both challenging and rewarding.
-   **WASM Integration:** Integrated a Rust/WASM module for efficient force calculations, learning about cross-language module loading and performance tuning.
-   **Responsive UI:** Ensured the app works well on different screen sizes and handles window resizing gracefully.
-   **Error Feedback:** Built user feedback for loading, errors, and invalid input to make the app robust and user-friendly.

---

## Overview

-   **Frontend:** TypeScript + Vite + HTML5 Canvas + Rust/WASM (for physics)
-   **Backend:** Python (Flask) for crawling, cleaning, and serving Wikidata entity graphs
-   **Purpose:** Educational exploration of how ideas and entities are connected in Wikidata, with a focus on clean, interactive, and performant graph visualization

---

## Features

-   Search for any Wikidata entity and visualize its connections
-   Interactive force-directed graph layout (pan, zoom, expand nodes)
-   Adjustable graph depth and relation limits
-   Real-time stats and user feedback
-   Data cleaning and filtering for high-quality graphs
-   REST API for programmatic access to graph data
-   WASM-accelerated physics for smooth, large-graph rendering
-   Easy deployment (local or cloud)

---

## Project Structure

-   `FDG/backend/` — Python backend (Flask API, data crawling, cleaning, caching)
-   `FDG/frontend/` — TypeScript/Vite frontend (UI, rendering, WASM integration)
-   `docs/` — Static build output for GitHub Pages
-   `README.md` — This file
-   `LICENSE` — MIT License

---

## Getting Started

### Prerequisites

-   Python 3.10+
-   Node.js (v18+ recommended)
-   Rust (for building WASM, optional if using prebuilt)

### Backend Setup

```sh
cd FDG/backend
pip install -r requirements.txt
python WikiGraphServer.py
```

The API will be available at `http://localhost:5000`.

### Frontend Setup

```sh
cd FDG/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Run Both (from `FDG/frontend`)

```sh
npm run start:both
```

---

## How It Works

1. **Backend** crawls Wikidata, cleans and caches entity/property/relation data, and serves it via a REST API.
2. **Frontend** fetches graph data, renders it as a force-directed graph, and provides interactive controls for exploration.
3. **WASM** module (Rust) accelerates force calculations for smooth, real-time graph layouts.

---

## Technologies Used

-   Python (Flask, requests, SPARQL)
-   TypeScript, Vite
-   HTML5 Canvas
-   Rust/WASM (for physics)
-   GitHub Pages (for static frontend hosting)

---

## Configuration

-   Backend: `FDG/backend/config.json` for crawling/filtering options
-   Frontend: `FDG/frontend/vite.config.ts` and `.env` for API endpoints

---

## License

MIT License (see `LICENSE` file)

---

## Credits

Created by Kieran B, 2025. See individual `README.md` files in `FDG/backend` and `FDG/frontend` for more details.
