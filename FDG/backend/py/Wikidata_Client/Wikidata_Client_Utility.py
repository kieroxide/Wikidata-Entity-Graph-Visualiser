import hashlib
import urllib.parse
from urllib.parse import urlparse, unquote

def parseRelationsPayload(relationships, results):
    for result in results.get("results", {}).get("bindings", {}):
        source_id = result["source"]["value"].split("/").pop()
        property_id = result["property"]["value"].split("/").pop()
        target_id = result["target"]["value"].split("/").pop()
        relationships.add((source_id, property_id, target_id))

    return relationships


def parsePropertyPayload(property_data, results):
    results = results.get("results", {}).get("bindings", {})
    for result in results:
       
        pid = result.get("property", {}).get("value", "").split("/")[-1]
        if pid == [""]:
            continue
        label: str = result.get("propertyLabel", {}).get("value", pid)
        property_data[pid] = label.title()

    return property_data


def parseEntityPayload(entities, results):
    for result in results:
        # Entity id and label gets
        e_id = result.get("entity", {}).get("value", "").split("/")[-1]
        if e_id == [""]:
            continue

        # Entity Label
        label: str = result.get("entityLabel", {}).get("value", e_id)
        if "xml:lang" in label:
            label = label["value"]
        
        # Local functions just for quick filtering
        def isWikiMetaData(label: str):
            lower_label = label.lower()
            if "wiki" in lower_label and "wikipedia" != lower_label:
                return True
            return False
        
        def isDictOrEnc(label: str):
            lower_label = label.lower()
            if "encyclopedia" in lower_label or "dictionary" in lower_label:
                return True
            return False
        
        if isWikiMetaData(label) or isDictOrEnc(label):
            continue

        # Entity Type data
        type: str = result.get("mainTypeLabel", {}).get("value", "Unknown Type")
        
        if isWikiMetaData(type) or isDictOrEnc(type):
            continue

        # Entity image data
        img = result.get("mainImage", {}).get("value", "")
        thumb_url = ""

        enwiki_url = result.get("enwikiArticle", {}).get("value", "")
        wikipedia_title = ""
        if enwiki_url:
            wikipedia_title = unquote(enwiki_url.split("/")[-1])

        if wikipedia_title == "":
            continue
        def get_commons_thumb_url(filename: str, size: int = 128) -> str:
            """
            Given a Wikimedia Commons filename, return the direct thumbnail URL.
            """
            # Replace spaces with underscores
            clean_name = filename.replace(" ", "_")
            # URL-encode the filename
            encoded_name = urllib.parse.quote(clean_name)
            # Compute MD5 hash
            md5 = hashlib.md5(clean_name.encode("utf-8")).hexdigest()
            # Build the path
            return (
                f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
                f"{md5[0]}/{md5[0:2]}/{encoded_name}/{size}px-{encoded_name}"
            )
        
        if img:
            # Extract just the filename from the URL
            path = urlparse(img).path
            filename = unquote(path.split("/")[-1])

            thumb_url = get_commons_thumb_url(filename, size=128)

        entities[e_id] = {
            "label": label.title(),
            "type": type.title(),
            "image": thumb_url,
            "wikipedia": wikipedia_title,
        }

    return entities
