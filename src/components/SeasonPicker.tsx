import Link from "next/link";
import type { Season } from "@/lib/seasons";

interface Props {
  basePath: string;
  seasons: Season[];
  /** Selected season number, or "all". */
  selected: number | "all";
  includeAll?: boolean;
}

export function SeasonPicker({ basePath, seasons, selected, includeAll = false }: Props) {
  return (
    <nav aria-label="Season" className="flex flex-wrap gap-2">
      {seasons.map((s) => (
        <Link
          key={s.number}
          href={`${basePath}?season=${s.number}`}
          className="chip"
          aria-current={selected === s.number ? "true" : undefined}
        >
          {s.label}
        </Link>
      ))}
      {includeAll && (
        <Link
          href={`${basePath}?season=all`}
          className="chip"
          aria-current={selected === "all" ? "true" : undefined}
        >
          All time
        </Link>
      )}
    </nav>
  );
}

/** Parse ?season= into a season number or "all", falling back to `fallback`. */
export function parseSeasonParam(
  raw: string | string[] | undefined,
  validNumbers: number[],
  fallback: number | "all",
  allowAll = false,
): number | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (allowAll && value === "all") return "all";
  const n = Number(value);
  return validNumbers.includes(n) ? n : fallback;
}
