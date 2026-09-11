import json
import sys
import traceback
from methods import run

def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        result = run(payload)
        print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "error": str(exc),
            "trace": traceback.format_exc()
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()
