from .Wikidata_Client_Utility import (
    parseRelationsPayload,
    parseEntityPayload,
    parsePropertyPayload,
)
from SPARQLWrapper import SPARQLWrapper, JSON
from time import sleep
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from random import random

config_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.json"
)

# Configuration constants
DEFAULT_BATCH_SIZE = 50
MAX_QUERY_ATTEMPTS = 3
RELATION_LIMIT = 20
WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
BASE_RETRY_DELAY = 0.5
MAX_RETRY_DELAY = 4.0
NUMBER_OF_DATA_WORKERS = 4
NUMBER_OF_RELATION_WORKERS = 2

with open(config_path) as f:
    config = json.load(f)

THUMBNAIL_SIZE = config["THUMBNAIL_SIZE"]


class Wikidata_Client:
    """Class to handle all Wikidata API calls."""

    def batch_ids(self, ids, num_batches):
        """Yield batches of IDs split into num_batches."""
        ids = list(ids)
        batch_size = max(1, len(ids) // num_batches)
        for i in range(0, len(ids), batch_size):
            yield ids[i : i + batch_size]

    def __execute_query(self, query):
        """Execute a SPARQL query and return the results as JSON."""
        attempt = 0
        while True:
            try:
                sparql = SPARQLWrapper(WIKIDATA_ENDPOINT)
                sparql.setReturnFormat(JSON)

                sparql.setQuery(query)
                sparql.addCustomHttpHeader("User-Agent", "ForceDirectedGraphBot/1.0 (FDG@github.com)")
                results = sparql.query().convert()
                return results
            except Exception as e:
                attempt += 1
                print(f"Attempt {attempt}/{MAX_QUERY_ATTEMPTS} failed: {e}")
                if attempt >= MAX_QUERY_ATTEMPTS:
                    print(f"Query failed after {MAX_QUERY_ATTEMPTS} attempts")
                    return None
                print(f"Error {e}")
                delay = self._calculate_retry_delay(attempt)
                sleep(delay)

    def _calculate_retry_delay(self, attempt):
        """
        Calculate retry delay using exponential backoff with jitter.
        """
        exponential_delay = BASE_RETRY_DELAY * (2 ** attempt)
        
        # Add jitter (random 0% to 50% of delay)
        jitter = random.uniform(0, exponential_delay * 0.5)
        
        # Cap at maximum delay
        total_delay = min(MAX_RETRY_DELAY, exponential_delay + jitter)
        
        return total_delay
    
    def get_entity_data(self, entity_ids) -> dict:
        """Fetch entity data for a set of entity IDs."""
        entities = dict()
        batches = list(self.batch_ids(entity_ids, NUMBER_OF_DATA_WORKERS))
        with ThreadPoolExecutor(max_workers=NUMBER_OF_DATA_WORKERS) as executor:
            futures = [executor.submit(self._fetch_entity_batch, batch) for batch in batches]
            for future in as_completed(futures):
                batch_entities = future.result()
                entities.update(batch_entities)
        return entities
    
    def _fetch_entity_batch(self, batch):
        """Fetch entity data for a batch of IDs."""
        values_clause = " ".join(f"wd:{qid}" for qid in batch)
        query = f"""
        PREFIX schema: <http://schema.org/>
        SELECT ?entity ?entityLabel (SAMPLE(?type) AS ?mainType) (SAMPLE(?typeLabel) AS ?mainTypeLabel) (SAMPLE(?image) AS ?mainImage) (SAMPLE(?enwikiArticle) AS ?enwikiArticle)
            WHERE {{
                VALUES ?entity {{ {values_clause} }}
                OPTIONAL {{ 
                    ?entity wdt:P31 ?type .
                    ?type rdfs:label ?typeLabel .
                    FILTER(LANG(?typeLabel) = "en")
                }}
                OPTIONAL {{
                    ?entity wdt:P18 ?image .
                }}
                OPTIONAL {{
                    ?enwikiArticle schema:about ?entity ;
                    schema:isPartOf <https://en.wikipedia.org/> .
                }}
                SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,mul". }}
            }}
        GROUP BY ?entity ?entityLabel"""
        results_raw = self.__execute_query(query)
        entities = dict()
        if results_raw:
            results = results_raw.get("results", {}).get("bindings", {})
            parseEntityPayload(entities, results)
        return entities
    
    def get_property_data(self, property_ids) -> dict:
        """Fetch property data for a set of property IDs."""
        property_data = dict()
        batches = list(self.batch_ids(property_ids, NUMBER_OF_DATA_WORKERS))
        with ThreadPoolExecutor(max_workers=NUMBER_OF_DATA_WORKERS) as executor:
            futures = [executor.submit(self._fetch_property_batch, batch) for batch in batches]
            for future in as_completed(futures):
                batch_data = future.result()
                property_data.update(batch_data)
        return property_data
    
    def _fetch_property_batch(self, batch):
        """Fetch property data for a batch of property IDs."""
        values_clause = " ".join(f"wd:{pid}" for pid in batch)
        query = f"""
        SELECT ?property ?propertyLabel WHERE {{
            VALUES ?property {{ {values_clause} }}
            SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en, mul". }}
        }}
        """
        results_raw = self.__execute_query(query)
        property_data = dict()
        if results_raw:
            parsePropertyPayload(property_data, results_raw)
        return property_data

    def get_entity_relations(self, entity_ids: list[str], relation_limit: int = RELATION_LIMIT):
        """Fetch relations for a list of entity IDs, limited per entity."""
        relationships = set()
        batches = list(self.batch_ids(entity_ids, NUMBER_OF_RELATION_WORKERS))
        with ThreadPoolExecutor(max_workers=NUMBER_OF_RELATION_WORKERS) as executor:
            futures = [
                executor.submit(self._fetch_relation_batch, batch, relation_limit)
                for batch in batches
            ]
            for future in as_completed(futures):
                relationships.update(future.result())
        return relationships

    def _fetch_relation_batch(self, batch, relation_limit):
        """Fetch relations for a batch of entity IDs."""
        values_clause = " ".join([f"wd:{eid}" for eid in batch])
        query = f"""SELECT DISTINCT ?source ?property ?target ?sourceType ?targetType WHERE {{
                VALUES ?source {{ {values_clause} }} 
                ?source ?property ?target .
                ?source wdt:P31 ?sourceType .
                ?target wdt:P31 ?targetType .
                FILTER(STRSTARTS(STR(?target), "http://www.wikidata.org/entity/Q"))
                FILTER(STRSTARTS(STR(?property), "http://www.wikidata.org/prop/direct/"))
            }} 
            LIMIT {relation_limit}
        """
        results_raw = self.__execute_query(query)
        relationships = set()
        if results_raw:
            parseRelationsPayload(relationships, results_raw)
        return relationships

