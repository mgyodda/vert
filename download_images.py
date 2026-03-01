#!/usr/bin/env python3

import os, re, sys, time, hashlib
from urllib.parse import urljoin, urlparse
from collections import deque

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Нужны пакеты: requests, beautifulsoup4\nУстановить: pip install requests beautifulsoup4")
    sys.exit(1)

BASE = "https://ksk-vertikal.ru/"
ALT_BASE = "https://www.ksk-vertikal.ru/"
OUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "img", "old")
os.makedirs(OUT_DIR, exist_ok=True)

# Maps to names used in шаблоне (можно дополнять)
WANTED = {
  "hero": "hero.jpg",
  "boarding": "boarding.jpg",
  "lessons": "lessons.jpg",
  "rent": "rent.jpg",
  "sale": "sale.jpg",
  "rehab": "rehab.jpg",
  "events": "events.jpg",
}

START_PAGES = [
  BASE,
  urljoin(BASE, "arenda-dennikov.htm"),
  urljoin(BASE, "arenda-loshadey.htm"),
  urljoin(BASE, "reabilitatsiya.htm"),
  urljoin(BASE, "organizatsiya-otdyha.htm"),
  urljoin(BASE, "romanticheskie-progulki.htm"),
]

UA = {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"}

def fetch(url):
    for base in (None, ALT_BASE):
        try_url = url
        if base and url.startswith(BASE):
            try_url = url.replace(BASE, base)
        try:
            r = requests.get(try_url, headers=UA, timeout=20)
            if r.status_code == 200:
                return r
        except Exception:
            pass
    return None

def safe_name(url, content_type):
    p = urlparse(url).path
    ext = os.path.splitext(p)[1].lower()
    if ext not in (".jpg",".jpeg",".png",".gif",".webp",".svg"):
        # guess from content-type
        if "png" in (content_type or ""): ext = ".png"
        elif "gif" in (content_type or ""): ext = ".gif"
        elif "webp" in (content_type or ""): ext = ".webp"
        elif "svg" in (content_type or ""): ext = ".svg"
        else: ext = ".jpg"
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    return f"img_{h}{ext}"

def save_file(name, data):
    path = os.path.join(OUT_DIR, name)
    with open(path, "wb") as f:
        f.write(data)
    return path

def crawl(depth=2, max_pages=80):
    q = deque([(u,0) for u in START_PAGES])
    seen = set()
    image_urls = set()

    while q and len(seen) < max_pages:
        url, d = q.popleft()
        if url in seen: 
            continue
        seen.add(url)
        r = fetch(url)
        if not r:
            continue
        html = r.text
        soup = BeautifulSoup(html, "html.parser")

        # collect images
        for tag in soup.find_all(["img", "source"]):
            src = tag.get("src") or tag.get("data-src") or tag.get("srcset")
            if not src: 
                continue
            # srcset can contain multiple urls
            candidates = [c.strip().split(" ")[0] for c in src.split(",")]
            for c in candidates:
                if not c: 
                    continue
                full = urljoin(url, c)
                if urlparse(full).netloc.endswith("ksk-vertikal.ru"):
                    image_urls.add(full)

        # also look for CSS background images in inline styles
        for tag in soup.find_all(style=True):
            st = tag["style"]
            for m in re.findall(r"url\(['\"]?(.*?)['\"]?\)", st):
                full = urljoin(url, m)
                if urlparse(full).netloc.endswith("ksk-vertikal.ru"):
                    image_urls.add(full)

        # follow links
        if d < depth:
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith("#"):
                    continue
                full = urljoin(url, href)
                u = urlparse(full)
                if u.netloc.endswith("ksk-vertikal.ru") and (u.path.endswith(".htm") or u.path.endswith(".html") or u.path.endswith("/")):
                    q.append((full, d+1))

    return sorted(image_urls)

def main():
    print("Сканирую страницы и собираю изображения…")
    imgs = crawl(depth=2)
    print(f"Найдено изображений: {len(imgs)}")

    # Download all
    saved = []
    for i, url in enumerate(imgs, 1):
        r = fetch(url)
        if not r:
            continue
        name = safe_name(url, r.headers.get("content-type",""))
        path = os.path.join(OUT_DIR, name)
        if os.path.exists(path):
            continue
        save_file(name, r.content)
        saved.append((url, name))
        if i % 25 == 0:
            print(f"  скачано {i}/{len(imgs)}")
        time.sleep(0.05)

    # Try to pick a few "best" images by filename heuristics
    # (You can manually rename after.)
    # We'll just take first JPEGs found and map them to template names if missing.
    existing = set(os.listdir(OUT_DIR))
    jpgs = [n for n in existing if n.lower().endswith((".jpg",".jpeg",".png",".webp",".gif"))]
    jpgs.sort()

    def ensure(alias, target):
        if target in existing:
            return
        if not jpgs:
            return
        src = os.path.join(OUT_DIR, jpgs[0])
        dst = os.path.join(OUT_DIR, target)
        try:
            import shutil
            shutil.copyfile(src, dst)
            print(f"Назначил {target} <- {jpgs[0]}")
        except Exception:
            pass

    for alias, target in WANTED.items():
        ensure(alias, target)

    # create empty gallery placeholders if not present
    for k in range(1,7):
        tgt = f"g{k}.jpg"
        if tgt not in existing:
            # reuse any image
            if jpgs:
                import shutil
                shutil.copyfile(os.path.join(OUT_DIR, jpgs[min(k-1, len(jpgs)-1)]), os.path.join(OUT_DIR, tgt))

    print("Готово. Изображения лежат в assets/img/old/")
    print("Откройте index.html через локальный сервер — картинки подхватятся автоматически.")

if __name__ == "__main__":
    main()
