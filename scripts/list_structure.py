import os

root = r"C:\Users\vecch\OneDrive\Escritorio\Dashboard Sharkfit 30 enero - Copy-export (1)"

ignore = {".git", "node_modules"}

entries = sorted(os.listdir(root))
for name in entries:
    if name in ignore:
        continue
    path = os.path.join(root, name)
    if os.path.isdir(path):
        print(f"DIR: {name}")
        try:
            subs = sorted(os.listdir(path))
        except Exception:
            continue
        for sub in subs:
            if sub in ignore:
                continue
            print(f"  - {sub}")
    else:
        print(f"FILE: {name}")
