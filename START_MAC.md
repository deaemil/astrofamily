# Стартиране на Астро Атлас на macOS

1. Разархивирайте проекта. Отворете Terminal.
2. Необходими са Node.js 22.12+ и Python 3.12. Ако ползвате Homebrew:

   brew install node python@3.12

   Ако нямате Homebrew, официалният сайт е https://brew.sh.
   При липсващи инструменти за компилиране изпълнете:

   xcode-select --install

   Изчакайте инсталирането им, преди да продължите.

3. Отворете папката на проекта в Terminal. Ако архивът е разархивиран в Downloads:

   cd ~/Downloads/astro-atlas
   python3.12 -m venv .venv
   .venv/bin/python -m pip install -r server/requirements.lock
   npm ci
   .venv/bin/python scripts/ephemeris.py
   npm run dev

4. Оставете Terminal отворен и въведете http://localhost:5173 в браузъра на този Mac.
   За спиране натиснете Control+C в Terminal.

Използвайте тези команди за macOS. scripts/install.sh е настроен за cloud средата с кешове в /workspace.
Локалният режим работи без Supabase. Данните се пазят в използвания браузър.
За облачен вход и база вижте README.md.
