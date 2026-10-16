import * as cheerio from 'cheerio';
import { StudentProfile, SubjectAttendanceData } from '@/types';

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
    const semester = !isNaN(parsedSemester) && parsedSemester > 0 ? parsedSemester : 6;

    const profile: StudentProfile = {
      name,
      admissionNo: admissionNo || 'TKM-STUDENT',
      registerNo: registerNo || admissionNo || 'TKMCE',
      rollNo,
      dob,
      gender,
      department,
      programme,
      semester,
      batch,
      academicYear,
      institution: 'TKM College of Engineering, Kollam',
      photoUrl,
      email,
      mobile,
    };

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
  semester: number = 6
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
          const name = parts.slice(1).join('-').trim() || code;

          subjects.push({
            code,
            name,
            faculty: 'Department Faculty',
            attendedHours: attended,
            totalHours: total,
            category: code.includes('L') || name.toLowerCase().includes('lab') ? 'Lab' : 'Theory',
          });
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
