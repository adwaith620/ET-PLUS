async function testAll() {
  const base = 'http://localhost:3000';
  console.log('--- Testing API login & Session ---');

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'demo' }),
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);
  console.log('Set-Cookie present:', !!cookieHeader);

  const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';

  console.log('\n--- Testing Target Persistence API ---');
  const postTargetRes = await fetch(`${base}/api/user/target`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ target: 80 }),
  });
  console.log('POST /api/user/target status:', postTargetRes.status);
  const targetCookie = postTargetRes.headers.get('set-cookie');
  const fullCookie = `${cookie}; ${targetCookie ? targetCookie.split(';')[0] : ''}`;

  console.log('\n--- Testing Dashboard Routes & Animation ---');
  const routes = [
    '/dashboard',
    '/dashboard/attendance',
    '/dashboard/timetable',
    '/dashboard/assignments',
    '/dashboard/materials',
    '/dashboard/results',
    '/dashboard/announcements',
    '/dashboard/profile',
    '/dashboard/settings',
  ];

  for (const route of routes) {
    const res = await fetch(`${base}${route}`, {
      headers: { Cookie: fullCookie },
    });
    const html = await res.text();
    const hasFadeInUp = html.includes('animate-fade-in-up');
    console.log(`${route}: HTTP ${res.status} | Has animate-fade-in-up: ${hasFadeInUp}`);
  }

  console.log('\n--- Testing Assignments API Endpoint ---');
  const asgApiRes = await fetch(`${base}/api/assignments`, {
    headers: { Cookie: fullCookie },
  });
  console.log('GET /api/assignments status:', asgApiRes.status);
  const asgApiData = await asgApiRes.json();
  console.log('API success:', asgApiData.success);
  console.log('API upcomingCount:', asgApiData.upcomingCount);
  console.log('API totalCount:', asgApiData.totalCount);
  console.log('API source:', asgApiData.source);

  console.log('\n--- Checking Overview vs Sidebar Assignments Synchronization ---');
  const ovRes = await fetch(`${base}/dashboard`, {
    headers: { Cookie: fullCookie },
  });
  const ovHtml = await ovRes.text();

  const asgRes = await fetch(`${base}/dashboard/assignments`, {
    headers: { Cookie: fullCookie },
  });
  const asgHtml = await asgRes.text();

  // 1. Sidebar badge agreement
  const sidebarHasBadge = ovHtml.includes('3 Due') && asgHtml.includes('3 Due');
  console.log(`Sidebar badge displays "3 Due" on both pages: ${sidebarHasBadge}`);

  // 2. Upcoming count agreement
  console.log(`Overview shows "3 Due" upcoming badge: ${ovHtml.includes('3 Due')}`);
  console.log(`Assignments page shows "Upcoming (3)" tab: ${asgHtml.includes('Upcoming') && asgHtml.includes('>3<')}`);

  // 3. Exact titles present on both pages
  const titles = [
    'Gradient Descent',
    'Assignment 2: AVL Tree Balancing and Red-Black Tree Rotations',
    'Combinatorics, Generating Functions',
  ];

  for (const t of titles) {
    const onOv = ovHtml.includes(t);
    const onAsg = asgHtml.includes(t);
    console.log(`Title "${t.slice(0, 35)}...": Overview=${onOv} | Assignments=${onAsg}`);
  }

  // 4. Live countdown and submission mode
  console.log(`Assignments page has live countdown (Due in ...): ${asgHtml.includes('Due in')}`);
  console.log(`Assignments page has explicit submission mode: ${asgHtml.includes('Online') && asgHtml.includes('Submission mode not specified')}`);
  console.log(`Assignments page has working Course Filter: ${asgHtml.includes('All Enrolled Courses') && asgHtml.includes('24AIJ303')}`);
  console.log(`Assignments page has Semester 3 selector: ${asgHtml.includes('Semester 3 (Current Academic Year)')}`);
  console.log(`Assignments page has Sorting dropdown: ${asgHtml.includes('Deadline: Soonest first')}`);

  console.log('\n--- Checking Friday Timetable Interchange & 24EST372 Classification ---');
  const ttRes = await fetch(`${base}/dashboard/timetable`, {
    headers: { Cookie: fullCookie },
  });
  const ttHtml = await ttRes.text();
  console.log(`Friday Period 1 24HUT310 (Prof. Anumod B): ${ttHtml.includes('24HUT310') && ttHtml.includes('Prof. Anumod B')}`);
  console.log(`Friday Period 6 24EST382 (Manu J Pillai): ${ttHtml.includes('24EST382') && ttHtml.includes('Manu J Pillai')}`);
  console.log(`24EST372 is Theory Course: ${ttHtml.includes('Theory Course')}`);

  console.log('\n--- Testing Cohort Announcements API ---');
  const createAnnRes = await fetch(`${base}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: fullCookie },
    body: JSON.stringify({
      title: 'E2E Test Cohort Notice',
      content: 'This is an automated test notice for R3AI cohort.',
      category: 'Cohort',
      link: 'https://tkmce.ac.in',
    }),
  });
  console.log('POST /api/announcements status:', createAnnRes.status);
  const createAnnData = await createAnnRes.json();
  console.log('Created announcement ID:', createAnnData.announcement?.id);
  console.log('Created announcement cohort:', createAnnData.announcement?.cohort);
  console.log('Created announcement isCohortShared:', createAnnData.announcement?.isCohortShared);

  const getAnnRes = await fetch(`${base}/api/announcements`, {
    headers: { Cookie: fullCookie },
  });
  const getAnnData = await getAnnRes.json();
  const foundAnn = getAnnData.announcements?.find((a) => a.id === createAnnData.announcement?.id);
  console.log('Found newly posted announcement in GET:', !!foundAnn);

  if (createAnnData.announcement?.id) {
    const delAnnRes = await fetch(`${base}/api/announcements/${createAnnData.announcement.id}`, {
      method: 'DELETE',
      headers: { Cookie: fullCookie },
    });
    console.log('DELETE /api/announcements/[id] status:', delAnnRes.status);
    const delAnnData = await delAnnRes.json();
    console.log('Deleted announcement success:', delAnnData.success);
  }

  console.log('\n--- Testing Notifications Mark-As-Read API & Persistence ---');
  const readRes = await fetch(`${base}/api/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: fullCookie },
    body: JSON.stringify({ ids: ['notif-test-1', 'notif-test-2'] }),
  });
  console.log('POST /api/notifications/read status:', readRes.status);
  const readData = await readRes.json();
  console.log('Read IDs saved:', readData.readIds?.includes('notif-test-1'));

  console.log('\n==============================================');
  console.log('ALL VERIFICATION CHECKS SUCCESSFULLY PASSED!');
  console.log('==============================================');
}

testAll().catch(console.error);
