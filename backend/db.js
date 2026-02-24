const Database = require('better-sqlite3');
const fs = require('fs');

// Create the database file
const db = new Database('portal.db');

// Create the tables
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    gender TEXT,
    dob TEXT,
    reg_date TEXT
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    p_id TEXT,
    test_name TEXT,
    test_value REAL,
    unit TEXT,
    status TEXT,
    test_date TEXT,
    FOREIGN KEY(p_id) REFERENCES patients(patient_id)
  );
`);

// Load the JSON data
const patientsData = JSON.parse(fs.readFileSync('./patients.json', 'utf8'));
const testsData = JSON.parse(fs.readFileSync('./tests.json', 'utf8'));

// Prepare the insert statements
const insertPatient = db.prepare(`
  INSERT INTO patients (patient_id, name, email, phone, gender, dob, reg_date)
  VALUES (@patient_id, @name, @email, @phone, @gender, @dob, @reg_date)
`);

const insertTest = db.prepare(`
  INSERT INTO tests (p_id, test_name, test_value, unit, status, test_date)
  VALUES (@p_id, @test, @val, @unit, @stat, @date)
`);

// Insert the data efficiently
const seedDatabase = db.transaction((patients, tests) => {
  for (const patient of patients) insertPatient.run(patient);
  for (const test of tests) insertTest.run(test);
});

try {
  seedDatabase(patientsData, testsData);
  console.log('Database successfully seeded!');
} catch (err) {
  console.error('Error seeding database:', err);
}

module.exports = db;