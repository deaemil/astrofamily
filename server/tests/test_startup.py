"""Exercise the real two-service launcher in a POSIX shell, without Bash wait -n."""
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import time

import httpx
import pytest

ROOT=Path(__file__).resolve().parents[2]

def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        return sock.getsockname()[1]

def listening(port):
    with socket.socket() as sock:
        sock.settimeout(.2)
        return sock.connect_ex(('127.0.0.1',port))==0

@pytest.mark.parametrize('shell',['sh','bash'])
def test_portable_launcher_starts_both_services_and_cleans_up(shell,tmp_path):
    api,web=free_port(),free_port()
    env=dict(os.environ,ASTRO_API_PORT=str(api),ASTRO_WEB_PORT=str(web))
    with (tmp_path/'startup.log').open('w+') as log:
        process=subprocess.Popen([shutil.which(shell),'scripts/dev.sh'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
        try:
            deadline=time.monotonic()+25
            with httpx.Client(trust_env=False,timeout=1) as client:
                while time.monotonic()<deadline:
                    assert process.poll() is None,'The launcher exited before readiness'
                    try:
                        r=client.get(f'http://127.0.0.1:{web}/api/places',params={'q':'София'})
                        if r.status_code==200:
                            assert r.json()['places'][0]['timezone']=='Europe/Sofia'
                            break
                    except (httpx.HTTPError,ValueError):
                        pass
                    time.sleep(.2)
                else:
                    pytest.fail('Both services did not become ready')
        finally:
            if process.poll() is None:
                process.send_signal(signal.SIGTERM)
            process.wait(timeout=10)
            log.seek(0)
            output=log.read()
        assert 'invalid option' not in output,output
        assert not listening(api),'API process was left running'
        assert not listening(web),'Frontend process was left running'

def test_occupied_api_port_does_not_leave_frontend_running(tmp_path):
    web=free_port()
    with socket.socket() as occupied, (tmp_path/'failed-start.log').open('w+') as log:
        occupied.bind(('127.0.0.1',0))
        api=occupied.getsockname()[1]
        process=subprocess.Popen(['sh','scripts/dev.sh'],cwd=ROOT,
            env=dict(os.environ,ASTRO_API_PORT=str(api),ASTRO_WEB_PORT=str(web)),stdout=log,stderr=subprocess.STDOUT)
        try:
            assert process.wait(timeout=25)!=0
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
        log.seek(0)
        assert 'Сървърът не стартира' in log.read()
        assert not listening(web)
