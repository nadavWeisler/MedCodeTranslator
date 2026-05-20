# medcodetranslator — Python client

A minimal Python client for querying MedCodeTranslator vocabulary data.

## Installation

```bash
pip install medcodetranslator  # coming soon
```

Until published, install from source:

```bash
pip install -e .
```

## Usage

```python
from medcodetranslator import MedCodeTranslator

client = MedCodeTranslator(data_dir="../../data/vocabularies")

# Exact / substring search
results = client.search("atc5", "aspirin")
for r in results:
    print(r.code, r.name_en, r.score, r.match_method)

# Fuzzy search
results = client.search("icd10", "diabets", fuzzy=True)

# All schemes
print(client.schemes)  # ['atc5', 'icd10', 'icd9', ...]
```

## Status

🚧 Work in progress. See `/packages/python-client/medcodetranslator/` for implementation.
