import os
import re

def find_hardcoded(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".tsx"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                # Look for JSX text (heuristically)
                # match stuff between > and < that has letters and not just whitespace
                matches = re.findall(r'>([^<>{}]*[a-zA-ZàâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ][^<>{}]*)<', content)
                # clean up
                matches = [m.strip() for m in matches if m.strip() and not m.strip().startswith('t(')]
                
                if matches:
                    print(f"--- {path} ---")
                    for m in set(matches):
                        print(f"  {m}")

find_hardcoded("app/[locale]")
find_hardcoded("components")
