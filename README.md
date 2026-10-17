# 🎓 ETPlus

**A cleaner, student-friendly interface for ETLAB.**

ETPlus is an independent student dashboard designed to make academic information easier to access, understand, and manage. It brings attendance insights, assignments, results, timetables, and shared study resources into one clean interface.

🌐 **Use ETPlus:** [et-plus.vercel.app](https://et-plus.vercel.app)

## ✨ Features

- 📊 **Attendance** — View attendance percentages and explore projected attendance with a what-if simulator.
- 📅 **Timetable** — Access your class schedule in an organized format.
- 📝 **Assignments** — Track assignment deadlines and submission statuses.
- 📚 **Study Materials** — Share and access previous question papers and study notes.
- 📈 **Results** — View available internal assessments and academic results.
- 🏆 **End-Sem Results** — Check published end-semester marks and grades.
- 📢 **Announcements** — Share and view updates with your student cohort.
- 👤 **Student Profile** — Access your profile and preferences.
- 🌙 **Dark Interface** — A minimal, responsive interface designed for everyday use.

*Feature availability depends on the data available to the authenticated student.*

## 🛠️ Tech Stack

- **Next.js 16** — React framework
- **React 19** — UI library
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Styling
- **Recharts** — Charts and data visualization
- **Lucide React** — Icons
- **Cheerio** — HTML parsing

## 🔐 Security & Privacy

ETPlus is designed to handle student-specific academic information responsibly.

- Student data should only be accessible to the authenticated student.
- Authentication and data access must use authorized mechanisms.
- Student sessions and upstream ETLAB sessions must be isolated appropriately.
- Credentials and session tokens must not be exposed in client-side code or committed to version control.
- Official academic records must come from authorized data sources.
- Shared study materials and announcements must follow the application's authentication and ownership rules.
- Attendance projections are informational calculations and must not modify official attendance records.

Never use ETPlus to access another student's private academic information without authorization.

## ⚠️ Disclaimer

ETPlus is an independent, student-focused project and is **not affiliated with, endorsed by, or an official product of ETLAB or TKM College of Engineering**.

ETLAB remains the source of truth for official academic records. Use ETPlus only with authorized access and in accordance with applicable platform rules.

ETLAB, TKM College of Engineering, and other third-party names, trademarks, institutional content, and assets remain the property of their respective owners.

## 📄 License

See the [LICENSE file](LICENSE) for the project's licensing terms.

---

Made with 💻 for a better student dashboard experience.
