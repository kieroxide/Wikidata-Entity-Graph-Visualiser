def remove_unconnected_vertices(entities, relations):
    """Filters vertices that are not referenced in relations e.g no connections"""
    referenced_ids = set()
    # Collect all source ids
    referenced_ids.update(relations.keys()) 

    # Collect all target ids
    for relation in relations.values():
        for _, targets in relation.items():
            for target in targets:
                referenced_ids.add(target)

    # Filter entities
    referenced_entities = {
        entity_id: entity_label
        for entity_id, entity_label in entities.items()
        if entity_id in referenced_ids
    }

    return referenced_entities

def filter_invalid_relations(relations, entities, properties):
    """
    Remove any relation that includes entities or properties not present in the given dicts.
    Returns a cleaned relations dict.
    """
    cleaned_relations = {}
    for source, relation in relations.items():
        if source not in entities:
            continue
        cleaned_relation = {}
        for prop_id, target_ids in relation.items():
            if prop_id not in properties.keys():
                continue
            kept_targets = [t for t in target_ids if t in entities]
            if kept_targets:
                cleaned_relation[prop_id] = kept_targets
        if cleaned_relation:
            cleaned_relations[source] = cleaned_relation
    return cleaned_relations

def ensure_one_component(source_id, relations, entities):
    """
    Keep only the connected component containing source_id.
    Returns filtered entities and relations.
    """
    if source_id not in entities:
        return {}, {}
    
    from collections import deque, defaultdict
    
    # Create graph adj list for easier BFS
    adj = defaultdict(set)
    for src, rels in relations.items():
        for targets in rels.values():
            for tgt in targets:
                adj[src].add(tgt)
                adj[tgt].add(src)
    
    # Classic bfs algo starting from the source_id
    visited = set()
    queue = deque([source_id])
    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            queue.extend(adj[node] - visited)
    
    # Filter any data not in the bfs search to provide one component
    filtered_entities = {eid: data for eid, data in entities.items() if eid in visited}
    filtered_relations = {}
    for src, rels in relations.items():
        if src in visited:
            filtered_rels = {}
            for prop, targets in rels.items():
                filtered_targets = [t for t in targets if t in visited]
                if filtered_targets:
                    filtered_rels[prop] = filtered_targets
            if filtered_rels:
                filtered_relations[src] = filtered_rels

    return filtered_entities, filtered_relations

def find_no_label_entities(entities, console=False):
    """
    Return a set of entity IDs where the label is missing or the same as the ID.
    """
    if not entities:
        return set()
    
    no_label_ids = set()
    for entity_id, entity_data in entities.items():
        entity_label = entity_data.get("label", entity_id)
        if entity_id == entity_label:
            no_label_ids.add(entity_id)

    if no_label_ids:
        if console:
            print(f"Label Test Failed: {no_label_ids}")
        return no_label_ids
    elif console:
        print("Entity test passed!")
    return set()

def find_no_label_properties(properties, console=False):
    """
    Return a set of property IDs where the label is missing or the same as the property code.
    """
    if not properties:
        return set()
    
    no_label_ids = set()
    for prop_id, prop_label in properties.items():
        if prop_id == prop_label:
            no_label_ids.add(prop_id)
    
    if no_label_ids:
        if console:
            print(f"Label Test Failed: {no_label_ids}")
        return no_label_ids
    
    if console:
        print("Entity test passed!")
    return set()

def find_unreferenced_entities(entities, relations, console=False):
    """
    Return a set of entity IDs that are referenced in relations but missing from the entities dict.
    """
    all_ids = set()
    for source_id, relation in relations.items():
        all_ids.add(source_id)
        for _, target_ids in relation.items():
            for target_id in target_ids:
                all_ids.add(target_id)
    
    non_mapped_ids = set()
    for id in all_ids:
        if id not in entities.keys():
            non_mapped_ids.add(id)

    if non_mapped_ids:
        if console:
            print(non_mapped_ids)
        return non_mapped_ids
    else:
        if console:
            print("All relation test passed!")
        return set()
