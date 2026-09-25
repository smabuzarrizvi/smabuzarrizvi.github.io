#!/usr/bin/env python3
"""Refresh data/visitors.json with AGGREGATE visitor statistics from GoatCounter.

Run by .github/workflows/visitor-stats.yml. Requires:
  GOATCOUNTER_CODE   your GoatCounter site code (e.g. "smarizvi" for smarizvi.goatcounter.com)
  GOATCOUNTER_TOKEN  an API token with "Read statistics" permission (store as a GitHub secret)
  GOATCOUNTER_START  optional, first day to count from (YYYY-MM-DD); default 2026-01-01

Only totals and per-country counts are written. No IPs, paths, referrers or
per-visitor data ever leave GoatCounter.
"""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "visitors.json"


def api(base, token, path, params):
    url = f"{base}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    code = os.environ.get("GOATCOUNTER_CODE", "").strip()
    token = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
    if not code or not token:
        print("GOATCOUNTER_CODE / GOATCOUNTER_TOKEN not set; nothing to do.")
        return 0
    start = os.environ.get("GOATCOUNTER_START", "").strip() or "2026-01-01"
    base = f"https://{code}.goatcounter.com/api/v0"
    today = dt.datetime.now(dt.timezone.utc)
    params = {"start": f"{start}T00:00:00Z", "end": today.strftime("%Y-%m-%dT%H:00:00Z")}

    total = api(base, token, "/stats/total", params)
    locations = api(base, token, "/stats/locations", {**params, "limit": 200})

    countries = []
    for s in locations.get("stats", []):
        cc = (s.get("id") or "").upper()
        if not cc:
            continue  # unknown location
        countries.append({"id": cc, "name": s.get("name") or cc, "count": int(s.get("count", 0))})
    countries.sort(key=lambda c: c["count"], reverse=True)

    data = {
        "configured": True,
        "provider": "goatcounter",
        "updated": today.replace(microsecond=0).isoformat(),
        "since": start,
        "total": int(total.get("total", sum(c["count"] for c in countries))),
        "countries": countries,
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}: total={data['total']}, countries={len(countries)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
