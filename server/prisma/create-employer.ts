/**
 * Create a ready-to-use employer account (User + EmployerProfile) that carries a
 * REAL company identity, so every job card, job detail page and the home
 * "Latest Jobs" strip render a company name + logo instead of the account
 * holder's personal name with a generated initials avatar.
 *
 * Why this exists: `POST /api/auth/register` stores
 * `companyName: companyName || name` (auth.controller.register), so an employer
 * who never fills in the company field publishes under a person's name. This
 * script provisions the account with the company identity already set.
 *
 * Usage (run from `server/`):
 *   # preview only — nothing is written
 *   npm run prisma:employer-create -- --email hr@acme.com --company "Acme Ltd" --dry-run
 *
 *   # create; a strong password is generated and printed once
 *   npm run prisma:employer-create -- --email hr@acme.com --company "Acme Ltd"
 *
 *   # create with a local logo (stored as data:<mime>;base64,… exactly like
 *   # POST /api/company/logo) and a known password
 *   npm run prisma:employer-create -- --email hr@acme.com --password "Secret12345" `
 *     --name "Acme HR" --company "Acme Ltd" --logo-file ./acme-logo.png `
 *     --website "https://acme.com" --industry "Software" --verified
 *
 * Validation mirrors the API: company name >= 3 chars (PATCH /api/company),
 * password >= 8 chars (registerSchema), name >= 2 chars, absolute http(s) URLs.
 * Unlike UI registration the account is created with `isEmailVerified: true`
 * (login rejects unverified users), so it is usable immediately with no OTP.
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.utils';

const prisma = new PrismaClient();

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const USAGE = [
  'npm run prisma:employer-create -- --email <gmail> --company "<name>" [options]',
  '',
  'Required:',
  '  --email <address>       Login email of the new employer account',
  '  --company "<name>"      Public company name shown on job cards (>= 3 chars)',
  '',
  'Optional:',
  '  --password "<secret>"   Login password (>= 8 chars). Generated and printed if omitted',
  '  --name "<person>"       Account holder name (defaults to the email local part)',
  '  --logo "<url>"          Hosted logo URL, or data URL',
  '  --logo-file "<path>"    Local image (png/jpg/jpeg/svg/webp/gif) stored as a data URL',
  '  --website "<url>"       Company website (must be http/https)',
  '  --linkedin "<url>"      Company LinkedIn URL (must be http/https)',
  '  --about "<text>"        Company description',
  '  --industry "<text>"     Stored as "Industry: <text>" when --about is omitted',
  '  --verified              Mark the company as verified (shows the verified badge)',
  '  --dry-run               Print what would be created and exit',
].join('\n');

interface Args {
  email?: string;
  password?: string;
  name?: string;
  company?: string;
  logo?: string;
  logoFile?: string;
  website?: string;
  linkedin?: string;
  about?: string;
  industry?: string;
  verified: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { verified: false, dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    switch (flag) {
      case '--email':
        args.email = argv[++index];
        break;
      case '--password':
        args.password = argv[++index];
        break;
      case '--name':
        args.name = argv[++index];
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
      case '--website':
        args.website = argv[++index];
        break;
      case '--linkedin':
        args.linkedin = argv[++index];
        break;
      case '--about':
        args.about = argv[++index];
        break;
      case '--industry':
        args.industry = argv[++index];
        break;
      case '--verified':
        args.verified = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  return args;
}

function requireArg(value: string | undefined, flag: string): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required argument ${flag}\n\n${USAGE}`);
  }
  return value;
}

function requireHttpUrl(value: string, flag: string): string {
  const trimmed = value.trim();

  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    throw new Error(`${flag} must be a valid http(s) URL, e.g. https://acme.com`);
  }

  try {
    new URL(trimmed);
  } catch {
    throw new Error(`${flag} is not a parseable URL: ${trimmed}`);
  }

  return trimmed;
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

function randomPassword(): string {
  // 12 base64url characters (~72 bits) — comfortably above the 8 char minimum.
  return randomBytes(9).toString('base64url');
}


async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const args = parseArgs(argv);

  const email = requireArg(args.email, '--email').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${email}" is not a valid email address.`);
  }
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    console.log(
      '[notice] Registration through the UI requires a Gmail address; login accepts any valid email, so this account still works.'
    );
  }

  const companyName = requireArg(args.company, '--company').trim();
  if (companyName.length < 3) {
    throw new Error('Company name must be at least 3 characters (matches PATCH /api/company).');
  }

  const generatedPassword = args.password === undefined;
  const password = args.password ?? randomPassword();
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters (matches POST /api/auth/register).');
  }

  const name = (args.name?.trim() || email.split('@')[0]).slice(0, 80);
  if (name.length < 2) {
    throw new Error('Account name must be at least 2 characters (matches POST /api/auth/register).');
  }

  const website = args.website ? requireHttpUrl(args.website, '--website') : undefined;
  const linkedinUrl = args.linkedin ? requireHttpUrl(args.linkedin, '--linkedin') : undefined;
  const about = args.about?.trim() || (args.industry ? `Industry: ${args.industry.trim()}` : undefined);
  const logoUrl = args.logo?.trim() || (args.logoFile ? toDataUrl(args.logoFile) : undefined);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    throw new Error(
      `A user with ${email} already exists (role ${existing.role}). ` +
        `To rename an existing employer instead:\n  npm run prisma:employer-identity -- --email ${email} --company "<name>"`
    );
  }

  console.log('To create:');
  console.log(
    JSON.stringify(
      {
        email,
        name,
        role: 'EMPLOYER',
        isEmailVerified: true,
        password: generatedPassword ? '<generated>' : '<provided>',
        companyName,
        logo: logoUrl
          ? logoUrl.startsWith('data:')
            ? `data url (${logoUrl.length} chars)`
            : logoUrl
          : null,
        website: website ?? null,
        linkedinUrl: linkedinUrl ?? null,
        about: about ?? null,
        isVerified: args.verified,
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    console.log('\nDry run — nothing written.');
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      name,
      role: 'EMPLOYER',
      password: await hashPassword(password),
      isEmailVerified: true,
      employerProfile: {
        create: {
          companyName,
          about,
          logoUrl,
          website,
          linkedinUrl,
          isVerified: args.verified,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      employerProfile: {
        select: { id: true, companyName: true, logoUrl: true, isVerified: true },
      },
    },
  });

  console.log('\nCreated:');
  console.log(
    JSON.stringify(
      {
        userId: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        employerProfileId: created.employerProfile?.id,
        companyName: created.employerProfile?.companyName,
        logo: created.employerProfile?.logoUrl ? 'set' : null,
        isVerified: created.employerProfile?.isVerified,
      },
      null,
      2
    )
  );

  if (generatedPassword) {
    console.log(`\nPassword (shown once, save it now): ${password}`);
  }

  console.log(`\nEmployer profiles in DB now: ${await prisma.employerProfile.count()}`);
  console.log(
    'Next: sign in with this email + password, then post jobs — every job card, job page and "Latest Jobs" entry uses this company name and logo.'
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