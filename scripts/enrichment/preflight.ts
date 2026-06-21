import { spawnSync } from "node:child_process";

function commandExists(command: string): boolean {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0;
}

function requiredEnv(name: string): string {
  return process.env[name] ? "set" : "missing";
}

function main(): void {
  const missing: string[] = [];

  for (const command of ["doppler", "parallel-cli"]) {
    if (!commandExists(command)) missing.push(command);
  }

  for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "PARALLEL_API_KEY"]) {
    if (!process.env[key]) missing.push(key);
  }

  console.log(
    JSON.stringify(
      {
        doppler: commandExists("doppler") ? "installed" : "missing",
        parallelCli: commandExists("parallel-cli") ? "installed" : "missing",
        tursoDatabaseUrl: requiredEnv("TURSO_DATABASE_URL"),
        tursoAuthToken: requiredEnv("TURSO_AUTH_TOKEN"),
        parallelApiKey: requiredEnv("PARALLEL_API_KEY"),
      },
      null,
      2,
    ),
  );

  if (missing.length > 0) {
    throw new Error(`Preflight failed: ${missing.join(", ")}`);
  }
}

main();
