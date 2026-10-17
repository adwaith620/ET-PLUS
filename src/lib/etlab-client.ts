import * as cheerio from 'cheerio';
import type { StudentProfile, SubjectAttendanceData, EtlabAssessmentRecord, Assignment } from '../types/index.ts';
import { normalizeStudentProfile, normalizeSubjectAttendance, getCourseFullName } from './course-catalog.ts';

const BASE_URL = process.env.ETLAB_BASE_URL || 'https://tkmce.etlab.in';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

interface LoginResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  profile?: StudentProfile;
}

/**
 * Perform server-side login to ETLAB portal.
 * No password is saved or logged. Credentials are used only for this single HTTPS handshake.
 */
export async function etlabLogin(username: string, password: string): Promise<LoginResult> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required.' };
    }

    // Step 1: Fetch login page to extract CSRF token and initial session cookie
    const loginPageRes = await fetch(`${BASE_URL}/user/login`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    const loginPageHtml = await loginPageRes.text();
    const rawSetCookies = loginPageRes.headers.getSetCookie
      ? loginPageRes.headers.getSetCookie()
      : [loginPageRes.headers.get('set-cookie') || ''];

    // Extract CSRF token from HTML
    const csrfMatch = loginPageHtml.match(/YII_CSRF_TOKEN["']\s*:\s*["']([^"']+)["']/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // Extract cookies
    const cookieMap: Record<string, string> = {};
    for (const cookieStr of rawSetCookies) {
      if (!cookieStr) continue;
      const parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    }

    const cookieHeader = Object.entries(cookieMap)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    // Step 2: POST credentials to /user/login
    const formData = new URLSearchParams();
    if (csrfToken) {
      formData.append('YII_CSRF_TOKEN', csrfToken);
    }
    formData.append('LoginForm[username]', username.trim());
    formData.append('LoginForm[password]', password);
    formData.append('yt0', 'Login');

    const authRes = await fetch(`${BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'User-Agent': USER_AGENT,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/user/login`,
      },
      body: formData.toString(),
      redirect: 'manual',
      cache: 'no-store',
    });

    // Capture updated session cookies from POST response
    const postCookies = authRes.headers.getSetCookie
      ? authRes.headers.getSetCookie()
      : [authRes.headers.get('set-cookie') || ''];

    for (const cookieStr of postCookies) {
      if (!cookieStr) continue;
      const parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        cookieMap[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    }

    const tkmSessionId = cookieMap['TKMSESSIONID'];
    const postHtml = await authRes.text();

    // Check for error indicator in response
    if (postHtml.includes('flash-error') || postHtml.includes('Invalid username or password') || postHtml.includes('Incorrect username or password')) {
      return {
        success: false,
        error: 'Invalid username or password. Please verify your TKMCE credentials.',
      };
    }

    // Check if redirected or successful session
    const isRedirect = authRes.status === 302 || authRes.status === 301;
    const location = authRes.headers.get('location') || '';

    // If redirected to login again, it failed
    if (isRedirect && location.includes('/user/login')) {
      return {
        success: false,
        error: 'Authentication failed. Please check your credentials.',
      };
    }

    if (!tkmSessionId) {
      return {
        success: false,
        error: 'Could not establish ETLAB session. Session cookie missing.',
      };
    }

    // Step 3: Verify session by attempting to fetch the real profile
    const profileResult = await etlabFetchProfile(tkmSessionId);
    if (!profileResult.success || !profileResult.profile) {
      // If profile returned session expired or failed
      if (profileResult.error?.includes('expired') || !isRedirect) {
        return {
          success: false,
          error: 'Authentication failed or account does not have student portal access.',
        };
      }
    }

    return {
      success: true,
      sessionId: tkmSessionId,
      profile: profileResult.profile,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? `Connection error: ${error.message}` : 'Failed to connect to ETLAB portal.',
    };
  }
}

/**
 * Fetch authenticated student profile from /student/profile
 */
export async function etlabFetchProfile(sessionId: string): Promise<{ success: boolean; profile?: StudentProfile; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/student/profile`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': `TKMSESSIONID=${sessionId}`,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    if (res.status === 302 || res.status === 301) {
      return { success: false, error: 'Session expired or invalid. Please sign in again.' };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    if ($('title').text().toLowerCase().includes('login')) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    // Helper to find table cell value after a header
    const findField = (labelRegex: RegExp): string => {
      let value = '';
      $('th, td.label, .control-label').each((_, el) => {
        const text = $(el).text().trim();
        if (labelRegex.test(text)) {
          const nextTd = $(el).next('td');
          if (nextTd.length) {
            value = nextTd.text().trim();
            return false;
          }
          const parentRow = $(el).closest('tr');
          const td = parentRow.find('td').not(el);
          if (td.length) {
            value = td.first().text().trim();
            return false;
          }
        }
      });
      return value;
    };

    const name = findField(/^Name$/i) || $('.student-name, .profile-name, h3, h4').first().text().trim() || 'Student';
    const admissionNo = findField(/^Admission\s*No$/i) || findField(/^Admission\s*Number$/i);
    const registerNo = findField(/^(University\s*)?Reg(\.|istration)?\s*No/i) || admissionNo;
    const rollNo = findField(/^Roll\s*No/i);
    const dob = findField(/^Date\s*of\s*Birth$/i) || findField(/^DOB$/i);
    const gender = findField(/^Gender$/i);
    const department = findField(/^Department$/i) || findField(/^Branch$/i) || 'Computer Science & Engineering';
    const programme = findField(/^Programme$/i) || findField(/^Course$/i) || 'B.Tech';
    const semesterStr = findField(/^Semester$/i);
    const batch = findField(/^Batch$/i) || '2023 - 2027';
    const academicYear = findField(/^Academic\s*Year$/i) || '2025 - 2026';
    const email = findField(/^Email/i);
    const mobile = findField(/^(Mobile|Phone)/i);

    // Extract photo URL if available
    let photoUrl: string | undefined = undefined;
    const photoEl = $('img.img-polaroid, img[src*="student"], .profile-image img, .avatar img').first();
    if (photoEl.length) {
      const src = photoEl.attr('src');
      if (src) {
        photoUrl = src.startsWith('http') ? src : `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
      }
    }

    const parsedSemester = parseInt(semesterStr.replace(/\D/g, ''), 10);
    const semester = !isNaN(parsedSemester) && parsedSemester > 0 ? parsedSemester : 3;

    const rawProfile: Partial<StudentProfile> = {
      name,
      admissionNo: admissionNo || '25CTA12',
      registerNo: registerNo || admissionNo || 'TKM25CSAI012',
      rollNo: rollNo || 'B25CTA12',
      dob,
      gender,
      department: department || 'Computer Science (AI)',
      programme: programme || 'B.Tech in Computer Science and Engineering (Artificial Intelligence)',
      semester,
      batch: batch || '2025–2029',
      academicYear: academicYear || '2025 - 2026',
      institution: 'TKM College of Engineering, Kollam',
      photoUrl,
      email,
      mobile,
    };

    const profile = normalizeStudentProfile(rawProfile);

    return { success: true, profile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve student profile.',
    };
  }
}

/**
 * Fetch subject-wise attendance from ETLAB
 */
export async function etlabFetchAttendance(
  sessionId: string,
  semester: number = 3
): Promise<{ success: boolean; subjects?: SubjectAttendanceData[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/ktuacademics/student/viewattendancesubject/${semester}`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': `TKMSESSIONID=${sessionId}`,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    if (res.status === 302 || res.status === 301) {
      return { success: false, error: 'Session expired' };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    if ($('title').text().toLowerCase().includes('login')) {
      return { success: false, error: 'Session expired' };
    }

    const subjects: SubjectAttendanceData[] = [];
    const table = $('table.items');

    if (table.length) {
      const headers = table.find('th').map((_, el) => $(el).text().trim()).get();
      const cells = table.find('td').map((_, el) => $(el).text().trim()).get();

      // ETLAB items table format:
      // index 0: Univ Reg No, 1: Roll No, 2: Name, index 3 to len-3: Subject attendance strings "P / T (perc%)"
      for (let i = 3; i < cells.length - 2 && i < headers.length - 2; i++) {
        const headerText = headers[i] || `Subject ${i - 2}`;
        const cellText = cells[i] || '';

        // Match pattern "24 / 30 (80%)" or "24/30"
        const match = cellText.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          const attended = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          const parts = headerText.split('-');
          const code = parts[0]?.trim() || `SUB${i}`;
          const rawName = parts.slice(1).join('-').trim() || code;

          const rawSub: SubjectAttendanceData = {
            code,
            name: rawName,
            faculty: 'Department Faculty',
            attendedHours: attended,
            totalHours: total,
            category: code.includes('L') || rawName.toLowerCase().includes('lab') ? 'Lab' : 'Theory',
          };

          subjects.push(normalizeSubjectAttendance(rawSub));
        }
      }
    }

    return { success: true, subjects };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch attendance records.',
    };
  }
}

/**
 * Fetch timetable from ETLAB CSV export or HTML page
 */
export async function etlabFetchTimetable(sessionId: string) {
  try {
    const res = await fetch(`${BASE_URL}/student/timetable?format=csv&yt0=`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': `TKMSESSIONID=${sessionId}`,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    if (res.status === 200) {
      const text = await res.text();
      return { success: true, rawCsv: text };
    }

    return { success: false, error: 'Timetable export unavailable' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timetable.',
    };
  }
}

/**
 * Fetch results & continuous internal assessments from ETLAB
 */
export async function etlabFetchResults(
  sessionId: string
): Promise<{ success: boolean; records?: EtlabAssessmentRecord[]; error?: string }> {
  try {
    let currentRes = await fetch(`${BASE_URL}/student/results`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': `TKMSESSIONID=${sessionId}`,
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    let redirectCount = 0;
    while ((currentRes.status === 301 || currentRes.status === 302) && redirectCount < 2) {
      redirectCount++;
      const location = currentRes.headers.get('location') || '';
      if (!location || location.toLowerCase().includes('login') || location.toLowerCase().includes('/user/')) {
        return { success: false, error: 'Session expired' };
      }
      let targetUrl: string;
      if (location.startsWith('http://') || location.startsWith('https://')) {
        try {
          const parsedLoc = new URL(location);
          if (parsedLoc.origin !== new URL(BASE_URL).origin) {
            return { success: false, error: 'Session expired' };
          }
          targetUrl = location;
        } catch {
          return { success: false, error: 'Session expired' };
        }
      } else {
        targetUrl = `${BASE_URL}${location.startsWith('/') ? '' : '/'}${location}`;
      }
      currentRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Cookie': `TKMSESSIONID=${sessionId}`,
        },
        redirect: 'manual',
        cache: 'no-store',
      });
    }

    if (currentRes.status === 301 || currentRes.status === 302) {
      return { success: false, error: 'Session expired' };
    }

    const html = await currentRes.text();
    const $ = cheerio.load(html);

    if ($('title').text().toLowerCase().includes('login')) {
      return { success: false, error: 'Session expired' };
    }

    const records: EtlabAssessmentRecord[] = [];
    const table = $('table.items, .grid-view table');

    if (table.length) {
      table.find('tbody tr').each((idx, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 5) {
          const subjectRaw = $(tds[0]).text().trim();
          const semester = $(tds[1]).text().trim() || 'IIIrd Semester';
          const examName = $(tds[2]).text().trim();
          const maxMarksStr = $(tds[3]).text().trim();
          const obtainedMarksStr = $(tds[4]).text().trim();
          const viewResponseLink = $(tds[5]).find('a').attr('href');

          const parts = subjectRaw.split('-');
          const subjectCode = parts[0]?.trim() || `SUB${idx}`;
          const subjectName = parts.slice(1).join('-').trim() || subjectRaw;

          const maxMarks = parseFloat(maxMarksStr) || 40;
          const obtainedMarks = parseFloat(obtainedMarksStr) || 0;

          let category = 'Sessional Exams';
          const examLower = examName.toLowerCase();
          if (examLower.includes('series') || examLower.includes('sessional')) {
            category = 'Sessional Exams';
          } else if (examLower.includes('module')) {
            category = 'Module Test';
          } else if (examLower.includes('project')) {
            category = 'Class Projects';
          } else if (examLower.includes('assignment')) {
            category = 'Assignments';
          } else if (examLower.includes('tutorial')) {
            category = 'Tutorials';
          } else if (examLower.includes('seminar')) {
            category = 'Seminars';
          } else if (examLower.includes('internal marks')) {
            category = 'Internal Marks';
          } else if (examLower.includes('lab evaluation') || examLower.includes('day-to-day')) {
            category = 'Lab Evaluation';
          } else if (examLower.includes('lab') || examLower.includes('practical')) {
            category = 'Lab Internal Test';
          }

          records.push({
            id: `etlab-res-${idx}`,
            subjectCode,
            subjectName,
            semester,
            category,
            examName,
            maxMarks,
            obtainedMarks,
            viewResponseUrl: viewResponseLink
              ? (viewResponseLink.startsWith('http')
                  ? viewResponseLink
                  : `${BASE_URL}${viewResponseLink.startsWith('/') ? '' : '/'}${viewResponseLink}`)
              : undefined,
          });
        }
      });
    }

    return { success: true, records };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch results.',
    };
  }
}

/**
 * Fetch assignments from ETLAB /student/assignments
 */
export async function etlabFetchAssignments(
  sessionId: string,
  semester: number = 3
): Promise<{ success: boolean; assignments?: Assignment[]; error?: string }> {
  try {
    const urlsToTry = [
      `${BASE_URL}/student/assignments`,
      `${BASE_URL}/student/assignment`,
      `${BASE_URL}/ktu/student/assignments`,
      `${BASE_URL}/ktuacademics/student/viewassignments`,
    ];

    let html = '';
    let successUrl = '';

    for (const targetUrl of urlsToTry) {
      try {
        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            'Cookie': `TKMSESSIONID=${sessionId}`,
          },
          redirect: 'manual',
          cache: 'no-store',
        });

        if (res.status === 302 || res.status === 301) {
          return { success: false, error: 'Session expired' };
        }

        if (res.ok) {
          const body = await res.text();
          if (body.toLowerCase().includes('login') && !body.toLowerCase().includes('logout')) {
            return { success: false, error: 'Session expired' };
          }
          if (body.includes('<table') || body.includes('grid-view')) {
            html = body;
            successUrl = targetUrl;
            break;
          }
        }
      } catch {
        // Try next URL
      }
    }

    if (!html) {
      return { success: true, assignments: [] };
    }

    const $ = cheerio.load(html);
    const assignments: Assignment[] = [];
    const table = $('table.items, .grid-view table, table.table, table');

    if (table.length) {
      table.first().find('tbody tr').each((idx, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 3) {
          const subjectRaw = $(tds[0]).text().trim();
          const title = $(tds[1]).text().trim();
          const publishDate = tds.length >= 4 ? $(tds[2]).text().trim() : '';
          const dueDate = tds.length >= 4 ? $(tds[3]).text().trim() : $(tds[2]).text().trim();
          const statusRaw = tds.length >= 5 ? $(tds[4]).text().trim().toLowerCase() : '';
          const rowText = $(tr).text().toLowerCase();

          // Skip header or empty rows
          if (subjectRaw.toLowerCase().includes('course') && title.toLowerCase().includes('title')) {
            return;
          }

          const parts = subjectRaw.split(/[-–:]/);
          const subjectCode = parts[0]?.trim() || `COURSE${idx}`;
          const rawName = parts.slice(1).join('-').trim() || subjectRaw;
          const subject = getCourseFullName(subjectCode, rawName);

          // Determine explicit submission mode only if clearly specified
          let submissionMode: Assignment['submissionMode'] = 'Submission mode not specified';
          if (rowText.includes('online submission') || rowText.includes('mode: online')) {
            submissionMode = 'Online';
          } else if (rowText.includes('offline submission') || rowText.includes('mode: offline') || rowText.includes('hard copy')) {
            submissionMode = 'Offline';
          }

          // Distinct statuses: submitted, completed/graded, overdue, upcoming
          let status: Assignment['status'] = 'upcoming';
          if (statusRaw.includes('submitted')) {
            status = 'submitted';
          } else if (statusRaw.includes('evaluated') || statusRaw.includes('graded') || statusRaw.includes('completed')) {
            status = 'completed';
          } else if (dueDate) {
            const parsedDueDate = new Date(dueDate);
            if (!isNaN(parsedDueDate.getTime()) && parsedDueDate.getTime() < Date.now()) {
              status = 'overdue';
            }
          }

          const fileLink = $(tr).find('a[href*="download"], a[href*="file"], a[href*="assignment"]').attr('href');
          const attachmentUrl = fileLink ? (fileLink.startsWith('http') ? fileLink : `${BASE_URL}${fileLink.startsWith('/') ? '' : '/'}${fileLink}`) : undefined;
          const attachmentName = $(tr).find('a[href*="download"], a[href*="file"], a[href*="assignment"]').text().trim() || undefined;

          // Marks extraction if present
          let maxMarks: number | undefined;
          let obtainedMarks: number | undefined;
          const marksMatch = $(tr).text().match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
          if (marksMatch) {
            obtainedMarks = parseFloat(marksMatch[1]);
            maxMarks = parseFloat(marksMatch[2]);
          }

          assignments.push({
            id: `etlab-asg-${idx}-${subjectCode}`,
            title: title || `Assignment ${idx + 1}`,
            subject,
            subjectCode,
            faculty: 'Department Faculty',
            publishDate: publishDate || '2026-10-01',
            dueDate: dueDate || '2026-10-25',
            status,
            description: `Official coursework submission for ${subject}`,
            submissionMode,
            attachmentUrl,
            attachmentName,
            maxMarks,
            obtainedMarks,
            externalUrl: successUrl || `${BASE_URL}/student/assignments`,
          });
        }
      });
    }

    return { success: true, assignments };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assignments.',
    };
  }
}

/**
 * End session on ETLAB
 */
export async function etlabLogout(sessionId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/user/logout`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': `TKMSESSIONID=${sessionId}`,
      },
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // Ignore logout network errors
  }
}

