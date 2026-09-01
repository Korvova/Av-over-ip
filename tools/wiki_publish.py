# -*- coding: utf-8 -*-
"""Публикация документации проекта в Яндекс Вики.

Страницы лежат в папке wiki/ рядом с репозиторием: имя файла = адрес страницы,
index.md — родительская страница эпика.

Запуск:
    WIKI_TOKEN=<токен> python tools/wiki_publish.py            все страницы
    WIKI_TOKEN=<токен> python tools/wiki_publish.py t-enkodery только эту

Токен в репозиторий не коммитим — берём из переменной окружения WIKI_TOKEN.
Получить новый: https://oauth.yandex.ru/authorize?response_type=token&client_id=22fcafe69ac24efe82098b7d8d5d869d
"""
import json
import os
import sys
import urllib.request
import urllib.error

BASE = "https://api.wiki.yandex.net/v1"
ORG = "d0d0f076-05d6-4525-84fd-206271e76feb"
ROOT = "homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip"

# заголовки страниц: имя файла -> заголовок в вики
TITLES = {
    "index": "✅Платформа управления AV-over-IP.",
    "t-obshhie": "Т. Общие требования",
    "t-pervyj-zapusk": "Т. Первый запуск",
    "t-elementy-sistemy": "Т. Элементы системы",
    "t-enkodery": "Т. Энкодеры",
    "t-dekodery": "Т. Декодеры",
    "t-kommutaciya": "Т. Коммутация",
    "t-videostena": "Т. Видеостена",
    "t-interfejs-polzovatelya": "Т. Интерфейс пользователя",
    "t-polzovateli": "Т. Пользователи",
    "t-nastrojka-platformy": "Т. Настройка платформы",
    "arxitektura": "Архитектура и стек",
    "razvertyvanie": "Развёртывание и эксплуатация",
    "protokol-hdn-ea900": "Протокол HDN-EA900 (ASPEED)",
    "beinghd": "BeingHD: анализ API",
}

TOKEN = os.environ.get("WIKI_TOKEN", "")
if not TOKEN:
    sys.exit("Не задана переменная окружения WIKI_TOKEN")

HEADERS = {
    "Authorization": "OAuth " + TOKEN,
    "X-Collab-Org-Id": ORG,
    "Content-Type": "application/json",
}


def request(method, path, payload=None):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload else None
    req = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def publish(name, text):
    slug = ROOT if name == "index" else "%s/%s" % (ROOT, name)
    title = TITLES.get(name, name)
    # страница есть — обновляем по её id, нет — создаём
    code, page = request("GET", "/pages?slug=%s" % slug)
    if code == 200 and isinstance(page, dict) and page.get("id"):
        code, res = request("POST", "/pages/%d" % page["id"],
                            {"title": title, "content": text})
        action = "обновлена"
    else:
        code, res = request("POST", "/pages",
                            {"slug": slug, "title": title, "content": text})
        action = "создана"
    ok = code in (200, 201)
    print("%-28s %s  %s" % (name, "OK " if ok else "ОШИБКА %s" % code, action if ok else res))
    return ok


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    wiki_dir = os.path.join(os.path.dirname(here), "wiki")
    only = sys.argv[1:] 
    names = [n[:-3] for n in sorted(os.listdir(wiki_dir)) if n.endswith(".md")]
    # index первым: он задаёт родителя для остальных
    names.sort(key=lambda n: (n != "index", n))
    failed = 0
    for name in names:
        if only and name not in only:
            continue
        with open(os.path.join(wiki_dir, name + ".md"), encoding="utf-8") as f:
            if not publish(name, f.read()):
                failed += 1
    print("Готово." if not failed else "Ошибок: %d" % failed)


if __name__ == "__main__":
    main()
