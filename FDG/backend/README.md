# Wikidata-to-Entity-Graph

Wikidata-to-Entity-Graph builds a clean, connected entity-relationship graph from any Wikidata entity (QID), saving the result as JSON files for use in data analysis or visualization.

This project was made mostly to provide as a backend for my wikidata entity FDG project, and so filtering is quite intense due to wikidata's data being messy and full of metadata/different languages.

# What I Learnt

-   **SPARQL and Wikidata API:** Gained hands-on experience with SPARQL queries, batching, and handling the quirks of the Wikidata endpoint.
-   **Graph Data Cleaning:** Learned the importance of cleaning and validating graph data, including handling missing labels, disconnected nodes, and invalid references.
-   **Efficient Caching:** Implemented caching to avoid redundant API calls and speed up repeated queries.
-   **RESTful API Design:** Built a robust Flask API with clear endpoints and flexible parameters for graph exploration.
-   **Deployment:** Automated deployment to Railway using Gunicorn, and made the server auto-detect its environment for seamless local and cloud use.
-   **Testing and Debugging:** Developed backend tests to check for data consistency, connectivity, and filtering correctness.

# Challenges

-   **Wikidata Rate Limiting:** Had to tune worker counts and batch sizes to avoid being throttled or blocked by the Wikidata SPARQL endpoint.
-   **Data Inconsistencies:** Encountered missing or malformed labels, orphaned relations, and other real-world data issues that required robust cleaning logic.
-   **Graph Expansion Control:** It was difficult to precisely control the number of entities/relations due to the unpredictable nature of graph crawling and filtering.
-   **Deployment Path Issues:** Ensured that config and data files were always found regardless of local or cloud deployment paths.
-   **Maintaining Consistent Data Formats:** Needed to keep entity and property data formats consistent between cache, API, and frontend expectations.
-   **Debugging in Production:** Diagnosed and fixed issues that only appeared after deployment, such as environment variable handling and file path mismatches.

---

## Features

-   **Crawls Wikidata**: Starting from any QID, recursively fetches related entities and properties up to a specified depth and relation limit.
-   **Cleans Data**: Removes entities/properties with missing labels, unconnected nodes, and invalid relations.
-   **Caches Results**: Provides functions to store entities, properties, and relations in JSON files for fast reuse.
-   **REST API**: Flask server provides endpoints to fetch graph data for any entity.
-   **Configurable**: Batch sizes, thumbnail size, and more are easily configurable.

---

## How It Works

1. **Crawl**: Given a Wikidata QID, the backend fetches all related entities and properties up to a user-specified depth and relation limit.
2. **Clean**: Data is filtered to remove missing labels, disconnected nodes, and invalid references.
3. **Cache**: Results are saved in `data/entities.json`, `data/properties.json`, and `data/relations.json`.
4. **Serve**: The Flask API serves the graph data for any QID on request.

---

## API Endpoints

-   `GET /api/graph/<entity_id>?depth=1&relation_limit=5`  
    Returns a JSON object with:

    -   `entities`: All entities in the subgraph
    -   `properties`: All properties used in the subgraph
    -   `relations`: All relations (edges) in the subgraph

-   `GET /data/entities.json`  
    Returns the cached entities as JSON.

-   `GET /data/properties.json`  
    Returns the cached properties as JSON.

-   `GET /data/relations.json`  
    Returns the cached relations as JSON.

---

## Example Usage

**Python:**

```python
import requests
response = requests.get("http://localhost:5000/api/graph/Q42?depth=2&relation_limit=5")
data = response.json()
print(data["data"]["entities"])
```

**Frontend:**

```js
fetch("http://localhost:5000/api/graph/Q42?depth=2&relation_limit=5")
    .then((res) => res.json())
    .then((data) => console.log(data.data.entities));
```

---

## Setup & Running Locally

1. **Install dependencies:**

    ```
    pip install -r requirements.txt
    ```

2. **Run the server:**
    ```
    python WikiGraphServer.py
    ```
    The API will be available at `http://localhost:5000`.

---

## Deployment (Railway or Gunicorn)

-   The app is ready for deployment with Gunicorn:
    ```
    web: gunicorn WikiGraphServer:app
    ```
-   The server will auto-detect the environment and use the correct port.

---

## Project Structure

-   `WikiGraphServer.py` — Flask API server
-   `backend_tester.py` - Script to test backend is return clean and valid data
-   `py/WikiGraph_Manager.py` — Orchestrates crawling, cleaning, and saving
-   `py/Entity_Crawler.py` — Handles graph crawling from Wikidata
-   `py/Data_Handler.py` — Handles caching and file I/O
-   `py/Cleaner/` — Cleans and validates graph data
-   `py/Wikidata_Client/` — Handles all Wikidata API/SPARQL calls
-   `data/` — Stores cached JSON data

---

## Configuration

-   `config.json` — Set global options (e.g., thumbnail size)
-   `requirements.txt` — Python dependencies

---

## License

MIT License (see `LICENSE` file)

---

## Credits

Created by Kieran B, 2025.
