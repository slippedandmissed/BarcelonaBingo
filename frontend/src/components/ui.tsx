import clsx from "clsx";
import { BINGO_COLORS, BINGO_LETTERS } from "../utils/bingo";
import {
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

/* -------------------------------------------------------------------------- */
/*  Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "coral" | "sea" | "mint" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-sol text-tinta hover:bg-sol-deep",
  coral: "bg-coral text-white hover:bg-coral-deep",
  sea: "bg-mar text-white hover:bg-mar-deep",
  mint: "bg-menta text-white hover:bg-menta-deep",
  ghost: "bg-white text-tinta hover:bg-crema",
  danger: "bg-white text-coral-deep hover:bg-coral hover:text-white",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-tinta font-heading font-semibold",
        "shadow-hard-sm transition-all duration-100",
        "hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        "disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  tone = "white",
}: {
  className?: string;
  children: ReactNode;
  tone?: "white" | "cream";
}) {
  return (
    <div
      className={clsx(
        "rounded-3xl border-2 border-tinta shadow-hard-lg",
        tone === "white" ? "bg-white" : "bg-crema",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Text input                                                                 */
/* -------------------------------------------------------------------------- */

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-2xl border-2 border-tinta bg-crema px-4 py-2.5 font-body text-base text-tinta",
        "placeholder:text-tinta-soft/70",
        "focus:bg-white focus:outline-2 focus:outline-offset-2 focus:outline-sol",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox (styled label wrapper)                                            */
/* -------------------------------------------------------------------------- */

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 font-body text-sm text-tinta">
      <span
        className={clsx(
          "grid h-6 w-6 place-items-center rounded-lg border-2 border-tinta transition-colors",
          checked ? "bg-mar text-white" : "bg-white text-transparent",
        )}
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
          <path
            d="M4 10.5 8.5 15 16 5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bingo lettering                                                            */
/* -------------------------------------------------------------------------- */

/** The row of five coloured B-I-N-G-O chips used as a brand motif. */
export function BingoChips({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center justify-center gap-1.5", className)}>
      {BINGO_LETTERS.map((letter, i) => (
        <span
          key={letter}
          className={clsx(
            "grid h-8 w-8 place-items-center rounded-full border-2 border-tinta font-display text-sm text-white shadow-hard-sm",
            BINGO_COLORS[i],
          )}
          style={{ transform: `rotate(${(i - 2) * 4}deg)` }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status pill                                                                */
/* -------------------------------------------------------------------------- */

const PILL_TONES = {
  lobby: "bg-sol/25 text-tinta border-sol-deep",
  generating: "bg-sol/25 text-tinta border-sol-deep",
  generation_failed: "bg-coral/20 text-coral-deep border-coral",
  playing: "bg-mar/15 text-mar-deep border-mar",
  won: "bg-menta/20 text-menta-deep border-menta",
  aborted: "bg-tinta/10 text-tinta-soft border-tinta-soft",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 font-heading text-xs font-semibold uppercase tracking-wide",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Player avatar                                                              */
/* -------------------------------------------------------------------------- */

const AVATAR_COLORS = [
  "bg-coral",
  "bg-sol",
  "bg-mar",
  "bg-menta",
  "bg-uva",
  "bg-coral-deep",
  "bg-mar-deep",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const color = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }, [name]);

  const sizeClass =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";

  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center rounded-full border-2 border-tinta font-display text-white",
        sizeClass,
        color,
      )}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal shell (wraps a native <dialog> body)                                 */
/* -------------------------------------------------------------------------- */

export function ModalShell({
  title,
  modalId,
  children,
  accent = "bg-sol",
}: {
  title: ReactNode;
  modalId: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="w-full overflow-hidden rounded-3xl border-2 border-tinta bg-white shadow-hard-lg">
      <div
        className={clsx(
          "flex items-center justify-between border-b-2 border-tinta px-5 py-3",
          accent,
        )}
      >
        <h2 className="font-heading text-lg font-semibold text-tinta">{title}</h2>
        <button
          // @ts-expect-error - invoker commands API
          command="close"
          commandfor={modalId}
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full border-2 border-tinta bg-white transition-transform hover:rotate-90"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Spinner / loading ball                                                     */
/* -------------------------------------------------------------------------- */

export function BingoBall({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-grid h-12 w-12 place-items-center rounded-full border-4 border-tinta border-t-coral bg-white font-display text-lg text-coral",
        className,
      )}
      style={{ animation: "ball-spin 0.9s linear infinite" }}
    >
      B
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confetti                                                                   */
/* -------------------------------------------------------------------------- */

const CONFETTI_COLORS = ["#ff6b5b", "#ffc23c", "#1ba7c4", "#34b981", "#7c5cbf"];

function makeConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 3.5,
    duration: 3 + Math.random() * 3,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    round: Math.random() > 0.5,
  }));
}

export function Confetti({ count = 90 }: { count?: number }) {
  const [pieces] = useState(() => makeConfetti(count));

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Copy-to-clipboard button                                                   */
/* -------------------------------------------------------------------------- */

/**
 * There are no websockets — other players' actions (joining, dabbing,
 * winning) only show up once you refetch. Drop this wherever staleness would
 * otherwise go unnoticed; `onRefresh` should return the invalidation promise
 * so the spin stops once the refetch actually lands.
 */
export function RefreshButton({
  onRefresh,
  label = "Refresh",
  className,
}: {
  onRefresh: () => Promise<unknown>;
  label?: string;
  className?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <button
      type="button"
      aria-label={label || "Refresh"}
      onClick={() => {
        setIsRefreshing(true);
        void onRefresh().finally(() => setIsRefreshing(false));
      }}
      disabled={isRefreshing}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-xl border-2 border-tinta bg-white px-2.5 py-1 font-heading text-xs font-semibold shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60",
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        className={clsx("h-3.5 w-3.5", isRefreshing && "animate-spin")}
        fill="none"
      >
        <path
          d="M16.5 10a6.5 6.5 0 1 1-2-4.7M16.5 3.5v4.2h-4.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
      }}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-xl border-2 border-tinta bg-white px-2.5 py-1 font-heading text-xs font-semibold shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
        <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      {label}
    </button>
  );
}
