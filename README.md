# 🎓 ETPlus

**A cleaner, student-friendly interface for ETLAB.**

ETPlus is an independent student dashboard designed to make academic information easier to access, understand, and manage. It brings attendance insights, assignments, results, timetables, and shared study resources into one clean interface.

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

*Feature availability depends on the implementation and the data available to the authenticated student.*

## 🛠️ Tech Stack

ETPlus is built with modern web technologies, including:

- **Next.js 16** — React framework
- **React 19** — UI library
- **TypeScript** — Type-safe development
- **Tailwind CSS v4** — Styling
- **Recharts** — Charts and data visualization
- **Lucide React** — Icons
- **Cheerio** — HTML parsing

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) — Use a version compatible with the project.
- npm
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/adwaith620/ET-PLUS.git
cd ET-PLUS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Check the `.env.example` file for the environment variables required by the application.

Create a local `.env.local` file and configure the required values:

```bash
cp .env.example .env.local
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env.local
```

Replace placeholder values with your own authorized local configuration. Do not commit `.env.local`, real credentials, passwords, session cookies, API keys, or access tokens.

If the project requires an external authentication or data integration, configure it according to the relevant setup instructions.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

`http://localhost:3000`

### 5. Build for production

```bash
npm run build
```

Start the production build locally, if needed:

```bash
npm run start
```

## 🧪 Testing

Run the available test suite:

```bash
npm test
```

Additional scripts, such as linting or type checking, may be available. Check `package.json` for the commands supported by the current version of the project.

## 🔐 Security & Privacy

ETPlus is designed to handle student-specific academic information responsibly.

- Access to student data must be restricted to the authenticated student.
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

ETLAB, TKM College of Engineering, and other third-party names, trademarks, institutional content, and assets remain the property of their respective owners. The MIT License applies only to material that the project maintainer has the right to license.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Make your changes and test them locally.
4. Submit a pull request describing the changes.

Please avoid including credentials, private student information, or other sensitive data in commits and pull requests.

## 📄 License

ETPlus is licensed under the [MIT License](LICENSE).

You may use, copy, modify, distribute, and sublicense the covered software, subject to the license's terms, including retaining the required copyright and license notices.

See the [`LICENSE`](LICENSE) file for the complete license text.

---

Made with 💻 for a better student dashboard experience.
