"""Do not open the frontend before its own calculation API is ready."""
import json
import os
import sys
import time
import urllib.error
import urllib.request

port, pid = int(sys.argv[1]), int(sys.argv[2])
deadline = time.monotonic() + 20
while time.monotonic() < deadline:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        sys.exit(1)
    try:
        # Loopback should never go through an outbound HTTPS proxy.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f'http://127.0.0.1:{port}/api/health', timeout=1) as response:
            data = json.load(response)
            if data.get('ok') and str(data.get('engine', '')).startswith('Swiss Ephemeris'):
                print('Изчислителният сървър е готов.', flush=True)
                sys.exit(0)
    except (urllib.error.URLError, OSError, ValueError):
        pass
    time.sleep(0.2)
print('Няма връзка с изчислителния сървър след 20 секунди.', file=sys.stderr)
sys.exit(1)
