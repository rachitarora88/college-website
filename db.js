const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'college.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) {
      return reject(err);
    }
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
    } else {
      resolve(rows);
    }
  });
});

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      head_name TEXT,
      contact_email TEXT,
      image_url TEXT,
      published INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      department_id INTEGER,
      name TEXT NOT NULL,
      designation TEXT,
      email TEXT,
      bio TEXT,
      image_url TEXT,
      published INTEGER DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      degree_type TEXT,
      duration TEXT,
      eligibility TEXT,
      admission_process TEXT,
      curriculum_url TEXT,
      image_url TEXT,
      published INTEGER DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT,
      published_at TEXT,
      image_url TEXT,
      published INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      event_date TEXT,
      venue TEXT,
      image_url TEXT,
      published INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','student','faculty')),
      department_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      dob TEXT,
      address TEXT,
      previous_qualification TEXT,
      previous_institution TEXT,
      marks TEXT,
      program_applied TEXT,
      academic_year TEXT,
      status TEXT DEFAULT 'Submitted',
      reference_number TEXT UNIQUE,
      document_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      consent INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      subject TEXT,
      message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'New'
    )
  `);

  await seedSettings();
  await seedDefaultContent();
}

async function seedSettings() {
  const defaults = [
    ['site_name', 'Northwood College'],
    ['tagline', 'Empowering Minds. Inspiring Futures.'],
    ['email', 'admissions@northwoodcollege.edu'],
    ['phone', '+91 98765 43210'],
    ['address', '12 Scholars Avenue, Lakeview Campus, Bengaluru, India'],
    ['hero_title', 'Empowering Minds. Inspiring Futures.'],
    ['hero_description', 'A welcoming academic community dedicated to innovation, professional excellence, and student success.'],
    ['about_summary', 'Northwood College is a modern learning environment where students, faculty, and staff work together to create meaningful opportunities for growth, discovery, and leadership.'],
    ['copyright', '© 2026 Northwood College. All rights reserved.']
  ];

  for (const [key, value] of defaults) {
    const exists = await get('SELECT 1 FROM settings WHERE key = ?', [key]);
    if (!exists) {
      await run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }
}

async function seedDefaultContent() {
  const departmentCount = await get('SELECT COUNT(*) AS count FROM departments');
  if (departmentCount && departmentCount.count > 0) {
    return;
  }

  const adminHash = bcrypt.hashSync('admin123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);
  const facultyHash = bcrypt.hashSync('faculty123', 10);

  const csInsert = await run(`INSERT INTO departments (name, slug, description, head_name, contact_email, image_url, published) VALUES (?, ?, ?, ?, ?, ?, 1)`, ['Computer Science & Engineering', 'computer-science-engineering', 'The CSE department blends computer science fundamentals with industry-relevant programming, AI, data systems, and practical project work.', 'Dr. Meera Iyer', 'cse@northwoodcollege.edu', '/images/department-cse.jpg']);
  const mechInsert = await run(`INSERT INTO departments (name, slug, description, head_name, contact_email, image_url, published) VALUES (?, ?, ?, ?, ?, ?, 1)`, ['Mechanical Engineering', 'mechanical-engineering', 'Mechanical engineering students learn product design, automation, manufacturing systems, and sustainable practices through lab-driven instruction.', 'Prof. Arun Bhatia', 'mech@northwoodcollege.edu', '/images/department-mech.jpg']);
  const bbaInsert = await run(`INSERT INTO departments (name, slug, description, head_name, contact_email, image_url, published) VALUES (?, ?, ?, ?, ?, ?, 1)`, ['Business Administration', 'business-administration', 'The business programs focus on entrepreneurship, strategy, management, corporate communication, and real-world business decision-making.', 'Dr. Swati Rao', 'business@northwoodcollege.edu', '/images/department-bba.jpg']);
  const csId = csInsert.id;
  const mechId = mechInsert.id;
  const bbaId = bbaInsert.id;

  await run(`INSERT INTO faculty (user_id, department_id, name, designation, email, bio, image_url, published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [1, csId, 'Dr. Meera Iyer', 'Professor and HoD', 'meera.iyer@northwoodcollege.edu', 'Research interests include AI, distributed systems, and applied data science.', '/images/faculty-1.jpg']);
  await run(`INSERT INTO faculty (user_id, department_id, name, designation, email, bio, image_url, published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`, [2, bbaId, 'Dr. Swati Rao', 'Associate Professor', 'swati.rao@northwoodcollege.edu', 'Guides students in strategy, analytics, and entrepreneurship practice.', '/images/faculty-2.jpg']);

  await run(`INSERT INTO courses (department_id, title, slug, description, degree_type, duration, eligibility, admission_process, curriculum_url, image_url, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [csId, 'B.Tech in Computer Science and Engineering', 'btech-cse', 'A full-spectrum engineering program focused on software systems, algorithms, cybersecurity, and applied computing.', 'Undergraduate', '4 years', 'Higher secondary education with mathematics and physics', 'Merit-based selection and university application process', 'https://example.edu/curriculum/cse.pdf', '/images/course-cse.jpg']);
  await run(`INSERT INTO courses (department_id, title, slug, description, degree_type, duration, eligibility, admission_process, curriculum_url, image_url, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [mechId, 'B.Tech in Mechanical Engineering', 'btech-mechanical', 'Introduces students to thermodynamics, manufacturing, CAD, and sustainable system design.', 'Undergraduate', '4 years', 'Higher secondary education with physics and mathematics', 'Admission through qualifying exam and counseling', 'https://example.edu/curriculum/mech.pdf', '/images/course-mech.jpg']);
  await run(`INSERT INTO courses (department_id, title, slug, description, degree_type, duration, eligibility, admission_process, curriculum_url, image_url, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, [bbaId, 'BBA in Business Administration', 'bba-business', 'A business-focused program designed for future managers, entrepreneurs, and analysts.', 'Undergraduate', '3 years', '12th grade completion with strong communication skills', 'Application review and interview for shortlisted candidates', 'https://example.edu/curriculum/bba.pdf', '/images/course-bba.jpg']);

  await run(`INSERT INTO announcements (title, slug, content, published_at, image_url, published) VALUES (?, ?, ?, ?, ?, 1)`, ['Admission 2026 Open for Undergraduate Programs', 'admission-2026-open', 'Applications for undergraduate programs are now open. Prospective students can submit forms and check status after approval.', '2026-10-01', '/images/news-admissions.jpg']);
  await run(`INSERT INTO announcements (title, slug, content, published_at, image_url, published) VALUES (?, ?, ?, ?, ?, 1)`, ['Career Workshop with Placement Partners', 'career-workshop', 'A practical workshop on interview preparation and resume drafting will be held on campus next week.', '2026-10-13', '/images/news-career.jpg']);

  await run(`INSERT INTO events (title, slug, description, event_date, venue, image_url, published) VALUES (?, ?, ?, ?, ?, ?, 1)`, ['Campus Orientation Day', 'campus-orientation-day', 'New students and families are invited to experience campus life and learn about support services.', '2026-11-12', 'Main Auditorium', '/images/event-orientation.jpg']);
  await run(`INSERT INTO events (title, slug, description, event_date, venue, image_url, published) VALUES (?, ?, ?, ?, ?, ?, 1)`, ['Innovation & Research Expo', 'innovation-research-expo', 'A showcase of student innovation projects, prototypes, and applied research across disciplines.', '2026-12-03', 'Innovation Hub', '/images/event-expo.jpg']);

  await run(`INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)`, ['Admin User', 'admin@northwoodcollege.edu', adminHash, 'admin', null]);
  await run(`INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)`, ['Student User', 'student@northwoodcollege.edu', studentHash, 'student', csId]);
  await run(`INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)`, ['Faculty User', 'faculty@northwoodcollege.edu', facultyHash, 'faculty', csId]);

  await run(`INSERT INTO applications (applicant_name, email, phone, dob, address, previous_qualification, previous_institution, marks, program_applied, academic_year, status, reference_number, document_path, consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, ['Priya Nair', 'priya.nair@example.com', '9876543210', '2007-06-19', 'Bengaluru', 'Higher Secondary', 'Green Valley Academy', '93%', 'B.Tech in Computer Science and Engineering', '2026-27', 'Submitted', 'NWC-2026-1001', null]);
  await run(`INSERT INTO inquiries (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)`, ['Rohan Mehta', 'rohan@example.com', '9123456780', 'Admissions', 'Could you share the next intake dates and eligibility?', 'New']);
}

module.exports = {
  db,
  initializeDatabase,
  get,
  all,
  run,
};
