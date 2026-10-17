from fastapi.testclient import TestClient
import pytest
from server.main import app

client = TestClient(app)
def payload(**birth):
    b = dict(date='1990-07-15', time='10:30', accuracy='exact', lat=42.6977, lon=23.3219, timezone='Europe/Sofia', offset=None)
    b.update(birth)
    return dict(birth=b, settings=dict(houses='P',node='true'))

def test_real_planets_and_points():
    r=client.post('/api/calculate',json=payload())
    assert r.status_code==200,r.text
    c=r.json()
    assert len(c['positions'])==20
    sun=next(p for p in c['positions'] if p['point']=='sun')
    assert 111<sun['longitude']<114  # Cancer, mid-July 1990.
    assert len(c['cusps'])==12
    assert c['engine']=='Swiss Ephemeris'
    assert next(p for p in c['positions'] if p['point']=='chiron')['longitude'] is not None
    assert c['utc']=='1990-07-15T07:30:00+00:00'

def test_historical_dst_not_current_offset():
    assert client.post('/api/calculate',json=payload(date='1990-07-15')).json()['utcOffset']==180
    assert client.post('/api/calculate',json=payload(date='1990-01-15')).json()['utcOffset']==120
    assert client.post('/api/calculate',json=payload(date='1970-07-15')).json()['utcOffset']==120  # No Bulgarian DST in 1970.

def test_unknown_time_excludes_angles_houses_and_gives_moon_interval():
    c=client.post('/api/calculate',json=payload(accuracy='unknown',time='')).json()
    assert c['cusps']==[]
    assert not any(p['point']=='asc' for p in c['positions'])
    assert all(p.get('house') is None for p in c['positions'])
    assert all(p.get('conditional') for p in c['positions'] if p['longitude'] is not None)
    assert c['moonRange'] and len(c['moonRange'])==2
    assert c['utc']=='1990-07-15T09:00:00+00:00'

def test_approximate_markers():
    c=client.post('/api/calculate',json=payload(accuracy='approximate')).json()
    assert all(p.get('approximate') for p in c['positions'] if p['longitude'] is not None)

def test_ambiguous_time_requires_resolution():
    r=client.post('/api/calculate',json=payload(date='2020-10-25',time='03:30'))
    assert r.status_code==422
    assert 'два пъти' in r.json()['detail']
    early=client.post('/api/calculate',json=payload(date='2020-10-25',time='03:30',offset=180)).json()
    late=client.post('/api/calculate',json=payload(date='2020-10-25',time='03:30',offset=120)).json()
    assert early['utc']!=late['utc']

def test_nonexistent_time():
    r=client.post('/api/calculate',json=payload(date='2020-03-29',time='03:30'))
    assert r.status_code==422 and 'не съществува' in r.json()['detail']

@pytest.mark.parametrize('system',['P','W','E'])
def test_house_systems(system):
    p=payload();p['settings']['houses']=system
    c=client.post('/api/calculate',json=p).json()
    assert len(c['cusps'])==12 and c['settings']['houses']==system

def test_polar_placidus_does_not_silently_fallback():
    p=payload(lat=78,lon=15,timezone='Arctic/Longyearbyen')
    assert client.post('/api/calculate',json=p).status_code==422
    p['settings']['houses']='W'
    assert client.post('/api/calculate',json=p).status_code==200

def test_birth_and_node_change_recalculate():
    p=payload();c1=client.post('/api/calculate',json=p).json()
    p['birth']['time']='14:30';p['settings']['node']='mean'
    c2=client.post('/api/calculate',json=p).json()
    assert c1['cusps']!=c2['cusps']
    assert next(p['longitude'] for p in c1['positions'] if p['point']=='northNode')!=next(p['longitude'] for p in c2['positions'] if p['point']=='northNode')

def test_coordinate_timezone_lookup():
    assert client.get('/api/timezone?lat=42.6977&lon=23.3219').json()['timezone']=='Europe/Sofia'
    assert client.get('/api/timezone?lat=100&lon=23').status_code==422

def test_config_is_public_only(monkeypatch):
    monkeypatch.setenv('SUPABASE_ANON_KEY','sb_secret_do_not_expose')
    assert client.get('/api/config').json()['supabaseKey']==''

def test_invalid_birth_is_rejected():
    assert client.post('/api/calculate',json=payload(date='1900-02-30')).status_code==422
    assert client.post('/api/calculate',json=payload(lat=91)).status_code==422
    assert client.post('/api/calculate',json=payload(timezone='Made/Up')).status_code==422

def test_offline_international_places():
    r=client.get('/api/places?q=Tokyo').json()
    assert not r['warning']
    assert any(p['timezone']=='Asia/Tokyo' for p in r['places'])
    r=client.get('/api/places?q=София').json()
    assert r['places'][0]['timezone']=='Europe/Sofia'

def test_unknown_time_on_midnight_dst_transition():
    r=client.post('/api/calculate',json=payload(date='2018-11-04',accuracy='unknown',lat=-23.55,lon=-46.63,timezone='America/Sao_Paulo'))
    assert r.status_code==200,r.text
    assert len(r.json()['moonRange'])==2
