from .Entity_Crawler import Entity_Crawler
from .Data_Handler import Data_Handler
from .Cleaner.Cleaner import Cleaner

class WikiGraph_Manager:
    """ Manages the process of building a Wikidata entity graph. """

    def __init__(self):
        self.data_handler = Data_Handler()
        self.entity_crawler = Entity_Crawler(self.data_handler)

    def build(self, source_id, depth=1, relation_limit = 5 ,raw=False):
        """ Crawls Wikidata starting from `source_id` up to `depth` levels
            and collects entity, property, and relation data."""
        self.entity_crawler.crawl_wiki(source_id, crawl_depth=depth, relation_limit=relation_limit)
        
        return self.data_handler.fetch_relations_data(
            source_id, 
            self.entity_crawler.entity_ids, 
            self.entity_crawler.property_ids, 
            self.entity_crawler.relations)
        
    def save_all(self):
        """ Saves all gathered data to json files"""
        self.data_handler.save_all()

    def change_json_dir(self, json_dir):
        self.data_handler.change_json_dir(json_dir)
    
    def ensure_json_files_exist(self):
        self.data_handler.ensure_json_files_exist()