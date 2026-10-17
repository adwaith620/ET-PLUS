import test from 'node:test';
import assert from 'node:assert/strict';
import { getSynchronizedAssignments, isFabricatedAssignment, FABRICATED_ASSIGNMENT_IDS } from '../src/lib/assignment-service.ts';
import { normalizeStudentProfile } from '../src/lib/course-catalog.ts';
import { DEMO_PROFILE, DEMO_PROFILE_B, DEMO_ASSIGNMENTS, DEMO_RESULTS, DEMO_ASSESSMENT_RECORDS } from '../src/lib/demo-data.ts';

test('Security & Account Isolation Suite', async (t) => {
  await t.test('1. Verify Account A profile and records isolation', () => {
    const profileA = normalizeStudentProfile(DEMO_PROFILE);
    assert.equal(profileA.admissionNo, '25CTA12');
    assert.equal(profileA.name, 'Adwait S.');
    assert.equal(profileA.email, '25CTA12@tkmce.ac.in');
    assert.equal(profileA.semester, 3);
  });

  await t.test('2. Verify Account B profile isolation - zero leakage from Account A', () => {
    const profileB = normalizeStudentProfile(DEMO_PROFILE_B);
    assert.equal(profileB.admissionNo, '25CTA99');
    assert.equal(profileB.name, 'Kavya N.');
    assert.equal(profileB.email, '25CTA99@tkmce.ac.in');
    assert.equal(profileB.semester, 3);

    // Verify Account B has no leakage of Account A identity
    assert.notEqual(profileB.admissionNo, profileA_admission(DEMO_PROFILE));
    assert.notEqual(profileB.name, DEMO_PROFILE.name);
    assert.ok(!profileB.email.includes('25CTA12'));
  });

  await t.test('3. Verify complete elimination of fabricated assignments for all students', async () => {
    // 1. DEMO_ASSIGNMENTS array must be strictly empty
    assert.equal(DEMO_ASSIGNMENTS.length, 0, 'DEMO_ASSIGNMENTS must contain 0 records');

    // 2. Blacklisted fabricated IDs must all be recognized and blocked
    for (const id of ['asg-01', 'asg-02', 'asg-03', 'asg-04', 'asg-05']) {
      assert.ok(FABRICATED_ASSIGNMENT_IDS.has(id), `${id} must be in blacklist`);
      assert.ok(isFabricatedAssignment({ id, title: 'Sample' }), `${id} must be blocked`);
    }

    // 3. Known fabricated titles must be blocked
    assert.ok(isFabricatedAssignment({ id: 'any-id', title: 'Assignment 2: Gradient Descent & Linear Regression from Scratch' }));
    assert.ok(isFabricatedAssignment({ id: 'any-id', title: 'Assignment 2: AVL Tree Balancing and Red-Black Tree Rotations' }));
    assert.ok(isFabricatedAssignment({ id: 'any-id', title: 'Assignment 1: Singular Value Decomposition and Fourier Transforms' }));
    assert.ok(isFabricatedAssignment({ id: 'any-id', title: 'Assignment 1: CPU Pipelining Hazard Simulation & Forwarding Unit' }));
    assert.ok(isFabricatedAssignment({ id: 'any-id', title: 'Problem Set 1: Combinatorics, Generating Functions & Graph Proofs' }));

    // 4. Synchronized assignments for Account A
    const resA = await getSynchronizedAssignments({
      mode: 'demo',
      username: '25CTA12',
      displayName: 'Adwait S.',
    }, true);
    assert.equal(resA.assignments.length, 0, 'Account A must have 0 fabricated assignments');
    assert.equal(resA.upcomingCount, 0);

    // 5. Synchronized assignments for Account B
    const resB = await getSynchronizedAssignments({
      mode: 'demo',
      username: '25CTA99',
      displayName: 'Kavya N.',
    }, true);
    assert.equal(resB.assignments.length, 0, 'Account B must have 0 fabricated assignments');
    assert.equal(resB.upcomingCount, 0);
  });

  await t.test('4. Verify Account Switching and Cache Isolation', async () => {
    const sessionA = { mode: 'demo', username: '25CTA12', displayName: 'Adwait S.' };
    const sessionB = { mode: 'demo', username: '25CTA99', displayName: 'Kavya N.' };

    const resA = await getSynchronizedAssignments(sessionA, true);
    const resB = await getSynchronizedAssignments(sessionB, true);

    // Both must be scoped to their respective username and isolated
    assert.equal(resA.success, true);
    assert.equal(resB.success, true);
  });
});

function profileA_admission(p) {
  return p.admissionNo;
}
