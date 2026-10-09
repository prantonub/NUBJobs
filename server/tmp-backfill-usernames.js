const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '').slice(0, 24);

(async () => {
  const users = await p.user.findMany({ select: { id: true, email: true, name: true, username: true } });
  const taken = new Set(users.filter((u) => u.username).map((u) => u.username));
  let updated = 0;
  for (const u of users) {
    if (u.username) continue;
    let base = slug(u.email.split('@')[0]) || slug(u.name.replace(/\s+/g, '_')) || 'user';
    if (!base) base = 'user';
    if (/^\d+$/.test(base)) base = 'u' + base;
    let candidate = base;
    let n = 1;
    while (taken.has(candidate)) { candidate = base + n; n++; }
    taken.add(candidate);
    await p.user.update({ where: { id: u.id }, data: { username: candidate } });
    updated++;
  }
  console.log('usernames backfilled:', updated);
  const missing = await p.user.count({ where: { username: null } });
  console.log('still missing:', missing);
  await p.$disconnect();
})();
