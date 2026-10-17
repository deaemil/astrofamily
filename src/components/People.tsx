import { useState } from "react";
import {
  Plus,
  Search,
  Users,
  Orbit,
  Network,
  LayoutGrid,
  List,
  ArrowUpRight,
  Upload,
  ChevronDown,
  ShieldCheck,
  Star,
} from "lucide-react";
import { PageHeading, Empty, StepCard } from "./ui";
import { CelestialArt } from "./Wheel";
import { formatPosition, positions, usable } from "../astro";
import { pointGlyph, type Person } from "../types";
export default function People({
  people,
  onAdd,
  onOpen,
  onImport,
  onCompare,
  onRepeats,
}: {
  people: Person[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onImport: () => void;
  onCompare: () => void;
  onRepeats: () => void;
}) {
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState(""),
    [relation, setRelation] = useState(""),
    [view, setView] = useState("grid");
  const filtered = people.filter(
    (p) =>
      p.name.toLocaleLowerCase("bg").includes(search.toLocaleLowerCase("bg")) &&
      (!group || p.group === group) &&
      (!relation || p.relationship === relation),
  );
  const groups = [...new Set(people.map((p) => p.group).filter(Boolean))];
  const relations = [
    ...new Set(people.map((p) => p.relationship).filter(Boolean)),
  ];
  return (
    <>
      <PageHeading
        eyebrow="ВАШЕТО ЛИЧНО СЪЗВЕЗДИЕ"
        title="Вашите хора"
        description="Открийте звездните връзки между хората, които обичате."
        actions={
          <>
            <button className="button secondary" onClick={onImport}>
              <Upload size={16} /> Импорт
            </button>
            <button className="button primary" onClick={onAdd}>
              <Plus size={18} /> Добави човек
            </button>
          </>
        }
      />
      <section className="welcome-banner">
        <div className="banner-copy">
          <div className="banner-label">
            <span /> МАЛЪК СВЯТ. БЕЗКРАЙНИ ВРЪЗКИ.
          </div>
          <h2>
            Близки хора.
            <br />
            <em>Космически връзки.</em>
          </h2>
          <p>
            Съберете рождените карти на своите близки.
            <br />
            Открийте общите аспекти и малките съвпадения.
          </p>
          <button className="banner-link" onClick={onAdd}>
            {people.length
              ? "Разширете вашето съзвездие"
              : "Създайте вашето първо съзвездие"}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <CelestialArt />
      </section>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon lavender">
            <Users size={21} />
          </span>
          <div>
            <span>Хора във вашия атлас</span>
            <strong>
              {people.length.toString().padStart(2, "0")}
              <small>лични истории</small>
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sand">
            <Orbit size={22} />
          </span>
          <div>
            <span>Натални карти</span>
            <strong>
              {people
                .filter((p) => positions(p).some((x) => usable(x, true, true)))
                .length.toString()
                .padStart(2, "0")}
              <small>различни вселени</small>
            </strong>
          </div>
        </div>
        <button className="stat-card stat-link" onClick={onCompare}>
          <span className="stat-icon sage">
            <Network size={22} />
          </span>
          <div>
            <span>Открийте връзките</span>
            <strong className="text-stat">
              Сравнете карти
              <ArrowUpRight size={17} />
            </strong>
          </div>
        </button>
      </div>
      <section className="people-section">
        <div className="section-heading">
          <h2>
            Личният ви атлас <span className="count-pill">{people.length}</span>
          </h2>
          <span className="private-label">
            <ShieldCheck size={14} /> Само за вас
          </span>
        </div>
        <div className="people-toolbar">
          <div className="input-icon search">
            <Search size={17} />
            <input
              aria-label="Търсене на човек"
              placeholder="Потърсете човек по име…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-filters">
            <div className="select-wrap">
              <select
                aria-label="Семейна група"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="">Всички групи</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="select-wrap relation-filter">
              <select
                aria-label="Роднинска връзка"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
              >
                <option value="">Всички връзки</option>
                {relations.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="view-toggle">
              <button
                aria-label="Изглед карти"
                aria-pressed={view === "grid"}
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                aria-label="Изглед списък"
                aria-pressed={view === "list"}
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
        {!people.length ? (
          <Empty
            icon={<Users size={34} strokeWidth={1.25} />}
            title="Тук започва вашето съзвездие"
            action={
              <button className="button primary" onClick={onAdd}>
                <Plus size={17} /> Добавете първия човек
              </button>
            }
          >
            Всеки човек е цяла вселена. Добавете себе си или близък
            <br className="desktop-break" /> и запазете първата история във
            вашия атлас.
          </Empty>
        ) : !filtered.length ? (
          <Empty
            icon={<Search size={30} />}
            title="Няма намерени хора"
            action={
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setGroup("");
                  setRelation("");
                }}
              >
                Изчисти филтрите
              </button>
            }
          >
            Опитайте друго име, група или роднинска връзка.
          </Empty>
        ) : (
          <div className={view === "grid" ? "people-grid" : "people-list"}>
            {filtered.map((p, i) => {
              const ps = positions(p),
                sun = ps.find((x) => x.point === "sun"),
                moon = ps.find((x) => x.point === "moon");
              return (
                <button
                  className="person-card"
                  key={p.id}
                  onClick={() => onOpen(p.id)}
                >
                  <div className={`avatar avatar-${i % 4}`}>
                    {p.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="person-card-main">
                    <h3>
                      {p.name}
                      <ArrowUpRight size={16} />
                    </h3>
                    <p>
                      {p.relationship || "Личен профил"}
                      {p.group && ` · ${p.group}`}
                    </p>
                    <div className="person-placements">
                      {[sun, moon].filter(Boolean).map((pos) => (
                        <span key={pos!.point}>
                          {pointGlyph(pos!.point)} {formatPosition(pos)}
                        </span>
                      ))}
                    </div>
                    <span className={`status-tag ${p.stale ? "warning" : ""}`}>
                      {p.stale
                        ? "Нужно е преизчисление"
                        : p.mode === "manual"
                          ? "Ръчно въведена карта"
                          : "Изчислена карта"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <div className="section-heading getting-started">
        <h2>
          {people.length
            ? "Продължете да откривате"
            : "Няколко стъпки до нови открития"}
        </h2>
        <span className="muted">
          Създадено за любопитството ви <Star size={13} />
        </span>
      </div>
      <div className="steps-grid">
        <StepCard number="01" title="Добавете вашите хора" onClick={onAdd}>
          По рождени данни или с вече известни позиции.
        </StepCard>
        <StepCard
          number="02"
          title="Свържете техните карти"
          onClick={onCompare}
        >
          Един човек. Няколко близки. Всички аспекти.
        </StepCard>
        <StepCard number="03" title="Открийте повторенията" onClick={onRepeats}>
          Еднакви знаци и близки градуси в семейството.
        </StepCard>
      </div>
      <div className="page-footnote">
        <span>✧</span> Звездите дават перспектива. Историите са ваши.
      </div>
    </>
  );
}
