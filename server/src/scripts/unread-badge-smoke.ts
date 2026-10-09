import 'dotenv/config';

/**
 * Live smoke test for the "(1)" unread badge across BOTH inbox kinds
 * (direct Conversation + legacy application thread), against the running API:
 *
 *   1. Student sees direct (2) + legacy (1) = 3 from GET /unread-count.
 *   2. The sender (employer) sees 0 — unread is always recipient-side.
 *   3. GET /conversations rows report the same per-thread counts.
 *   4. Opening the direct thread (read-all) drops the badge to 1 (legacy left).
 *   5. Opening the legacy thread (GET /conversation/:applicationId) clears it.
 *
 * Everything it creates is deleted again in `finally`.
 *
 * Run: cd server && npx ts-node src/scripts/unread-badge-smoke.ts
 */
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password.utils';
import { generateAccessToken } from '../utils/jwt.utils';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

const API = `http://localhost:${process.env.PORT || 5000}/api`;

async function request(method: string, path: string, token: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log('\nUnread badge smoke test (direct + legacy)\n');
  const runId = Date.now().toString(36);

  const password = await hashPassword(`smoke-${runId}`);
  const student = await prisma.user.create({
    data: {
      email: `nubjobs.unread.s.${runId}@example.com`,
      name: 'Unread Smoke Student',
      password,
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });
  const employer = await prisma.user.create({
    data: {
      email: `nubjobs.unread.e.${runId}@example.com`,
      name: 'Unread Smoke Employer',
      password,
      role: 'EMPLOYER',
      isEmailVerified: true,
    },
  });
  const studentProfile = await prisma.studentProfile.create({ data: { userId: student.id } });
  const employerProfile = await prisma.employerProfile.create({
    data: { userId: employer.id, companyName: `SmokeCo ${runId}` },
  });
  const job = await prisma.job.create({
    data: { employerId: employerProfile.id, title: 'Smoke Job', description: 'Smoke test job' },
  });
  const application = await prisma.application.create({
    data: { jobId: job.id, studentId: studentProfile.id },
  });
  // Canonical pair ordering (user1Id < user2Id) as the controller enforces.
  const [u1, u2] = [student.id, employer.id].sort();
  const conversation = await prisma.conversation.create({
    data: { user1Id: u1, user2Id: u2, lastMessage: 'smoke', lastMessageTime: new Date() },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, senderId: employer.id, recipientId: student.id, content: 'direct 1', isRead: false },
      { conversationId: conversation.id, senderId: employer.id, recipientId: student.id, content: 'direct 2', isRead: false },
    ],
  });
  await prisma.message.create({
    data: { applicationId: application.id, senderId: employer.id, content: 'legacy 1', isRead: false },
  });

  try {
    const studentToken = generateAccessToken({ userId: student.id, email: student.email, role: 'STUDENT' });
    const employerToken = generateAccessToken({ userId: employer.id, email: employer.email, role: 'EMPLOYER' });

    // 1. Badge = direct (2) + legacy (1) = 3.
    const c1 = await request('GET', '/messages/unread-count', studentToken);
    check('student badge = 3 (direct 2 + legacy 1)', c1?.data?.unreadCount === 3, c1?.data);

    // 2. The sender must never see their own messages as unread.
    const c0 = await request('GET', '/messages/unread-count', employerToken);
    check('sender badge = 0', c0?.data?.unreadCount === 0, c0?.data);

    // 3. Per-row counts in the unified inbox agree with the badge.
    const list = await request('GET', '/messages/conversations', studentToken);
    const rows: any[] = list?.data?.conversations ?? [];
    const directRow = rows.find((r) => r.id === conversation.id);
    const legacyRow = rows.find((r) => r.id === `app:${application.id}`);
    check('direct row unreadCount = 2', directRow?.unreadCount === 2, directRow);
    check('legacy row unreadCount = 1', legacyRow?.unreadCount === 1, legacyRow);

    // 4. Opening the direct thread clears only the direct half.
    await request('PATCH', `/messages/conversation/${employer.id}/read-all`, studentToken);
    const c2 = await request('GET', '/messages/unread-count', studentToken);
    check('after read-all only legacy (1) remains', c2?.data?.unreadCount === 1, c2?.data);

    // 5. Opening the legacy thread (dual-dispatch on /conversation/:id) clears it.
    await request('GET', `/messages/conversation/${application.id}`, studentToken);
    const c3 = await request('GET', '/messages/unread-count', studentToken);
    check('after opening legacy thread badge = 0', c3?.data?.unreadCount === 0, c3?.data);
  } finally {
    await prisma.message.deleteMany({
      where: { OR: [{ conversationId: conversation.id }, { applicationId: application.id }] },
    });
    await prisma.conversation.deleteMany({ where: { id: conversation.id } });
    await prisma.application.deleteMany({ where: { id: application.id } });
    await prisma.job.deleteMany({ where: { id: job.id } });
    await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
    await prisma.employerProfile.deleteMany({ where: { id: employerProfile.id } });
    await prisma.user.deleteMany({ where: { id: { in: [student.id, employer.id] } } });
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
