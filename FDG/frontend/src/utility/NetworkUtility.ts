/// <reference types="vite/client" />
import type { GraphManager } from "../classes/GraphManager";

export class NetworkUtility {
    // Ensures automatic switch of server location based on whether production or local
    static readonly API_BASE =
        import.meta.env["VITE_API_BASE"] ||
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:5000/api"
            : "https://wikidatatoentitygraph-production.up.railway.app/api");

    /** Fetches the QID for a Wikidata entity by its name. */
    static async fetchQIDByName(searchInput: string) {
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
            searchInput
        )}&language=en&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.search && data.search.length > 0) {
            return data.search[0].id; // QID of the top result
        }
        return null;
    }

    /**
     * Fetches graph data from the server for a given entity
     * Returns the newly fetched entities and relations directly from the API
     */
    static async fetchGraphData(QID: string, depth = 1, relationLimit = 5): Promise<any> {
        try {
            const url = `${NetworkUtility.API_BASE}/graph/${QID}?depth=${depth}&relation_limit=${relationLimit}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            return data;
        } catch (error) {
            console.error(`Failed to fetch graph data for ${QID}:`, error);
            throw error;
        }
    }
}
