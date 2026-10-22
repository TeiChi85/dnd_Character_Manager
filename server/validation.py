"""Structural validation only; no rule data or game calculations."""

import json
import math
import re

MAX_STRING = 65536
MAX_ARRAY = 2000
MAX_NODES = 50000
MAX_DEPTH = 64
MAX_PORTRAIT = 2 * 1024 * 1024
TEXT = {"name", "bgCustomName", "bgCustomDesc"}
NULLABLE_TEXT = {"edition", "className", "source", "slug", "subclassName", "raceLineage", "portrait"}
OBJECTS = {"choices", "bgChoices", "details", "raceChoices", "abilities", "equipment", "spells", "customProficiencies", "sheet"}
ARRAYS = {"customLanguages", "customDefences"}
NESTED = {
    "details": {"alignment": "text", "faith": "text", "lifestyle": "text"},
    "abilities": {"method": "text", "base": "object", "assign": "object", "other": "object", "override": "object", "rolled": "nullable_array"},
    "equipment": {"mode": "text", "starting": "object", "startingAdded": "bool", "inventory": "array", "currency": "object", "filterType": "text", "filterQ": "text"},
    "spells": {"cantrips": "array", "spells": "array", "levelFilter": "scalar", "q": "text"},
    "customProficiencies": {"armor": "array", "weapons": "array", "tools": "array"},
    "sheet": {"hpCurrent": "nullable_number", "hpTemp": "scalar", "res": "object", "hpEdited": "bool", "invQ": "text", "invAdd": "text", "xp": "scalar", "inspiration": "bool", "deathSucc": "number", "deathFail": "number", "dark": "bool", "acOther": "scalar", "acOverride": "scalar", "acEditOpen": "bool", "active": "object", "conc": "text"},
}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def strict_json(raw):
    return json.loads(raw, object_pairs_hook=unique_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("Non-finite JSON number")))


def validate_character(value):
    if not isinstance(value, dict) or value.get("_app") != "dnd-cc":
        raise ValueError("Expected a dnd-cc character object")
    if type(value.get("_v")) is not int or value["_v"] != 1:
        raise ValueError("Expected character format version 1")
    nodes = 0

    def walk(item, depth=0, portrait=False):
        nonlocal nodes
        nodes += 1
        if depth > MAX_DEPTH or nodes > MAX_NODES:
            raise ValueError("JSON is too deeply nested or contains too many values")
        if isinstance(item, str):
            if len(item.encode("utf-16-le", "surrogatepass")) // 2 > (MAX_PORTRAIT if portrait else MAX_STRING):
                raise ValueError("JSON string exceeds its length limit")
            if any(0xD800 <= ord(char) <= 0xDFFF for char in item):
                raise ValueError("JSON contains invalid Unicode")
        if type(item) in {int, float} and (abs(item) > 1e12 or not math.isfinite(item)):
            raise ValueError("JSON number is outside the supported range")
        if isinstance(item, dict):
            if len(item) > MAX_ARRAY:
                raise ValueError("JSON object contains too many keys")
            for key, child in item.items():
                if key in {"__proto__", "constructor", "prototype"} or len(key) > 200 or any(0xD800 <= ord(char) <= 0xDFFF for char in key):
                    raise ValueError("Unsafe or oversized JSON key")
                walk(child, depth + 1, depth == 0 and key == "portrait")
        elif isinstance(item, list):
            if len(item) > MAX_ARRAY:
                raise ValueError("JSON array contains too many entries")
            for child in item:
                walk(child, depth + 1)
    walk(value)

    def matches(item, kind):
        if kind.startswith("nullable_"):
            return item is None or matches(item, kind[9:])
        return {"text": isinstance(item, str), "object": isinstance(item, dict),
                "array": isinstance(item, list), "bool": type(item) is bool,
                "number": type(item) in {int, float},
                "scalar": isinstance(item, str) or type(item) in {int, float}}[kind]

    types = {**dict.fromkeys(TEXT, "text"), **dict.fromkeys(NULLABLE_TEXT, "nullable_text"),
             **dict.fromkeys(OBJECTS, "object"), **dict.fromkeys(ARRAYS, "array"),
             "background": "nullable_object", "race": "nullable_object",
             "bgIsCustom": "bool", "hdFaces": "nullable_number", "manualHp": "nullable_number"}
    for key, kind in types.items():
        if key in value and not matches(value[key], kind):
            raise ValueError("Invalid type for character." + key)
    for parent, fields in NESTED.items():
        if parent not in value:
            continue
        for key, kind in fields.items():
            if key in value[parent] and not matches(value[parent][key], kind):
                raise ValueError("Invalid type for character." + parent + "." + key)
    for key in ("name", "bgCustomName", "className", "subclassName", "source", "slug", "raceLineage"):
        if value.get(key) is not None and len(value[key].encode("utf-16-le")) // 2 > 200:
            raise ValueError("Character labels must be at most 200 characters")
    if "edition" in value and value["edition"] not in (None, "classic", "one"):
        raise ValueError("Unsupported edition; expected classic, one or null")
    if "level" in value and (type(value["level"]) is not int or not 1 <= value["level"] <= 20):
        raise ValueError("level must be an integer from 1 to 20")
    if value.get("slug") and not re.fullmatch(r"[a-zA-Z0-9_-]+", value["slug"]):
        raise ValueError("Invalid class slug")
    if value.get("portrait") and not re.fullmatch(r"data:image/png;base64,[a-zA-Z0-9+/=]+", value["portrait"]):
        raise ValueError("portrait must be a PNG data URL")
    for key in ("background", "race"):
        if value.get(key):
            for field in ("name", "source"):
                if field in value[key] and not isinstance(value[key][field], str):
                    raise ValueError("Invalid character reference")
    abilities = value.get("abilities", {})
    def numeric(item):
        if type(item) in {int, float}:
            return True
        return isinstance(item, str) and (item == "" or bool(re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", item)) and abs(float(item)) <= 1e12)
    for key in ("base", "assign", "other", "override"):
        if any(not numeric(item) for item in abilities.get(key, {}).values()):
            raise ValueError("Invalid ability value")
    if any(type(item) not in {int, float} for item in value.get("equipment", {}).get("currency", {}).values()):
        raise ValueError("Currency values must be numbers")
    for item in value.get("equipment", {}).get("inventory", []):
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise ValueError("Inventory entries require a name")
        for key in ("qty", "ac", "weight", "bonus", "bonusAc", "bonusWeapon"):
            if key in item and not numeric(item[key]):
                raise ValueError("Invalid inventory numeric field")
        for key in ("equipped", "attuned"):
            if key in item and type(item[key]) is not bool:
                raise ValueError("Invalid inventory toggle")
    sheet = value.get("sheet", {})
    for key in ("hpTemp", "xp", "acOther", "acOverride"):
        if key in sheet and not numeric(sheet[key]):
            raise ValueError("Invalid numeric character field: sheet." + key)
    for key in ("customLanguages", "customDefences"):
        if any(not isinstance(item, str) for item in value.get(key, [])):
            raise ValueError(key + " must contain strings")
    return value
