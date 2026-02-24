const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('portal.db'); 

// Initialize OpenAI client for Gemini
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" 
});

const SYSTEM_PROMPT = `
You are a SQL expert for a medical SQLite database.
Tables:
- patients (patient_id, name, email, phone, gender, dob, reg_date)
- tests (id, p_id, test_name, test_value, unit, status, test_date)

Rules:
1. If patientId is 'ADMIN', you are in Analytics Mode. You can query ALL patients.
2. For "how many" requests, use COUNT(*). For averages, use ROUND(AVG(test_value), 2).
3. If patientId is a specific ID (e.g., 'P001'), ALWAYS include 'WHERE p_id = "P001"'.
4. ALWAYS use 'LIKE' for test names (e.g., test_name LIKE 'Vitamin D') for case-insensitivity.
5. Return ONLY raw SQL. No markdown formatting.
`;

app.post('/api/voice-query', async (req, res) => {
  const { transcript, patientId } = req.body;

  try {
    console.log("\n--- Request Received ---");
    console.log(`Role: ${patientId} | Query: ${transcript}`);

    const response = await openai.chat.completions.create({
      model: "gemini-3-flash-preview", // Latest 2026 model
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `ID: ${patientId}. Request: ${transcript}` }
      ],
      temperature: 0, 
    });

    let sqlQuery = response.choices[0].message.content.trim();
    sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').replace(/;/g, '').trim() + ";";

    console.log("Generated SQL:", sqlQuery);

    const results = db.prepare(sqlQuery).all();
    res.json({ success: true, data: results });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));