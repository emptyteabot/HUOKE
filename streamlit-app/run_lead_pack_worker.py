import argparse
import json
import time
from pathlib import Path

from lead_pack import process_lead_pack_order, process_queued_orders


def main() -> None:
    parser = argparse.ArgumentParser(description="Lead-pack worker")
    parser.add_argument("--order-id", default="", help="single order id to process")
    parser.add_argument("--max-jobs", type=int, default=3, help="max queued jobs per tick")
    parser.add_argument("--loop", action="store_true", help="run forever")
    parser.add_argument("--sleep", type=int, default=20, help="loop interval seconds")
    parser.add_argument("--force", action="store_true", help="process unpaid order too")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]

    def run_once():
        if args.order_id:
            result = process_lead_pack_order(args.order_id, project_root=root, force=args.force)
            print(json.dumps(result, ensure_ascii=False))
            return

        results = process_queued_orders(max_jobs=args.max_jobs, project_root=root)
        print(json.dumps(results, ensure_ascii=False))

    if args.loop:
        while True:
            try:
                run_once()
            except Exception as exc:  # pragma: no cover
                print(json.dumps({"error": str(exc)}, ensure_ascii=False))
            time.sleep(max(3, int(args.sleep or 20)))
    else:
        run_once()


if __name__ == "__main__":
    main()

