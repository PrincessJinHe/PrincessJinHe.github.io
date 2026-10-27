# -*- coding: utf-8 -*-
"""
生成文件清单 filelist.json，供 browse.html 在 GitHub Pages 等无目录列表的
静态托管环境下使用。
用法：在根目录（含压缩包和文件夹的目录）执行：
    python make_manifest.py
每次增删文件后重新运行一次，然后把 filelist.json 一起 commit/push 即可。
"""
import json
import os
import sys

SKIP_NAMES = {"filelist.json", "browse.html", "index.html",
              "make_manifest.py", "fix_big_jpg.py", "listing_server.py",
              ".git", ".github", ".gitattributes", ".gitignore", "README.md"}
ZIP_RE = (".zip", ".rar", ".7z", ".tar", ".gz", ".tgz")


def scan(path):
    node = {"dirs": {}, "files": []}
    try:
        entries = sorted(os.listdir(path))
    except OSError:
        return node
    for name in entries:
        if name in SKIP_NAMES or name.endswith(".bak"):
            continue
        full = os.path.join(path, name)
        if os.path.isdir(full):
            node["dirs"][name] = scan(full)
        else:
            node["files"].append(name)
    return node


if __name__ == "__main__":
    root = os.getcwd()
    tree = scan(root)
    out = os.path.join(root, "filelist.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, separators=(",", ":"))
    n_files = json.dumps(tree).count(".")
    print("已生成 %s" % out)
    print("顶层：%d 个文件夹，%d 个文件" % (len(tree["dirs"]), len(tree["files"])))
    try:
        input("按回车退出...")
    except EOFError:
        pass
