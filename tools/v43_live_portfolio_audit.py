#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import gzip
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import Counter, deque
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = "SmarterJusticePortfolioAudit/1.0 (+read-only; portfolio quality audit)"
DEFAULT_DOMAINS = [
    "smarterjustice.com",
    "smarterjustice.org",
    "bankruptcydebtlawaid.com",
    "bankruptcylawaid.com",
    "caraccidentlawaid.com",
    "civilrightslawaid.com",
    "consumerprotectionlawaid.com",
    "contractcreator.com",
    "coverednyc.com",
    "criminallawaid.com",
    "disabilitylawaid.com",
    "divorcelawaid.com",
    "domesticviolenceaid.com",
    "eldercarelawaid.com",
    "employmentlawaid.com",
    "estatelawaid.com",
    "insuranceclaimlawaid.com",
    "justicetaxsolutions.com",
    "justicetruck.com",
    "medicalmalpracticelawaid.com",
    "personalinjurylawaid.com",
    "realestatelawaid.com",
    "trademarkpatentiplawaid.com",
    "workerscompensationlawaid.com",
]
ASSET_EXT = re.compile(r"\.(?:avif|bmp|css|csv|docx?|eot|gif|ico|jpe?g|js|json|map|mp3|mp4|ogg|otf|pdf|png|pptx?|svg|tar|tgz|tiff?|ttf|txt|wav|webm|webp|woff2?|xlsx?|xml|zip)(?:$|[?#])", re.I)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.title_parts = []
        self.in_title = False
        self.h1_count = 0
        self.viewport = False
        self.lang = None
        self.canonical = None
        self.alternates = []

    def handle_starttag(self, tag, attrs):
        d = {str(k).lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "html" and d.get("lang"):
            self.lang = d.get("lang")
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "a" and d.get("href"):
            self.links.append(d["href"])
        elif tag == "meta" and d.get("name", "").lower() == "viewport":
            self.viewport = True
        elif tag == "link":
            rel = d.get("rel", "").lower().split()
            href = d.get("href")
            if href and "canonical" in rel:
                self.canonical = href
            if href and "alternate" in rel and d.get("hreflang"):
                self.alternates.append({"hreflang": d.get("hreflang"), "href": href})

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self):
        return " ".join(" ".join(self.title_parts).split())


def norm_host(host: str) -> str:
    host = (host or "").lower().split(":", 1)[0].rstrip(".")
    return host[4:] if host.startswith("www.") else host


def canonicalize(url: str, base: str | None = None) -> str | None:
    try:
        if base:
            url = urllib.parse.urljoin(base, url)
        p = urllib.parse.urlsplit(url)
        if p.scheme not in ("http", "https") or not p.netloc:
            return None
        if ASSET_EXT.search(p.path or ""):
            return None
        path = re.sub(r"/{2,}", "/", p.path or "/")
        return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), path, "", ""))
    except Exception:
        return None


def same_site(url: str, domain: str) -> bool:
    try:
        return norm_host(urllib.parse.urlsplit(url).netloc) == norm_host(domain)
    except Exception:
        return False


def request_bytes(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.2",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    })
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(4_000_000)
            return {
                "ok": True,
                "status": int(getattr(r, "status", 200)),
                "final_url": r.geturl(),
                "content_type": r.headers.get("Content-Type", ""),
                "content_encoding": r.headers.get("Content-Encoding", ""),
                "body": body,
                "elapsed_ms": round((time.monotonic() - start) * 1000),
            }
    except urllib.error.HTTPError as e:
        try:
            body = e.read(1_000_000)
        except Exception:
            body = b""
        return {"ok": False, "status": int(e.code), "final_url": e.geturl(), "content_type": e.headers.get("Content-Type", "") if e.headers else "", "body": body, "elapsed_ms": round((time.monotonic() - start) * 1000), "error": str(e)}
    except Exception as e:
        return {"ok": False, "status": 0, "final_url": url, "content_type": "", "body": b"", "elapsed_ms": round((time.monotonic() - start) * 1000), "error": f"{type(e).__name__}: {e}"}


def decode_text(body: bytes, content_type: str) -> str:
    charset = "utf-8"
    m = re.search(r"charset=([\w.-]+)", content_type or "", re.I)
    if m:
        charset = m.group(1)
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def parse_robots(domain: str):
    candidates = [f"https://{domain}/robots.txt", f"https://www.{domain}/robots.txt"]
    text = ""
    source = None
    for u in candidates:
        r = request_bytes(u, 12)
        if r["status"] == 200:
            text = decode_text(r["body"], r["content_type"])
            source = r["final_url"]
            break
    rp = urllib.robotparser.RobotFileParser()
    if text:
        rp.set_url(source or candidates[0])
        rp.parse(text.splitlines())
    else:
        rp.parse([])
    sitemaps = []
    for line in text.splitlines():
        if line.lower().startswith("sitemap:"):
            v = line.split(":", 1)[1].strip()
            if v.startswith(("http://", "https://")):
                sitemaps.append(v)
    if not sitemaps:
        sitemaps = [f"https://{domain}/sitemap.xml", f"https://www.{domain}/sitemap.xml"]
    return rp, source, list(dict.fromkeys(sitemaps))


def parse_sitemap(url: str):
    r = request_bytes(url, 20)
    if r["status"] != 200:
        return [], [], {"url": url, "status": r["status"], "error": r.get("error")}
    body = r["body"]
    if url.lower().endswith(".gz") or r.get("content_encoding", "").lower() == "gzip":
        try:
            body = gzip.decompress(body)
        except Exception:
            pass
    try:
        root = ET.fromstring(body)
    except Exception as e:
        return [], [], {"url": url, "status": r["status"], "error": f"XML parse: {e}"}
    tag = root.tag.rsplit("}", 1)[-1].lower()
    locs = [((n.text or "").strip()) for n in root.iter() if n.tag.rsplit("}", 1)[-1].lower() == "loc" and (n.text or "").strip()]
    if tag == "sitemapindex":
        return [], locs, {"url": url, "status": 200, "kind": "index", "locs": len(locs)}
    return locs, [], {"url": url, "status": 200, "kind": "urlset", "locs": len(locs)}


def discover_sitemaps(domain: str, seeds: list[str], deadline: float):
    page_urls, seen_maps, queue, meta = set(), set(), deque(seeds), []
    while queue and time.monotonic() < deadline:
        sm = queue.popleft()
        if sm in seen_maps:
            continue
        seen_maps.add(sm)
        urls, indexes, record = parse_sitemap(sm)
        meta.append(record)
        for u in urls:
            c = canonicalize(u)
            if c and same_site(c, domain):
                page_urls.add(c)
        for child in indexes:
            if child not in seen_maps and same_site(child, domain):
                queue.append(child)
    return page_urls, meta


def fetch_page(url: str, domain: str, rp: urllib.robotparser.RobotFileParser):
    try:
        if not rp.can_fetch(USER_AGENT, url):
            return {"url": url, "status": -1, "robots_blocked": True, "links": []}
    except Exception:
        pass
    r = request_bytes(url, 20)
    rec = {
        "url": url,
        "status": r["status"],
        "final_url": r["final_url"],
        "elapsed_ms": r["elapsed_ms"],
        "content_type": r["content_type"],
        "redirected": r["final_url"] != url,
        "links": [],
    }
    if r.get("error"):
        rec["error"] = r["error"]
    ctype = (r["content_type"] or "").lower()
    looks_html = "text/html" in ctype or "application/xhtml" in ctype or (r["status"] == 200 and b"<html" in r["body"][:4096].lower())
    if r["status"] == 200 and looks_html:
        html = decode_text(r["body"], r["content_type"])
        p = PageParser()
        try:
            p.feed(html)
        except Exception as e:
            rec["parse_error"] = str(e)
        rec.update({
            "title": p.title,
            "h1_count": p.h1_count,
            "viewport": p.viewport,
            "lang": p.lang,
            "canonical": p.canonical,
            "alternates": p.alternates,
        })
        links = []
        for href in p.links:
            c = canonicalize(href, r["final_url"])
            if c and same_site(c, domain):
                links.append(c)
        rec["links"] = sorted(set(links))
    return rec


def audit_domain(domain: str, global_deadline: float, workers: int):
    started = datetime.now(timezone.utc).isoformat()
    rp, robots_source, sitemap_seeds = parse_robots(domain)
    sitemap_urls, sitemap_meta = discover_sitemaps(domain, sitemap_seeds, global_deadline)
    roots = [f"https://{domain}/", f"https://www.{domain}/"]
    initial = []
    for u in roots:
        c = canonicalize(u)
        if c:
            initial.append(c)
    pending = deque(sorted(set(initial) | sitemap_urls))
    seen, pages = set(), []
    source_map = {u: "sitemap" for u in sitemap_urls}
    for u in initial:
        source_map.setdefault(u, "root")
    timed_out = False

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        while pending:
            if time.monotonic() >= global_deadline:
                timed_out = True
                break
            batch = []
            while pending and len(batch) < workers * 4:
                u = pending.popleft()
                if u not in seen:
                    seen.add(u)
                    batch.append(u)
            if not batch:
                continue
            futs = {pool.submit(fetch_page, u, domain, rp): u for u in batch}
            for fut in concurrent.futures.as_completed(futs):
                try:
                    rec = fut.result()
                except Exception as e:
                    rec = {"url": futs[fut], "status": 0, "error": f"worker: {e}", "links": []}
                rec["discovery"] = source_map.get(rec["url"], "internal_link")
                pages.append(rec)
                if rec.get("status") == 200:
                    for link in rec.get("links", []):
                        if link not in seen:
                            source_map.setdefault(link, "internal_link")
                            pending.append(link)

    pages.sort(key=lambda x: x["url"])
    statuses = Counter(str(p.get("status", 0)) for p in pages)
    html_pages = [p for p in pages if "title" in p]
    findings = {
        "non_200": sum(1 for p in pages if p.get("status") not in (200, -1)),
        "robots_blocked": sum(1 for p in pages if p.get("status") == -1),
        "missing_title": sum(1 for p in html_pages if not p.get("title")),
        "missing_h1": sum(1 for p in html_pages if p.get("h1_count", 0) == 0),
        "multiple_h1": sum(1 for p in html_pages if p.get("h1_count", 0) > 1),
        "missing_viewport": sum(1 for p in html_pages if not p.get("viewport")),
        "redirects": sum(1 for p in pages if p.get("redirected")),
        "errors": sum(1 for p in pages if p.get("error")),
    }
    return {
        "domain": domain,
        "started_at_utc": started,
        "completed_at_utc": datetime.now(timezone.utc).isoformat(),
        "robots_source": robots_source,
        "sitemaps": sitemap_meta,
        "sitemap_discovered_routes": len(sitemap_urls),
        "total_discovered_routes": len(seen) + len(set(pending) - seen),
        "audited_routes": len(pages),
        "remaining_routes": len(set(pending) - seen),
        "timed_out": timed_out,
        "status_distribution": dict(sorted(statuses.items())),
        "findings": findings,
        "pages": pages,
    }


def make_summary(report):
    lines = [
        "# Smarter Justice live portfolio crawl",
        "",
        f"Audit started: `{report['started_at_utc']}`",
        f"Audit completed: `{report['completed_at_utc']}`",
        f"Domains attempted: **{report['summary']['domains_attempted']}**",
        f"Domains with at least one HTTP 200 page: **{report['summary']['domains_reachable']}**",
        f"Total discovered routes: **{report['summary']['total_discovered_routes']}**",
        f"Total audited routes: **{report['summary']['total_audited_routes']}**",
        f"Non-200 routes: **{report['summary']['non_200']}**",
        f"Audit complete without deadline truncation: **{report['summary']['complete']}**",
        "",
        "| Domain | Sitemap routes | Discovered | Audited | Non-200 | Missing title | Missing H1 | Missing viewport | Timed out |",
        "|---|---:|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for d in report["domains"]:
        f = d["findings"]
        lines.append(f"| {d['domain']} | {d['sitemap_discovered_routes']} | {d['total_discovered_routes']} | {d['audited_routes']} | {f['non_200']} | {f['missing_title']} | {f['missing_h1']} | {f['missing_viewport']} | {'YES' if d['timed_out'] else 'no'} |")
    lines += ["", "This audit is read-only. It does not submit forms, create records, change provider settings, or bypass access controls."]
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domains", nargs="*", default=DEFAULT_DOMAINS)
    ap.add_argument("--output", default="v43-live-portfolio-audit.json")
    ap.add_argument("--summary", default="v43-live-portfolio-audit.md")
    ap.add_argument("--deadline-minutes", type=int, default=80)
    ap.add_argument("--domain-workers", type=int, default=5)
    ap.add_argument("--page-workers", type=int, default=4)
    args = ap.parse_args()

    domains = []
    for d in args.domains:
        d = norm_host(d)
        if d and d not in domains:
            domains.append(d)
    started = datetime.now(timezone.utc).isoformat()
    deadline = time.monotonic() + max(5, args.deadline_minutes) * 60
    results = []

    def run(d):
        try:
            return audit_domain(d, deadline, max(1, args.page_workers))
        except Exception as e:
            return {
                "domain": d,
                "started_at_utc": datetime.now(timezone.utc).isoformat(),
                "completed_at_utc": datetime.now(timezone.utc).isoformat(),
                "robots_source": None,
                "sitemaps": [],
                "sitemap_discovered_routes": 0,
                "total_discovered_routes": 0,
                "audited_routes": 0,
                "remaining_routes": 0,
                "timed_out": time.monotonic() >= deadline,
                "status_distribution": {},
                "findings": {"non_200": 0, "robots_blocked": 0, "missing_title": 0, "missing_h1": 0, "multiple_h1": 0, "missing_viewport": 0, "redirects": 0, "errors": 1},
                "pages": [],
                "fatal_error": f"{type(e).__name__}: {e}",
            }

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.domain_workers)) as pool:
        futs = {pool.submit(run, d): d for d in domains}
        for fut in concurrent.futures.as_completed(futs):
            results.append(fut.result())
    results.sort(key=lambda x: x["domain"])

    reachable = sum(1 for d in results if d.get("status_distribution", {}).get("200", 0) > 0)
    total_discovered = sum(d.get("total_discovered_routes", 0) for d in results)
    total_audited = sum(d.get("audited_routes", 0) for d in results)
    non_200 = sum(d.get("findings", {}).get("non_200", 0) for d in results)
    complete = all(not d.get("timed_out") and d.get("remaining_routes", 0) == 0 for d in results)
    report = {
        "schema": "smarter-justice-v43-live-portfolio-audit-v1",
        "mode": "read_only_non_destructive",
        "started_at_utc": started,
        "completed_at_utc": datetime.now(timezone.utc).isoformat(),
        "user_agent": USER_AGENT,
        "summary": {
            "domains_attempted": len(results),
            "domains_reachable": reachable,
            "total_discovered_routes": total_discovered,
            "total_audited_routes": total_audited,
            "non_200": non_200,
            "complete": complete,
        },
        "domains": results,
    }
    Path(args.output).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    Path(args.summary).write_text(make_summary(report), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
