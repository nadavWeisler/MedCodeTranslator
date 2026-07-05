# medcodetranslator — Python client

A minimal Python client for querying MedCodeTranslator vocabulary data.

## Installation

```bash
pip install medcodetranslator
```

From source:

```bash
pip install -e packages/python-client
```

## Usage

```python
from medcodetranslator import MedCodeTranslator

client = MedCodeTranslator(data_dir="../../data/vocabularies")

results = client.search("icd10", "diabetes")
for result in results:
    print(result.code, result.name_en, result.score, result.match_method)

cross_results = client.search_all("glucose", limit=10)
for result in cross_results:
    print(result.scheme, result.code, result.name_en)
```

Point `data_dir` at the monorepo `data/vocabularies` directory (or your own export) for full scheme coverage.

## Publishing

Release tags trigger `.github/workflows/publish-packages.yml`, which publishes to PyPI using trusted publishing.
