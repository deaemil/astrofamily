"""Астро Атлас — geocentric tropical Swiss Ephemeris calculations (AGPL)."""
import math
import os
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal

import httpx
import geonamescache
import pytz
import swisseph as swe
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from timezonefinder import TimezoneFinder

load_dotenv()
app = FastAPI(title="Астро Атлас", docs_url=None, redoc_url=None)
EPHE_PATH = Path(os.getenv("EPHE_PATH", str(Path(__file__).parent / "ephe")))
swe.set_ephe_path(str(EPHE_PATH))
lock = threading.RLock()  # Swiss Ephemeris has process-wide state.
tzf = TimezoneFinder(in_memory=True)
geo_cities = list(geonamescache.GeonamesCache().get_cities().values())
geo_index = [(c, [c['name'].casefold(), *[n.casefold() for n in c.get('alternatenames', [])]]) for c in geo_cities]

class Birth(BaseModel):
    date: date
    time: str = "12:00"
    accuracy: Literal["exact", "approximate", "unknown"] = "exact"
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    timezone: str = ""
    offset: int | None = Field(default=None, ge=-840, le=840)

class Options(BaseModel):
    houses: Literal["P", "W", "E"] = "P"
    node: Literal["true", "mean"] = "true"

class Calculate(BaseModel):
    birth: Birth
    settings: Options = Options()

CITIES = [
    ("София", "България", 42.6977, 23.3219, "Europe/Sofia"),
    ("Пловдив", "България", 42.1354, 24.7453, "Europe/Sofia"),
    ("Варна", "България", 43.2141, 27.9147, "Europe/Sofia"),
    ("Бургас", "България", 42.5048, 27.4626, "Europe/Sofia"),
    ("Русе", "България", 43.8356, 25.9657, "Europe/Sofia"),
    ("Стара Загора", "България", 42.4258, 25.6345, "Europe/Sofia"),
    ("Плевен", "България", 43.417, 24.6067, "Europe/Sofia"),
    ("Велико Търново", "България", 43.0757, 25.6172, "Europe/Sofia"),
    ("Благоевград", "България", 42.0209, 23.0943, "Europe/Sofia"),
    ("Добрич", "България", 43.5726, 27.8273, "Europe/Sofia"),
    ("Шумен", "България", 43.2712, 26.9361, "Europe/Sofia"),
    ("Сливен", "България", 42.6858, 26.3292, "Europe/Sofia"),
    ("Хасково", "България", 41.9344, 25.5554, "Europe/Sofia"),
    ("Смолян", "България", 41.5774, 24.7011, "Europe/Sofia"),
    ("Габрово", "България", 42.8747, 25.3342, "Europe/Sofia"),
    ("Кърджали", "България", 41.65, 25.3667, "Europe/Sofia"),
    ("Перник", "България", 42.6052, 23.0378, "Europe/Sofia"),
    ("Лондон", "Великобритания", 51.5074, -0.1278, "Europe/London"),
    ("Париж", "Франция", 48.8566, 2.3522, "Europe/Paris"),
    ("Берлин", "Германия", 52.52, 13.405, "Europe/Berlin"),
    ("Виена", "Австрия", 48.2082, 16.3738, "Europe/Vienna"),
    ("Ню Йорк", "САЩ", 40.7128, -74.006, "America/New_York"),
]

@app.get("/api/health")
def health():
    return {"ok": True, "engine": "Swiss Ephemeris " + swe.version,
            "ephemerisFiles": [p.name for p in EPHE_PATH.glob("*.se1")],
            "supabase": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))}

@app.get("/api/config")
def config():
    # Publishable key only. Never expose service_role or calculation API credentials.
    key = os.getenv("SUPABASE_ANON_KEY", "")
    import base64, json
    try:
        role = json.loads(base64.urlsafe_b64decode(key.split('.')[1] + '==')).get('role')
        if role == "service_role":
            key = ""
    except (ValueError, IndexError):
        if key.startswith("sb_secret_"):
            key = ""
    return {"supabaseUrl": os.getenv("SUPABASE_URL", ""), "supabaseKey": key}

@app.get("/api/places")
def places(q: str = ""):
    q = q.strip()[:100]
    if len(q) < 2:
        return {"places": [], "warning": None}
    local = [{"name": n, "country": c, "lat": la, "lon": lo, "timezone": tz}
             for n,c,la,lo,tz in CITIES if q.casefold() in n.casefold()]
    if local:
        return {"places": local, "warning": None}
    matches = [(c, names) for c, names in geo_index if any(q.casefold() in n for n in names)]
    if matches:
        matches.sort(key=lambda item: (not any(q.casefold() == n for n in item[1]), not any(n.startswith(q.casefold()) for n in item[1]), -item[0].get('population', 0)))
        return {"places": [{"name": next((n for n in c.get('alternatenames', []) if n.casefold()==q.casefold()), c['name']),
                           "country": c['countrycode'], "countryCode": c['countrycode'],
                           "lat": c['latitude'], "lon": c['longitude'], "timezone": c['timezone']}
                          for c, _ in matches[:8]], "warning": None}
    try:
        r = httpx.get("https://geocoding-api.open-meteo.com/v1/search",
                      params={"name": q, "count": 8, "language": "bg", "format": "json"}, timeout=8)
        r.raise_for_status()
        rows = [{"name": x["name"], "country": x.get("country", ""), "lat": x["latitude"],
                 "lon": x["longitude"], "timezone": x.get("timezone", "")}
                for x in r.json().get("results", [])]
        return {"places": rows, "warning": None}
    except (httpx.HTTPError, ValueError, KeyError):
        return {"places": [], "warning": "Онлайн търсенето е недостъпно. Въведете координати и IANA часова зона ръчно или изберете български град."}

@app.get("/api/timezone")
def timezone(lat: float, lon: float):
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise HTTPException(422, "Невалидни координати.")
    return {"timezone": tzf.timezone_at(lat=lat, lng=lon)}


def local_instant(b: Birth, when: datetime | None = None):
    try:
        clock = "12:00" if b.accuracy == "unknown" else b.time
        naive = when or datetime.fromisoformat(f"{b.date.isoformat()}T{clock}")
        zone_name = b.timezone.strip() or tzf.timezone_at(lat=b.lat, lng=b.lon)
        if not zone_name:
            raise ValueError("Не е определена часова зона. Въведете IANA зона ръчно.")
        zone = pytz.timezone(zone_name)
        if b.offset is not None:
            local = pytz.FixedOffset(b.offset).localize(naive)
        else:
            local = zone.localize(naive, is_dst=None)
        return local, zone_name
    except pytz.AmbiguousTimeError:
        raise HTTPException(422, "Часът се среща два пъти при връщане към зимно време. Задайте ръчно UTC отместване в минути, за да изберете точния момент.")
    except pytz.NonExistentTimeError:
        raise HTTPException(422, "Този местен час не съществува поради преминаване към лятно време. Проверете рождения час или задайте проверено UTC отместване.")
    except (ValueError, pytz.UnknownTimeZoneError):
        raise HTTPException(422, "Невалидни дата, час или IANA часова зона (например Europe/Sofia).")


def day_boundary(b: Birth, day: datetime):
    """Earliest real instant at a calendar boundary, including midnight DST gaps."""
    if b.offset is not None:
        return pytz.FixedOffset(b.offset).localize(day)
    name = b.timezone.strip() or tzf.timezone_at(lat=b.lat, lng=b.lon)
    zone = pytz.timezone(name)
    try:
        return zone.localize(day, is_dst=None)
    except pytz.AmbiguousTimeError:
        return min(zone.localize(day, is_dst=True), zone.localize(day, is_dst=False))
    except pytz.NonExistentTimeError:
        return zone.normalize(zone.localize(day, is_dst=False))


def julian(instant):
    u = instant.astimezone(pytz.UTC)
    return swe.julday(u.year, u.month, u.day, u.hour + u.minute/60 + u.second/3600)


def house_of(lon, cusps):
    for i, start in enumerate(cusps):
        span = (cusps[(i+1) % 12] - start) % 360
        if (lon - start) % 360 < span:
            return i+1
    return None

@app.post("/api/calculate")
def calculate(req: Calculate):
    with lock:
        return calculate_locked(req)


def calculate_locked(req):
    # The library keeps thread-local state; configure the actual FastAPI worker.
    swe.set_ephe_path(str(EPHE_PATH))
    b, opt = req.birth, req.settings
    if not 1600 <= b.date.year <= 2399:
        raise HTTPException(422, "Поддържат се рождени дати от 1600 до 2399 г.")
    instant, zone = local_instant(b)
    jd = julian(instant)
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    warnings, positions, engines = [], [], set()
    cusps, angles = [], ()
    if b.accuracy != "unknown":
        try:
            cusps, angles = swe.houses_ex(jd, b.lat, b.lon, opt.houses.encode())
            cusps = list(cusps)
        except swe.Error:
            raise HTTPException(422, "Placidus не може да се изчисли на тази географска ширина. Изберете Whole Sign или Equal House; системата няма да бъде сменена автоматично.")
    else:
        warnings.append("Часът е неизвестен. Планетите са условни за 12:00 местно време; домове, ъгли, Вертекс и Фортуна не се изчисляват. Условните позиции са изключени от сравненията по подразбиране.")
    if b.accuracy == "approximate":
        warnings.append("Часът е приблизителен. Позициите, ъглите и домовете са приблизителни.")
    bodies = [("sun", swe.SUN), ("moon", swe.MOON), ("mercury", swe.MERCURY),
              ("venus", swe.VENUS), ("mars", swe.MARS), ("jupiter", swe.JUPITER),
              ("saturn", swe.SATURN), ("uranus", swe.URANUS), ("neptune", swe.NEPTUNE),
              ("pluto", swe.PLUTO), ("chiron", swe.CHIRON), ("lilith", swe.MEAN_APOG),
              ("northNode", swe.TRUE_NODE if opt.node == "true" else swe.MEAN_NODE)]
    for key, body in bodies:
        try:
            xx, ret = swe.calc_ut(jd, body, flags)
            engines.add("Swiss Ephemeris" if ret & swe.FLG_SWIEPH else "Moshier (Swiss Ephemeris)")
            positions.append({"point": key, "longitude": xx[0], "retro": xx[3] < 0,
                              "house": house_of(xx[0], cusps) if cusps else None,
                              "status": "confirmed", "approximate": b.accuracy != "exact",
                              "conditional": b.accuracy == "unknown", "source": "calculated"})
        except swe.Error:
            positions.append({"point": key, "longitude": None, "reason": "Не е налична: нужен е съответният ефемериден файл за избраната дата."})
    north = next(p for p in positions if p['point'] == 'northNode')
    if north['longitude'] is not None:
        south = dict(north, point="southNode", longitude=(north['longitude']+180)%360)
        south['house'] = house_of(south['longitude'], cusps) if cusps else None
        positions.append(south)
    if angles:
        for key, lon in [("asc",angles[0]),("dsc",(angles[0]+180)%360),("mc",angles[1]),
                         ("ic",(angles[1]+180)%360),("vertex",angles[3])]:
            positions.append({"point":key,"longitude":lon,"retro":None,"house":house_of(lon,cusps),
                              "status":"confirmed","approximate":b.accuracy!="exact","source":"calculated"})
        sun = next(p['longitude'] for p in positions if p['point']=='sun')
        moon = next(p['longitude'] for p in positions if p['point']=='moon')
        equ, _ = swe.calc_ut(jd, swe.SUN, flags | swe.FLG_EQUATORIAL)
        altitude = swe.azalt(jd, swe.EQU2HOR, (b.lon, b.lat, 0), 0, 15, equ[:3])[1]
        fortune = (angles[0] + (moon-sun if altitude >= 0 else sun-moon)) % 360
        positions.append({"point":"fortune","longitude":fortune,"retro":None,"house":house_of(fortune,cusps),
                          "status":"confirmed","approximate":b.accuracy!="exact","source":"calculated"})
    moon_range = None
    if b.accuracy == "unknown":
        day = datetime.combine(b.date, datetime.min.time())
        start = julian(day_boundary(b, day))
        end = julian(day_boundary(b, day+timedelta(days=1)))
        moon_range = [swe.calc_ut(t,swe.MOON,flags)[0][0] for t in (start,end)]
    if any("Moshier" in e for e in engines):
        warnings.append("За част от позициите е използван аналитичният модул Moshier на Swiss Ephemeris, защото няма ефемериден файл за датата. Източникът е посочен в картата; Хирон без файл не се изчислява.")
    return {"positions":positions,"cusps":cusps,"settings":opt.model_dump(),
            "timezone":zone,"utc":instant.astimezone(pytz.UTC).isoformat(),
            "utcOffset":instant.utcoffset().total_seconds()/60,"julianDay":jd,
            "moonRange":moon_range,"warnings":warnings,"engine":" + ".join(sorted(engines)),
            "lilithType":"Среден лунен апогей (Mean Lilith)",
            "zodiac":"Тропически","center":"Геоцентрични позиции"}

DIST = Path(__file__).resolve().parents[1] / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    @app.get("/{path:path}")
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Няма такъв адрес.")
        candidate = (DIST / path).resolve()
        if candidate.is_relative_to(DIST) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
