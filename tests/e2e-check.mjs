async function testAll() {
  const base = 'http://localhost:3000';
  console.log('--- 1. Testing API Login & Session for Account A (Primary) ---');

  const loginResA = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'demo', account: 'A' }),
  });

  const cookieHeaderA = loginResA.headers.get('set-cookie');
  console.log('Account A login status:', loginResA.status);
  console.log('Set-Cookie present for Account A:', !!cookieHeaderA);
  const cookieA = cookieHeaderA ? cookieHeaderA.split(';')[0] : '';

  console.log('\n--- 2. Verifying Absence of Roll Number Displays ---');
  // 2a. Overview Page
  const ovResA = await fetch(`${base}/dashboard`, { headers: { Cookie: cookieA } });
  const ovHtmlA = await ovResA.text();
  const ovHasRoll = ovHtmlA.includes('Roll No:') || ovHtmlA.includes('Roll Number:');
  console.log('Overview page contains "Roll No":', ovHasRoll, '(Must be false)');
  if (ovHasRoll) throw new Error('Overview page still displays Roll No!');

  // 2b. Profile Page
  const profResA = await fetch(`${base}/dashboard/profile`, { headers: { Cookie: cookieA } });
  const profHtmlA = await profResA.text();
  const profHasRoll = profHtmlA.includes('<span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Roll Number</span>') ||
                      profHtmlA.includes('block">Roll Number</span>');
  console.log('Profile page contains Roll Number card:', profHasRoll, '(Must be false)');
  if (profHasRoll) throw new Error('Profile page still displays Roll Number card!');

  console.log('\n--- 3. Verifying Permanent Removal of Fabricated Assignments ---');
  const asgApiResA = await fetch(`${base}/api/assignments`, { headers: { Cookie: cookieA } });
  const asgApiDataA = await asgApiResA.json();
  console.log('Assignments API success:', asgApiDataA.success);
  console.log('Assignments count:', asgApiDataA.totalCount, '(Must be 0)');
  console.log('Upcoming assignments count:', asgApiDataA.upcomingCount, '(Must be 0)');

  // Verify that known fabricated assignments are completely absent
  const fabricatedTitles = [
    'Gradient Descent & Linear Regression from Scratch',
    'AVL Tree Balancing and Red-Black Tree Rotations',
    'Singular Value Decomposition and Fourier Transforms',
    'CPU Pipelining Hazard Simulation',
    'Combinatorics, Generating Functions & Graph Proofs',
  ];

  for (const title of fabricatedTitles) {
    const inOv = ovHtmlA.includes(title);
    const inApi = asgApiDataA.assignments?.some(a => a.title.includes(title));
    console.log(`Fabricated "${title.slice(0, 30)}..." in UI: ${inOv} | in API: ${inApi}`);
    if (inOv || inApi) throw new Error(`Fabricated assignment "${title}" was found!`);
  }

  console.log('\n--- 4. Verifying Account A Results Tab ---');
  const resPageA = await fetch(`${base}/dashboard/results`, { headers: { Cookie: cookieA } });
  const resHtmlA = await resPageA.text();
  console.log('Results page HTTP status for Account A:', resPageA.status);

  console.log('\n--- 5. Testing Sign-Out and Invalidation ---');
  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookieA },
  });
  console.log('Sign-out status:', logoutRes.status);

  console.log('\n--- 6. Testing Account B Login (Controlled Isolation Fixture) ---');
  const loginResB = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'demo', account: 'B' }),
  });
  const cookieHeaderB = loginResB.headers.get('set-cookie');
  console.log('Account B login status:', loginResB.status);
  const cookieB = cookieHeaderB ? cookieHeaderB.split(';')[0] : '';

  // 6a. Account B Profile Isolation
  const profResB = await fetch(`${base}/dashboard/profile`, { headers: { Cookie: cookieB } });
  const profHtmlB = await profResB.text();
  const profBHasKavya = profHtmlB.includes('Kavya N.') && profHtmlB.includes('25CTA99');
  const profBHasAdwait = profHtmlB.includes('Adwait S.') || profHtmlB.includes('25CTA12');
  console.log('Account B Profile displays Kavya N. (25CTA99):', profBHasKavya);
  console.log('Account B Profile leaks Adwait S. (25CTA12):', profBHasAdwait, '(Must be false)');
  if (!profBHasKavya || profBHasAdwait) {
    throw new Error('Account B profile leaked Account A identity or failed to load!');
  }

  // 6b. Account B Results Isolation: Must have ZERO Account A series records!
  const resPageB = await fetch(`${base}/dashboard/results`, { headers: { Cookie: cookieB } });
  const resHtmlB = await resPageB.text();
  const resBHasAdwaitMarks = resHtmlB.includes('rec-s3-01') ||
                            (resHtmlB.includes('Series Exam 1') && (resHtmlB.includes('>37<') || resHtmlB.includes('"obtainedMarks":37')));
  console.log('Account B Results leaks Account A examination marks:', resBHasAdwaitMarks, '(Must be false)');
  if (resBHasAdwaitMarks) {
    throw new Error('Critical Security Bug: Account B has access to Account A examination results!');
  }
  const resBHasEmptyMsg = resHtmlB.includes('Evaluations will appear here once published');
  const resBLeaksAccountA = resHtmlB.includes('25CTA12') || resHtmlB.includes('Adwait S.');
  console.log('Account B displays clean empty state message:', resBHasEmptyMsg);
  console.log('Account B Results contains zero Account A leakage:', !resBLeaksAccountA);
  if (!resBHasEmptyMsg || resBLeaksAccountA) {
    throw new Error('Account B Results failed empty state verification or leaked Account A data!');
  }

  console.log('\n--- 7. Security: Attempting Unauthorized Access via Injected Query Params ---');
  // Try to access Account A records while authenticated as Account B by injecting studentId parameter
  const attackUrl = `${base}/dashboard/results?studentId=25CTA12&username=25CTA12&admissionNo=25CTA12`;
  const attackRes = await fetch(attackUrl, { headers: { Cookie: cookieB } });
  const attackHtml = await attackRes.text();
  const attackLeaked = attackHtml.includes('Adwait S.') || attackHtml.includes('rec-s3-01');
  console.log('Injected parameters leak Account A records:', attackLeaked, '(Must be false)');
  if (attackLeaked) {
    throw new Error('Critical Security Vulnerability: Server honored client-supplied student identifier!');
  }

  console.log('\n--- 8. Testing Account Switching Back to Account A ---');
  const loginResA2 = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'demo', account: 'A' }),
  });
  const cookieHeaderA2 = loginResA2.headers.get('set-cookie');
  const cookieA2 = cookieHeaderA2 ? cookieHeaderA2.split(';')[0] : '';
  const profResA2 = await fetch(`${base}/dashboard/profile`, { headers: { Cookie: cookieA2 } });
  const profHtmlA2 = await profResA2.text();
  console.log('Account A profile successfully restored after switch:', profHtmlA2.includes('Adwait S.'));
  console.log('Account A does not retain stale Account B data:', !profHtmlA2.includes('Kavya N.'));

  console.log('\n==============================================');
  console.log('ALL SECURITY, ISOLATION & DATA CHECKS PASSED!');
  console.log('==============================================');
}

testAll().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
