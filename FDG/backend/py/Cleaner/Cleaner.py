from .CleanerUtility import (
    ensure_one_component, filter_invalid_relations, 
    find_no_label_entities, find_no_label_properties, 
    find_unreferenced_entities, remove_unconnected_vertices
)

class Cleaner:
    @staticmethod
    def clean_data(source_id: str, entities: dict, properties: dict, relations: dict, console=False):
        """
        Clean entities, properties, and relations by removing items with missing or invalid labels,
        and entities with no relations. Properties are not heavily filtered.
        """
        # Remove entities with no labels
        no_label_entities = find_no_label_entities(entities, console)
        for no_label_entity in no_label_entities:
            entities.pop(no_label_entity, None)

        no_label_properties = find_no_label_properties(properties, console)
        for prop_id in no_label_properties:
            properties.pop(prop_id)
        
        relations = filter_invalid_relations(relations, entities, properties)
        
        unreferenced_entity_ids = find_unreferenced_entities(entities, relations, console)
        for unreference_entity_id in unreferenced_entity_ids:
            entities.pop(unreference_entity_id, None)

        entities = remove_unconnected_vertices(entities, relations)

        entities, relations = ensure_one_component(source_id ,relations, entities, )

        return entities, properties, relations
