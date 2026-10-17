import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowUpRight, Sparkles } from "lucide-react";
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const node = ref.current!;
    const timer = setTimeout(
      () => node.querySelector<HTMLElement>("input,button,select")?.focus(),
      0,
    );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...node.querySelectorAll<HTMLElement>(
            'button,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((x) => !x.hasAttribute("disabled"));
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">ВАШИЯТ ЛИЧЕН АТЛАС</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Затвори"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon}
        <Sparkles className="empty-spark" size={18} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span className="heading-star">✧</span>
        </h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </header>
  );
}
export function StepCard({
  number,
  title,
  children,
  onClick,
}: {
  number: string;
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="step-card" onClick={onClick}>
      <span className="step-number">{number}</span>
      <div>
        <h3>
          {title}
          <ArrowUpRight size={16} />
        </h3>
        <p>{children}</p>
      </div>
    </button>
  );
}
