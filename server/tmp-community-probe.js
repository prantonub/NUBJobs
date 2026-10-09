const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const first = await p.message.findFirst({ select: { messageType: true } });
  console.log(JSON.stringify({
    community: await p.community.count(),
    communityPost: await p.communityPost.count(),
    messageTypeField: first ? first.messageType : 'no-rows-yet',
  }));
  await p.$disconnect();
})().catch((e) => { console.error('PROBE-FAIL', e.message); process.exit(1); });
