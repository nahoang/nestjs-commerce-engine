#!/usr/bin/env node
// Local development helpers (no Docker required when a local PostgreSQL is installed).
//
//   node scripts/dev-env.mjs doctor      check database, migrations and port
//   node scripts/dev-env.mjs db:start    start a local (non-service) PostgreSQL if it is down
//   node scripts/dev-env.mjs lab:up      create/migrate the throwaway "lab" database
//   node scripts/dev-env.mjs lab:reset   drop and recreate the lab database (lab databases only)
//   node scripts/dev-env.mjs lab:sql "<query>"   run one SQL statement on the lab database and print the rows
//   node scripts/dev-env.mjs db:sql "<query>"    same, on the main dev database
//   node scripts/dev-env.mjs lab:start   lab:up, then run the API against the lab database with SQL logging
//                                        (add --debug to open the inspector on port 9229 for breakpoints)
//
// The lab database keeps manual experiments (Swagger, curl) away from the main dev database.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const prismaCli = path.join(
  root,
  'node_modules',
  'prisma',
  'build',
  'index.js',
);
const nestCli = path.join(
  root,
  'node_modules',
  '@nestjs',
  'cli',
  'bin',
  'nest.js',
);

const mainUrl = process.env.DATABASE_URL;
if (!mainUrl) {
  console.error('DATABASE_URL is not set (copy .env.example to .env).');
  process.exit(2);
}

function labUrl() {
  if (process.env.LAB_DATABASE_URL) return process.env.LAB_DATABASE_URL;
  const url = new URL(mainUrl);
  url.pathname = '/commerce_lab';
  return url.toString();
}

function dbNameOf(url) {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

function canConnect(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function prisma(args, databaseUrl) {
  return spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });
}

function findPgCtl() {
  if (process.env.PG_CTL_PATH && existsSync(process.env.PG_CTL_PATH)) {
    return process.env.PG_CTL_PATH;
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const candidate = path.join(
      process.env.LOCALAPPDATA,
      'Programs',
      'pgsql',
      'bin',
      'pg_ctl.exe',
    );
    if (existsSync(candidate)) return candidate;
  }
  const probe = spawnSync(
    process.platform === 'win32' ? 'where' : 'which',
    ['pg_ctl'],
    {
      encoding: 'utf8',
    },
  );
  return probe.status === 0 ? probe.stdout.split(/\r?\n/)[0].trim() : null;
}

async function dbStart() {
  const { hostname, port } = new URL(mainUrl);
  if (await canConnect(hostname, Number(port || 5432))) {
    console.log(
      `PostgreSQL is already accepting connections on ${hostname}:${port || 5432}.`,
    );
    return 0;
  }
  const pgCtl = findPgCtl();
  if (!pgCtl) {
    console.error(
      'No local pg_ctl found. Start the database with: docker compose up -d db',
    );
    return 1;
  }
  const dataDir =
    process.env.PG_DATA_DIR ??
    path.join(path.dirname(path.dirname(pgCtl)), 'data');
  const logFile = path.join(path.dirname(dataDir), 'pg.log');
  console.log(`Starting PostgreSQL with ${pgCtl} (data: ${dataDir})`);
  const result = spawnSync(
    pgCtl,
    ['start', '-D', dataDir, '-l', logFile, '-w', '-t', '30'],
    {
      stdio: 'inherit',
    },
  );
  return result.status ?? 1;
}

async function doctor() {
  let failed = false;
  const check = (ok, okText, failText) => {
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${ok ? okText : failText}`);
    if (!ok) failed = true;
  };

  const { hostname, port } = new URL(mainUrl);
  const dbUp = await canConnect(hostname, Number(port || 5432));
  check(
    dbUp,
    `database reachable at ${hostname}:${port || 5432}`,
    `database NOT reachable at ${hostname}:${port || 5432} -> run: pnpm db:start`,
  );

  if (dbUp) {
    const status = prisma(['migrate', 'status'], mainUrl);
    check(
      status.status === 0,
      'all migrations applied',
      'migrations pending or drifted -> run: pnpm prisma migrate dev',
    );
  }

  const appPort = Number(process.env.PORT || 3000);
  const portBusy = await canConnect('127.0.0.1', appPort);
  check(
    !portBusy,
    `port ${appPort} is free`,
    `port ${appPort} is already in use (another API instance?)`,
  );

  process.exit(failed ? 1 : 0);
}

function labUp() {
  const url = labUrl();
  console.log(`Migrating lab database "${dbNameOf(url)}"`);
  const result = prisma(['migrate', 'deploy'], url);
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  return result.status ?? 1;
}

function labReset() {
  const url = labUrl();
  if (!/_lab$/.test(dbNameOf(url))) {
    console.error(
      `Refusing to reset "${dbNameOf(url)}": only databases whose name ends with _lab are allowed.`,
    );
    return 1;
  }
  console.log(`Resetting lab database "${dbNameOf(url)}"`);
  const result = prisma(
    ['migrate', 'reset', '--force', '--skip-seed', '--skip-generate'],
    url,
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  return result.status ?? 1;
}

async function runSql(databaseUrl) {
  const query = process.argv[3];
  if (!query) {
    console.error('Usage: pnpm lab:sql "<query>"');
    return 2;
  }
  const { PrismaClient } = createRequire(import.meta.url)('@prisma/client');
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    const rows = await client.$queryRawUnsafe(query);
    console.table(rows);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    await client.$disconnect();
  }
}

function labStart() {
  const code = labUp();
  if (code !== 0) return code;
  const url = labUrl();
  console.log(
    `Starting API against "${dbNameOf(url)}" with LOG_SQL=true${process.argv.includes('--debug') ? ' (inspector on 9229)' : ''} -> http://localhost:${process.env.PORT || 3000}/docs`,
  );
  const child = spawn(
    process.execPath,
    [
      nestCli,
      'start',
      '--watch',
      ...(process.argv.includes('--debug') ? ['--debug'] : []),
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: url, LOG_SQL: 'true' },
    },
  );
  child.on('exit', (exitCode) => process.exit(exitCode ?? 0));
  return null;
}

const command = process.argv[2];
const commands = {
  doctor,
  'db:start': dbStart,
  'lab:up': labUp,
  'lab:reset': labReset,
  'lab:sql': () => runSql(labUrl()),
  'db:sql': () => runSql(mainUrl),
  'lab:start': labStart,
};

if (!commands[command]) {
  console.error(
    `Usage: node scripts/dev-env.mjs <${Object.keys(commands).join('|')}>`,
  );
  process.exit(2);
}

const code = await commands[command]();
if (code !== null) process.exit(code);
