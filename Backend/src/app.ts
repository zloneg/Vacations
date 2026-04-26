import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import multer from "multer";
import { execute } from "./01-utils/dal";
import { verifyLoggedIn } from "./02-middleware/verifyLoggedIn";
import { verifyAdmin } from "./02-middleware/verifyAdmin";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "../uploads");
const frontendImagesDir = path.join(__dirname, "../../Frontend/public/images");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"));
  }
});

app.use("/images", express.static(uploadDir));
app.use("/images", express.static(frontendImagesDir));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function createToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "7d" }
  );
}

function getVacationImageValue(req: any): string {
  if (req.file) {
    return req.file.filename;
  }

  if (req.body.imageUrl?.trim()) {
    return req.body.imageUrl.trim();
  }

  if (req.body.imageName?.trim()) {
    return req.body.imageName.trim();
  }

  return "";
}

app.get("/api/test", (_req, res) => {
  res.json({ message: "Backend is working" });
});

app.get("/api/users", verifyLoggedIn, verifyAdmin, async (_req, res) => {
  try {
    const sql = "SELECT id, firstName, lastName, email, role FROM users";
    const users = await execute(sql);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/vacations", verifyLoggedIn, async (_req, res) => {
  try {
    const sql = `
      SELECT 
        v.id,
        v.destination,
        v.description,
        v.startDate,
        v.endDate,
        v.price,
        v.imageName,
        COUNT(l.userId) AS likesCount
      FROM vacations v
      LEFT JOIN likes l ON v.id = l.vacationId
      GROUP BY 
        v.id,
        v.destination,
        v.description,
        v.startDate,
        v.endDate,
        v.price,
        v.imageName
      ORDER BY v.startDate ASC
    `;

    const vacations = await execute(sql);
    res.json(vacations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/vacations/:id", verifyLoggedIn, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const sql = `
      SELECT id, destination, description, startDate, endDate, price, imageName
      FROM vacations
      WHERE id = ?
    `;

    const vacations: any = await execute(sql, [id]);

    if (vacations.length === 0) {
      res.status(404).json({ message: "Vacation not found" });
      return;
    }

    res.json(vacations[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/vacations", verifyLoggedIn, verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const destination = req.body.destination?.trim();
    const description = req.body.description?.trim();
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const price = Number(req.body.price);
    const imageName = getVacationImageValue(req);

    if (!destination || !description || !startDate || !endDate || !imageName) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    if (Number.isNaN(price) || price < 0 || price > 10000) {
      res.status(400).json({ message: "Price must be between 0 and 10000" });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      res.status(400).json({ message: "End date cannot be earlier than start date" });
      return;
    }

    const sql = `
      INSERT INTO vacations (destination, description, startDate, endDate, price, imageName)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result: any = await execute(sql, [
      destination,
      description,
      startDate,
      endDate,
      price,
      imageName
    ]);

    res.status(201).json({
      message: "Vacation added successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/vacations/:id", verifyLoggedIn, verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const destination = req.body.destination?.trim();
    const description = req.body.description?.trim();
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const price = Number(req.body.price);
    const imageName = getVacationImageValue(req);

    if (!destination || !description || !startDate || !endDate || !imageName) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    if (Number.isNaN(price) || price < 0 || price > 10000) {
      res.status(400).json({ message: "Price must be between 0 and 10000" });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      res.status(400).json({ message: "End date cannot be earlier than start date" });
      return;
    }

    const sql = `
      UPDATE vacations
      SET destination = ?, description = ?, startDate = ?, endDate = ?, price = ?, imageName = ?
      WHERE id = ?
    `;

    const result: any = await execute(sql, [
      destination,
      description,
      startDate,
      endDate,
      price,
      imageName,
      id
    ]);

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Vacation not found" });
      return;
    }

    res.json({ message: "Vacation updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/vacations/:id", verifyLoggedIn, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const sql = `
      DELETE FROM vacations
      WHERE id = ?
    `;

    const result: any = await execute(sql, [id]);

    if (result.affectedRows === 0) {
      res.status(404).json({ message: "Vacation not found" });
      return;
    }

    res.json({ message: "Vacation deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/likes/:userId", verifyLoggedIn, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const sql = `
      SELECT vacationId
      FROM likes
      WHERE userId = ?
    `;

    const likedVacations = await execute(sql, [userId]);
    res.json(likedVacations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/likes/:vacationId/:userId", verifyLoggedIn, async (req, res) => {
  try {
    const vacationId = Number(req.params.vacationId);
    const userId = Number(req.params.userId);

    const sql = `
      INSERT INTO likes (userId, vacationId)
      VALUES (?, ?)
    `;

    await execute(sql, [userId, vacationId]);

    res.status(201).json({ message: "Like added" });
  } catch (error: any) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ message: "Like already exists" });
      return;
    }

    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/likes/:vacationId/:userId", verifyLoggedIn, async (req, res) => {
  try {
    const vacationId = Number(req.params.vacationId);
    const userId = Number(req.params.userId);

    const sql = `
      DELETE FROM likes
      WHERE userId = ? AND vacationId = ?
    `;

    await execute(sql, [userId, vacationId]);

    res.json({ message: "Like removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/reports/summary", verifyLoggedIn, verifyAdmin, async (_req, res) => {
  try {
    const usersSql = `SELECT COUNT(*) AS count FROM users`;
    const vacationsSql = `SELECT COUNT(*) AS count FROM vacations`;
    const likesSql = `SELECT COUNT(*) AS count FROM likes`;

    const usersResult: any = await execute(usersSql);
    const vacationsResult: any = await execute(vacationsSql);
    const likesResult: any = await execute(likesSql);

    res.json({
      usersCount: usersResult[0].count,
      vacationsCount: vacationsResult[0].count,
      likesCount: likesResult[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/reports/vacations-csv", verifyLoggedIn, verifyAdmin, async (_req, res) => {
  try {
    const sql = `
      SELECT 
        v.destination,
        COUNT(l.userId) AS likesCount
      FROM vacations v
      LEFT JOIN likes l ON v.id = l.vacationId
      GROUP BY v.id, v.destination
      ORDER BY v.startDate ASC
    `;

    const vacations: any = await execute(sql);

    const headers = ["Destination", "Likes"];
    const rows = vacations.map((vacation: any) => `${vacation.destination};${vacation.likesCount}`);

    const csv = [headers.join(";"), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="vacation-likes-report.csv"');
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/ai/recommendation", verifyLoggedIn, async (req, res) => {
  try {
    const { destination } = req.body;

    if (!destination || !destination.trim()) {
      res.status(400).json({ message: "Destination is required" });
      return;
    }

    const cleanDestination = destination.trim();

    const fallbackRecommendation = {
      title: `${cleanDestination} Vacation Recommendations`,
      subtitle: "A personalized travel inspiration",
      intro:
        `${cleanDestination} can be a wonderful destination depending on your travel style. Try to combine major landmarks, local food, walking routes, and one or two relaxing moments during the trip.`,
      highlights: [
        "Start with the city’s main landmark or historic center",
        "Try local cuisine in non-touristy places",
        "Add one scenic viewpoint or waterfront walk",
        "Leave free time for spontaneous discoveries"
      ],
      tips: [
        "Check weather before planning your daily route",
        "Book popular attractions early if needed",
        "Balance sightseeing with rest so the trip stays enjoyable"
      ]
    };

    const response = await openai.responses.create({
      model: "gpt-5",
      text: {
        format: { type: "json_object" }
      },
      input: `
You are a travel recommendation assistant.
Return ONLY valid JSON.
No markdown.
No extra text.

JSON structure:
{
  "title": "string",
  "subtitle": "string",
  "intro": "string",
  "highlights": ["string", "string", "string", "string"],
  "tips": ["string", "string", "string"]
}

Create a short vacation recommendation for ${cleanDestination}.
Make it warm, practical, and travel-friendly.
Use clear English.
Give exactly 4 highlights and exactly 3 tips.
      `.trim()
    });

    const rawText = response.output_text;

    if (!rawText) {
      res.json(fallbackRecommendation);
      return;
    }

    try {
      const parsed = JSON.parse(rawText);

      if (
        !parsed.title ||
        !parsed.subtitle ||
        !parsed.intro ||
        !Array.isArray(parsed.highlights) ||
        !Array.isArray(parsed.tips)
      ) {
        res.json(fallbackRecommendation);
        return;
      }

      res.json({
        title: parsed.title,
        subtitle: parsed.subtitle,
        intro: parsed.intro,
        highlights: parsed.highlights.slice(0, 4),
        tips: parsed.tips.slice(0, 3)
      });
    } catch {
      res.json(fallbackRecommendation);
    }
  } catch (error: any) {
    console.error(error);

    if (error?.status === 401) {
      res.status(500).json({ message: "OpenAI API key is invalid or missing" });
      return;
    }

    res.status(500).json({ message: "Failed to get AI recommendation" });
  }
});

app.post("/api/mcp/ask", verifyLoggedIn, async (req, res) => {
  try {
    const question = req.body.question?.trim();

    if (!question) {
      res.status(400).json({ message: "Question is required" });
      return;
    }

    const vacations: any[] = await execute(`
      SELECT
        v.id,
        v.destination,
        v.description,
        v.startDate,
        v.endDate,
        v.price,
        v.imageName,
        COUNT(l.userId) AS likesCount
      FROM vacations v
      LEFT JOIN likes l ON v.id = l.vacationId
      GROUP BY
        v.id,
        v.destination,
        v.description,
        v.startDate,
        v.endDate,
        v.price,
        v.imageName
      ORDER BY v.startDate ASC
    `);

    const response = await openai.responses.create({
      model: "gpt-5",
      input: `
You are a vacations database assistant.

Answer ONLY based on the database below.
If the answer is not available in the data, clearly say:
"The information is not available in the vacations database."

Today's date is ${new Date().toISOString().slice(0, 10)}.

Vacations database:
${JSON.stringify(vacations, null, 2)}

User question:
${question}
      `.trim()
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      res.json({ answer: "No answer was generated." });
      return;
    }

    res.json({ answer });
  } catch (error: any) {
    console.error(error);

    if (error?.status === 401) {
      res.status(500).json({ message: "OpenAI API key is invalid or missing" });
      return;
    }

    res.status(500).json({ message: "Failed to process MCP question" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Invalid email" });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ message: "Password must be at least 4 characters" });
      return;
    }

    const checkSql = "SELECT * FROM users WHERE email = ?";
    const existingUsers: any = await execute(checkSql, [email]);

    if (existingUsers.length > 0) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO users (firstName, lastName, email, password, role)
      VALUES (?, ?, ?, ?, 'user')
    `;

    const result: any = await execute(insertSql, [
      firstName,
      lastName,
      email,
      hashedPassword
    ]);

    const newUser = {
      id: result.insertId,
      firstName,
      lastName,
      email,
      role: "user"
    };

    const token = createToken(newUser);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: newUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    const users: any = await execute(sql, [email]);

    if (users.length === 0) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const user = users[0];

    let isPasswordValid = false;

    if (typeof user.password === "string" && user.password.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const safeUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);

    res.json({
      message: "Login successful",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database error" });
  }
});

export default app;