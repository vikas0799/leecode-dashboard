# LeetCode Dashboard 📊

A real-time web dashboard to track and analyze LeetCode problem-solving progress of students across colleges. Built for coding clubs, mentors, and institutions to monitor performance, compare rankings, and export insights effortlessly.

---

## 🚀 Features

### 👨‍🎓 Student Tracking

* Live LeetCode statistics using public GraphQL API
* Difficulty-wise problem breakdown (Easy / Medium / Hard)
* Total solved problems count
* Global LeetCode ranking

### 🏫 Organization & Filtering

* Group students by college
* Search students by username
* Filter by college using dropdown
* Sort by:

  * Username
  * College
  * Easy / Medium / Hard problems
  * Total solved
  * Global ranking

### 🗂 Data Management

* Add or remove LeetCode usernames from UI
* Persistent storage using local JSON file
* Export filtered or full data to Excel (.xlsx)

### 🎨 User Interface

* Fully responsive design (mobile + desktop)
* Built with Tailwind CSS
* Auto-refresh data every 30 seconds

---

## 🛠 Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Framework  | Next.js 15 (App Router) |
| UI Library | React 19                |
| Language   | TypeScript              |
| Styling    | Tailwind CSS 4          |
| API        | LeetCode GraphQL        |
| Export     | xlsx                    |

---

## 📁 Project Structure

```
leetcode-dashboard/
├── data/
│   └── usernames.json       # Student usernames & colleges
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── leetcode/    # Fetch LeetCode stats
│   │   │   └── usernames/   # Read/write usernames JSON
│   │   └── page.tsx         # Main dashboard UI
│   └── lib/
│       └── leetcode.ts      # GraphQL queries & helpers
```

---

## 🔄 Data Flow

1. Dashboard loads usernames from `/api/usernames`
2. Usernames are sent to `/api/leetcode`
3. Backend fetches data from LeetCode GraphQL API
4. Results stored in React state
5. Filtering & sorting handled client-side for instant UI updates

---

## 📄 Data Format (`data/usernames.json`)

### ✅ Recommended (Grouped by College)

```json
{
  "HITECH": [
    { "college": "HITECH", "username": "user1" }
  ],
  "RGIB": [
    { "college": "RGIB", "username": "user2" }
  ]
}
```

### 🕰 Legacy Format

```json
["user1", "user2"]
```

> Note: Users added from UI may not have college mapping by default.

---

## ⚙️ Setup & Installation

### Prerequisites

* Node.js v18+
* npm or yarn

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open: `http://localhost:3000`

---

## 🏗 Production Build

```bash
npm run build
npm start
```

---

## 📤 Exporting Data

* Click **Download Excel** to export:

  * All students, or
  * Currently filtered students
* File generated in `.xlsx` format

---

## 🔮 Future Enhancements

* Authentication & role-based access
* Admin panel
* Cloud database (Supabase / Firebase)
* Analytics & charts
* Daily / weekly progress tracking
* Leaderboards & notifications

---

## 🎯 Use Cases

* College coding clubs
* Placement preparation batches
* Mentorship programs
* EdTech platforms
* Competitive programming tracking

---

## 👤 Author

**Vikas Patel**
Full Stack Developer | Educator | Mentor

---

⭐ If you find this project useful, consider giving it a star on GitHub!
