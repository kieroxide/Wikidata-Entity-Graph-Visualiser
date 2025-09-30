from WikiGraphServer import app
from collections import defaultdict


def build_adjacency_list(relations):
    """Build an undirected adjacency list from relations."""
    adj = defaultdict(list)
    for source_id, relation in relations.items():
        for _, targets in relation.items():
            for target_id in targets:
                adj[source_id].append(target_id)
                adj[target_id].append(source_id)
    return adj


def bfs(adj):
    """Breadth-first search traversal order of the graph."""
    visited = set()
    if not adj:
        return []
    queue = [list(adj.keys())[0]]
    order = []
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(node)
            order.append(node)
            queue.extend(
                neighbor for neighbor in adj.get(node, []) if neighbor not in visited
            )
    return order


def check_disconnections(entities, adj):
    """Prints unvisited nodes if the graph is disconnected."""
    bfs_res = bfs(adj)
    if len(bfs_res) != len(entities):
        unvisited_nodes = set(entities.keys()) - set(bfs_res)
        print("Disconnected nodes:", unvisited_nodes)
        print("BFS order:", bfs_res)


def check_filtering_consistency(entities, properties, relations, adj):
    """Checks for missing targets, unconnected entities, and unused properties."""
    # Check for relations pointing to missing entities
    missing_targets = {
        target
        for rels in relations.values()
        for targets in rels.values()
        for target in targets
        if target not in entities
    }
    if missing_targets:
        print("Relations point to missing entities:", missing_targets)
    else:
        print("All relations point to valid entities.")
    # Check for entities with no relations
    unconnected = [eid for eid in entities if eid not in adj]
    if unconnected:
        print("Entities with no relations:", unconnected)
    else:
        print("All entities are connected.")
    # Check for properties that are unused
    used_properties = {prop for rels in relations.values() for prop in rels.keys()}
    unused_properties = set(properties.keys()) - used_properties
    if unused_properties:
        print("Unused properties:", unused_properties)
    else:
        print("All properties are used.")


def test_multiple_qids(qids):
    """Test a batch of QIDs for connectivity and filtering consistency."""
    for qid in qids:
        print(f"\nTesting QID: {qid}")
        with app.test_client() as client:
            response = client.get(f"/api/graph/{qid}")
        data = response.json["data"]
        entities = data["entities"]
        properties = data["properties"]
        relations = data["relations"]
        adj = build_adjacency_list(relations)
        bfs_res = bfs(adj)
        if len(bfs_res) != len(entities):
            print("Disconnected nodes detected!")
        check_filtering_consistency(entities, properties, relations, adj)
        print("BFS order:", bfs_res)


def main():
    with app.test_client() as client:
        response = client.get("/api/graph/Q1")
    data = response.json["data"]
    entities = data["entities"]
    properties = data["properties"]
    relations = data["relations"]
    adj = build_adjacency_list(relations)
    check_disconnections(entities, adj)
    check_filtering_consistency(entities, properties, relations, adj)
    print("BFS order:", bfs(adj))

    # Test a batch of QIDs
    from random import randint

    qids_to_test = []
    # Random batch to avoid false testing
    for i in range(15):
        qids_to_test.append(f"Q{randint(1, 1000000)}")

    # Curated list to ensure valid QIDS are always tested
    qids_to_test.append(
        ...[
            "Q1",
            "Q5",
            "Q42",
            "Q76",
            "Q90",
            "Q95",
            "Q146",
            "Q2013",
            "Q6256",
            "Q11424",
            "Q16521",
            "Q1860",
            "Q937",
            "Q215627",
            "Q3331189",
        ]
    )

    test_multiple_qids(qids_to_test)


if __name__ == "__main__":
    main()
