Return a bash script ONLY inside a code fence:
```bash
#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:8787}
AUTH=${AUTH:-audkey}
# health
curl -fsS "$BASE/healthz" | jq -r .status
# inventory
curl -fsS "$BASE/api/inventory" -H "Authorization: Bearer $AUTH" | jq 'length'
# run check
curl -fsS -X POST "$BASE/api/checks/run?use_case_id={{USE_CASE_ID}}&kit=logkit&mode=dry" -H "Authorization: Bearer $AUTH" >/dev/null
# export
curl -fsS "$BASE/api/export/use-case/{{USE_CASE_ID}}.json" -H "Authorization: Bearer $AUTH" | jq .use_case.id
```
