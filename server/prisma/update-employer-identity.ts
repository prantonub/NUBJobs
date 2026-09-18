/**
 * Fix the PUBLIC employer identity that job cards render.
 *
 * Job cards read `EmployerProfile.companyName` and `EmployerProfile.logoUrl`
 * directly (`GET /api/jobs`, `/api/jobs/recommended`, `/api/jobs/saved`,
 * `/api/jobs/:id`), so a profile whose company name is a person's name (the
 * legacy `companyName || name` fallback in `auth.controller.register`) makes
 * every card display that personal name next to a generated initials avatar.
 *
 * This script points those two columns at the real company identity.
 *
 * Usage (run from `server/`):
 *   npm run prisma:employer-identity                          # list current values
 *   npm run prisma:employer-identity -- --company "Acme Ltd"
 *   npm run prisma:employer-identity -- --logo "https://acme.com/logo.png"
 *   npm run prisma:employer-identity -- --logo-file ./logo.png
 *   npm run prisma:employer-identity -- --email hr@acme.com --company "Acme Ltd" --dry-run
 *
 * `--logo-file` reads a local image and stores it exactly like
 * `POST /api/company/logo` does: a `data:<mime>;base64,…` URL. `--email`
 * selects the employer (defaults to the only employer profile).
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

interface Args {
  email?: string;
  company?: string;
  logo?: string;
  logoFile?: string;
  dryRun: boolean;
  list: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, list: false };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    switch (flag) {
      case '--email':
        args.email = argv[++index];
        break;
      case '--company':
        args.company = argv[++index];
        break;
      case '--logo':
        args.logo = argv[++index];
        break;
      case '--logo-file':
        args.logoFile = argv[++index];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--list':
        args.list = true;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  return args;
}

const employerSelect = {
  id: true,
  companyName: true,
  logoUrl: true,
  isVerified: true,
  user: { select: { email: true, name: true } },
} as const;

async function listEmployers() {
  const employers = await prisma.employerProfile.findMany({ select: employerSelect });

  if (employers.length === 0) {
    console.log('No employer profiles found.');
    return;
  }

  console.log(`${employers.length} employer profile(s):`);
  for (const employer of employers) {
    const jobs = await prisma.job.count({ where: { employerId: employer.id } });
    console.log(
      JSON.stringify({
        email: employer.user?.email,
        companyName: employer.companyName,
        logo: employer.logoUrl ? `${employer.logoUrl.slice(0, 40)}…` : null,
        isVerified: employer.isVerified,
        jobs,
      })
    );
  }
}

function toDataUrl(filePath: string): string {
  const mime = MIME_BY_EXTENSION[extname(filePath).toLowerCase()];

  if (!mime) {
    throw new Error(
      `Unsupported image extension "${extname(filePath)}" — use png, jpg, jpeg, svg, webp or gif.`
    );
  }

  return `data:${mime};base64,${readFileSync(filePath).toString('base64')}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list || (!args.company && !args.logo && !args.logoFile)) {
    await listEmployers();
    if (!args.list) {
      console.log(
        '\nPass --company "<name>" and/or --logo "<url>" | --logo-file "<path>" to update.'
      );
    }
    return;
  }

  if (args.company !== undefined && args.company.trim().length < 3) {
    throw new Error('Company name must be at least 3 characters (matches the API validation).');
  }

  const employers = await prisma.employerProfile.findMany({
    where: args.email ? { user: { email: args.email } } : undefined,
    select: employerSelect,
  });

  if (employers.length === 0) {
    throw new Error(
      args.email
        ? `No employer profile found for ${args.email}.`
        : 'No employer profile found — register an employer account first.'
    );
  }

  if (employers.length > 1) {
    throw new Error(
      `Found ${employers.length} employer profiles — target one with --email <employer@gmail.com>.`
    );
  }

  const employer = employers[0];
  const companyName = args.company?.trim() || employer.companyName;
  const logoUrl = args.logo ?? (args.logoFile ? toDataUrl(args.logoFile) : employer.logoUrl);
  const jobs = await prisma.job.count({ where: { employerId: employer.id } });

  console.log('Before:');
  console.log(
    JSON.stringify({
      companyName: employer.companyName,
      logo: employer.logoUrl ? 'set' : null,
      jobsAffected: jobs,
    })
  );

  if (args.dryRun) {
    console.log('\nAfter (dry run — nothing written):');
    console.log(
      JSON.stringify({ companyName, logo: logoUrl ? 'set' : null, jobsAffected: jobs })
    );
    return;
  }

  const updated = await prisma.employerProfile.update({
    where: { id: employer.id },
    data: { companyName, logoUrl },
    select: employerSelect,
  });

  console.log('\nAfter:');
  console.log(
    JSON.stringify({
      email: updated.user?.email,
      companyName: updated.companyName,
      logo: updated.logoUrl ? 'set' : null,
      jobsAffected: jobs,
    })
  );
  console.log(
    '\nAll job cards (/jobs, home "Latest Jobs", dashboard recommended/saved) now use this company name and logo.'
  );
}

main()
  .catch((error) => {
    console.error(`\n[error] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });