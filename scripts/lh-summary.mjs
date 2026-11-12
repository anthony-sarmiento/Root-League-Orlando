// Prints the Lighthouse audits that lost points. Usage: node scripts/lh-summary.mjs report.json [more.json…]
import { readFileSync } from "node:fs";

for (const file of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(file, "utf8"));
  console.log(`\n== ${file.split(/[\\/]/).pop()} ==`, Object.entries(r.categories).map(([k, v]) => `${k}:${Math.round(v.score * 100)}`).join(" "));
  const m = r.audits;
  console.log("  metrics:", ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"].map((k) => `${k.split("-").map((w) => w[0]).join("")}=${m[k].displayValue}`).join(" "));
  for (const cat of Object.values(r.categories)) {
    for (const ref of cat.auditRefs) {
      const a = m[ref.id];
      if (ref.weight > 0 && a.score !== null && a.score < 1) {
        console.log(`  [${cat.id}] ${a.id} (${a.score}) ${a.displayValue ?? ""}`);
        for (const item of (a.details?.items ?? []).slice(0, 4)) {
          const node = item.node?.snippet ?? item.url ?? item.label ?? "";
          console.log("      -", String(node).slice(0, 140), item.wastedBytes ? `wasted ${item.wastedBytes}` : "", item.totalBytes ? `bytes ${item.totalBytes}` : "");
        }
      }
    }
  }
}
