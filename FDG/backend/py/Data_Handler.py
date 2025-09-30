from .Wikidata_Client.Wikidata_Client import Wikidata_Client
from .Cleaner.Cleaner import Cleaner
import json
from pathlib import Path
import os

class Data_Handler:
    """Handles fetching, formatting, and saving Wikidata entity and property data."""
    def __init__(self, json_dir = None):
        self.wiki_client = Wikidata_Client()

        if json_dir is None:
            project_root = Path(__file__).parent.parent
            json_dir = project_root / "data"

        # Saves each file path to self
        self.change_json_dir(json_dir)
        
        self.cached_entities = self.read_file(self.entity_path)
        self.cached_properties = self.read_file(self.property_path)
        self.cached_relations = self.read_file(self.relations_path)

    def change_json_dir(self, dir_path):
        """Function to allow change of where data jsons will be saved"""
        self.__jsonDir = Path(dir_path).resolve()
        self.entity_path = self.__jsonDir / "entities.json"
        self.property_path = self.__jsonDir / "properties.json"
        self.relations_path = self.__jsonDir / "relations.json"
    
    def fetch_relations_data(self, source_id: str, entity_ids: set, property_ids: set, relations):
        """Fetches data for given entities and properties, and formats relations 
        Caches and returns the data."""

        # Track newly gathered data for this request including cached
        new_entities = {}
        new_properties = {}
        new_relations = {}

        # Checks cache first, if found removes from ids and add to new data
        for id in entity_ids:
            if id in self.cached_entities:
                new_entities[id] = self.cached_entities[id]
        
        entity_ids -= set(new_entities.keys())

        for id in property_ids:
            if id in self.cached_properties:
                new_properties[id] = self.cached_properties[id]
        
        property_ids -= set(new_properties.keys())
    
        # Fetch non-cache Data and add to new data
        new_entities.update(self.wiki_client.get_entity_data(entity_ids))
        new_properties.update(self.wiki_client.get_property_data(property_ids))

        # Convert and merge relations
        new_relations = self.__convert_relations_to_dict(relations)
        
        # Removes bad data however does clean already cleaned cached data but thats fine
        new_entities, new_properties, new_relations = Cleaner.clean_data(source_id, new_entities, new_properties, new_relations)
        
        # Update cache with new data
        self.cached_entities.update(new_entities)
        self.cached_properties.update(new_properties)
        self.cached_relations.update(new_relations)

        return new_entities, new_properties, new_relations

    def save_all(self):
        """
        Save all collected data (relations, entities, properties) to JSON files.
        Uses internal paths defined in self.__entity_path, self.__property_path, and self.__relations_path.
        """
        if self.cached_relations:
            self.__save_to_file(self.cached_relations, self.relations_path)
        if self.cached_entities:
            self.__save_to_file(self.cached_entities, self.entity_path)
        if self.cached_properties:
            self.__save_to_file(self.cached_properties, self.property_path)

    def __save_to_file(self, obj, PATH):
        """Save a dictionary to a JSON file, creating the directory if needed."""
        self.__jsonDir.mkdir(exist_ok=True)
        
        with open(PATH, "w") as f:
            json.dump(dict(obj), f, indent=2)

    def read_file(self, PATH):
        """Save a dictionary to a JSON file, creating the directory if needed."""
        self.__jsonDir.mkdir(exist_ok=True)
        
        if not Path(PATH).exists():
            return {}
        
        with open(PATH, "r") as f:
            data = json.load(f)
        return data

    def __convert_relations_to_dict(self, relations):
        """Convert a set of (source, property, target) tuples into a nested dictionary."""

        relations_dict = {}
        for source_id, property_id, target_id in relations:
            if source_id not in relations_dict:
                relations_dict[source_id] = {}
            if property_id not in relations_dict[source_id]:
                relations_dict[source_id][property_id] = []
            relations_dict[source_id][property_id].append(target_id)
        return relations_dict

    def ensure_json_files_exist(self):
        """Saves empty json files to data dir if file does not exist"""
        self.__jsonDir.mkdir(exist_ok=True)

        file_paths = [
           self.entity_path,
           self.relations_path,
           self.property_path
        ]

        for path in file_paths:
            if not os.path.exists(path):
                with open(path, "w") as f:
                    json.dump({}, f)