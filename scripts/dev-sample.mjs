#!/usr/bin/env node
// Runs the dev server on port 3100 with Supabase switched off, so the site shows the built-in sample league.
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", "-p", "3100"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
});
child.on("exit", (code) => process.exit(code ?? 0));
