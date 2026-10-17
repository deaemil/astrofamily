"""Download pinned official Swiss Ephemeris data with HTTPS and SHA-256 verification."""
from pathlib import Path
import hashlib
import json
import httpx

project = Path(__file__).resolve().parents[1]
root = project / 'server' / 'ephe'
root.mkdir(parents=True, exist_ok=True)
manifest = json.loads((project / 'server' / 'ephemeris-manifest.json').read_text())
with httpx.Client(timeout=120, follow_redirects=True) as client:
    for name, expected in manifest['sha256'].items():
        path = root / name
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == expected:
            print(name + ': verified cached file')
            continue
        r = client.get(f"https://raw.githubusercontent.com/aloistr/swisseph/{manifest['commit']}/ephe/{name}")
        r.raise_for_status()
        if hashlib.sha256(r.content).hexdigest() != expected:
            raise RuntimeError('Ephemeris checksum mismatch: ' + name)
        temporary = path.with_suffix('.download')
        temporary.write_bytes(r.content)
        temporary.replace(path)
        print(name + ': downloaded and SHA-256 verified')
