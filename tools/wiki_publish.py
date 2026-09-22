# -*- coding: utf-8 -*-
"""Публикация документации проекта в Яндекс Вики.

Страницы лежат в папке wiki/ рядом с репозиторием: имя файла = адрес страницы,
index.md — родительская страница эпика. Картинки и файлы — в wiki/files/, в тексте
на них ссылаются как `![подпись](files/имя.png =420x0)`: скрипт сам загружает файл
вложением к странице (один раз, по имени) и подставляет адрес вложения.

Запуск:
    WIKI_TOKEN=<токен> python tools/wiki_publish.py            все страницы
    WIKI_TOKEN=<токен> python tools/wiki_publish.py t-enkodery только эту

Токен в репозиторий не коммитим — берём из переменной окружения WIKI_TOKEN.
Получить новый: https://oauth.yandex.ru/authorize?response_type=token&client_id=22fcafe69ac24efe82098b7d8d5d869d
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

BASE = "https://api.wiki.yandex.net/v1"
ORG = "d0d0f076-05d6-4525-84fd-206271e76feb"
ROOT = "homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip"

# заголовки страниц: имя файла -> заголовок в вики
# Стандарт: https://wiki.yandex.ru/homepage/servisy/api/kultura-vedenija-proektov/
# эпик — «Эпик. <Название>», требования — «Т. <Раздел>»; статус — эмодзи в начале без пробела:
# ✅ готово · 🔜 почти готово · ⌛ в работе · ❓ есть вопросы · 🚀 текущее (только одно на вики)
# 🥶 заморожено · 💤 спит · 🆘 завис на сложной задаче · 🤬 не работает · ⟳ смена концепции
TITLES = {
    "index": "✅Эпик. Платформа управления AV-over-IP",
    "t-obshhie": "⌛Т. Общие требования",
    "t-pervyj-zapusk": "🔜Т. Первый запуск",
    "t-elementy-sistemy": "✅Т. Элементы системы",
    "t-enkodery": "⌛Т. Энкодеры",
    "t-dekodery": "⌛Т. Декодеры",
    "t-kommutaciya": "✅Т. Коммутация",
    "t-videostena": "✅Т. Видеостена",
    "t-interfejs-polzovatelya": "🔜Т. Интерфейс пользователя",
    "t-polzovateli": "✅Т. Пользователи",
    "t-nastrojka-platformy": "⌛Т. Настройка платформы",
    "arxitektura": "✅Архитектура и стек",
    "razvertyvanie": "✅Развёртывание и эксплуатация",
    "protokol-hdn-ea900": "✅Протокол HDN-EA900 (ASPEED)",
    "beinghd": "❓BeingHD: анализ API",
}

TOKEN = os.environ.get("WIKI_TOKEN", "")
if not TOKEN:
    sys.exit("Не задана переменная окружения WIKI_TOKEN")

HEADERS = {
    "Authorization": "OAuth " + TOKEN,
    "X-Collab-Org-Id": ORG,
}

HERE = os.path.dirname(os.path.abspath(__file__))
WIKI_DIR = os.path.join(os.path.dirname(HERE), "wiki")
FILES_DIR = os.path.join(WIKI_DIR, "files")


def request(method, path, payload=None, raw=None, content_type="application/json"):
    if raw is not None:
        data = raw
    else:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = dict(HEADERS)
    if data is not None:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def page_id(slug, title):
    """id страницы; если её нет — создаём пустую (адрес задаёт родителя)"""
    code, page = request("GET", "/pages?slug=%s" % slug)
    if code == 200 and isinstance(page, dict) and page.get("id"):
        return page["id"], False
    code, res = request("POST", "/pages", {"slug": slug, "title": title, "content": ""})
    if code not in (200, 201):
        raise RuntimeError("не удалось создать %s: %s %s" % (slug, code, res))
    return res["id"], True


def attachments(pid):
    """имя вложения -> адрес (уже загруженные к странице файлы)"""
    code, res = request("GET", "/pages/%d/attachments" % pid)
    out = {}
    if code == 200:
        for a in res.get("results", []):
            out.setdefault(a["name"], a["download_url"])
    return out


def upload(pid, name):
    """Загрузить wiki/files/<name> вложением к странице: сессия → байты → finish → attach"""
    path = os.path.join(FILES_DIR, name)
    with open(path, "rb") as f:
        data = f.read()
    code, s = request("POST", "/upload_sessions", {"file_name": name, "file_size": len(data)})
    if code != 200:
        raise RuntimeError("upload_sessions: %s %s" % (code, s))
    sid = s["session_id"]
    code, r = request("PUT", "/upload_sessions/%s/upload_part?part_number=1" % sid,
                      raw=data, content_type="application/octet-stream")
    if code != 200:
        raise RuntimeError("upload_part: %s %s" % (code, r))
    code, r = request("POST", "/upload_sessions/%s/finish" % sid, raw=b"")
    if code != 200:
        raise RuntimeError("finish: %s %s" % (code, r))
    code, r = request("POST", "/pages/%d/attachments" % pid, {"upload_sessions": [sid]})
    if code != 200:
        raise RuntimeError("attach: %s %s" % (code, r))
    return r["results"][0]["download_url"]


def resolve_files(pid, text):
    """`](files/имя)` -> адрес вложения; недостающие файлы загружаются"""
    names = sorted(set(re.findall(r"\]\(files/([^\s)]+)", text)))
    if not names:
        return text, 0
    have = attachments(pid)
    uploaded = 0
    for name in names:
        if name not in have:
            have[name] = upload(pid, name)
            uploaded += 1
        text = text.replace("](files/%s" % name, "](%s" % have[name])
    return text, uploaded


def publish(name, text):
    slug = ROOT if name == "index" else "%s/%s" % (ROOT, name)
    title = TITLES.get(name, name)
    try:
        pid, created = page_id(slug, title)
        text, uploaded = resolve_files(pid, text)
        code, res = request("POST", "/pages/%d" % pid, {"title": title, "content": text})
    except RuntimeError as e:
        print("%-28s ОШИБКА %s" % (name, e))
        return False
    ok = code in (200, 201)
    note = ("создана" if created else "обновлена") + (", файлов загружено: %d" % uploaded if uploaded else "")
    print("%-28s %s  %s" % (name, "OK " if ok else "ОШИБКА %s" % code, note if ok else res))
    return ok


def main():
    only = sys.argv[1:]
    names = [n[:-3] for n in sorted(os.listdir(WIKI_DIR)) if n.endswith(".md")]
    # index первым: он задаёт родителя для остальных
    names.sort(key=lambda n: (n != "index", n))
    failed = 0
    for name in names:
        if only and name not in only:
            continue
        with open(os.path.join(WIKI_DIR, name + ".md"), encoding="utf-8") as f:
            if not publish(name, f.read()):
                failed += 1
    print("Готово." if not failed else "Ошибок: %d" % failed)


if __name__ == "__main__":
    main()
