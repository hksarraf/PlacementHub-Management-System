const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const db = new Database("placementhub.db");

const JWT_SECRET = "placementhub_secret_key";

/* ================= DATABASE ================= */

db.exec(
    "CREATE TABLE IF NOT EXISTS users (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "name TEXT NOT NULL," +
    "email TEXT UNIQUE NOT NULL," +
    "password TEXT NOT NULL," +
    "role TEXT NOT NULL DEFAULT 'student'," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP" +
    ")"
);

db.exec(
    "CREATE TABLE IF NOT EXISTS applications (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "user_id INTEGER NOT NULL," +
    "company TEXT NOT NULL," +
    "role TEXT NOT NULL," +
    "package TEXT NOT NULL DEFAULT ''," +
    "date TEXT NOT NULL," +
    "status TEXT NOT NULL," +
    "notes TEXT DEFAULT ''," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
    ")"
);

db.exec(
    "CREATE TABLE IF NOT EXISTS companies (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "user_id INTEGER NOT NULL," +
    "name TEXT NOT NULL," +
    "industry TEXT DEFAULT ''," +
    "role TEXT DEFAULT ''," +
    "package TEXT DEFAULT ''," +
    "location TEXT DEFAULT ''," +
    "website TEXT DEFAULT ''," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
    ")"
);

db.exec(
    "CREATE TABLE IF NOT EXISTS interviews (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "user_id INTEGER NOT NULL," +
    "company TEXT NOT NULL," +
    "role TEXT DEFAULT ''," +
    "date TEXT NOT NULL," +
    "time TEXT DEFAULT ''," +
    "mode TEXT DEFAULT ''," +
    "status TEXT DEFAULT ''," +
    "location TEXT DEFAULT ''," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
    ")"
);

db.exec(
    "CREATE TABLE IF NOT EXISTS profiles (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "user_id INTEGER UNIQUE NOT NULL," +
    "course TEXT DEFAULT ''," +
    "college TEXT DEFAULT ''," +
    "skills TEXT DEFAULT ''," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
    ")"
);

/* ================= AUTH MIDDLEWARE ================= */

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authentication required."
        });
    }

    const parts = authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            message: "Invalid authorization format."
        });
    }

    const token = parts[1];

    try {

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}

/* ================= HOME ================= */

app.get("/", function (req, res) {

    res.json({
        message: "PlacementHub backend is running",
        status: "success"
    });

});

/* ================= SIGNUP ================= */

app.post("/api/signup", async function (req, res) {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                message: "All fields are required."
            });

        }

        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Password must contain at least 6 characters."
            });

        }

        const existingUser =
            db.prepare(
                "SELECT id FROM users WHERE email = ?"
            ).get(email);

        if (existingUser) {

            return res.status(409).json({
                message: "Email already registered."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result =
            db.prepare(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
            ).run(
                name,
                email,
                hashedPassword,
                "student"
            );

        res.status(201).json({
            message: "Signup successful.",
            userId: result.lastInsertRowid
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});

/* ================= LOGIN ================= */

app.post("/api/login", async function (req, res) {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                message: "Email and password are required."
            });

        }

        const user =
            db.prepare(
                "SELECT * FROM users WHERE email = ?"
            ).get(email);

        if (!user) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                message: "Invalid email or password."
            });

        }

        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

        res.json({
            message: "Login successful.",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
        });

    }

});

/* ================= APPLICATIONS ================= */

app.get(
    "/api/applications",
    authenticateToken,
    function (req, res) {

        const applications =
            db.prepare(
                "SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC"
            ).all(req.user.id);

        res.json(applications);

    }
);

app.post(
    "/api/applications",
    authenticateToken,
    function (req, res) {

        const {
            company,
            role,
            package: packageValue,
            date,
            status,
            notes
        } = req.body;

        if (
            !company ||
            !role ||
            !date ||
            !status
        ) {

            return res.status(400).json({
                message: "Required fields are missing."
            });

        }

        const result =
            db.prepare(
                "INSERT INTO applications " +
                "(user_id, company, role, package, date, status, notes) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).run(
                req.user.id,
                company,
                role,
                packageValue || "",
                date,
                status,
                notes || ""
            );

        const application =
            db.prepare(
                "SELECT * FROM applications WHERE id = ?"
            ).get(result.lastInsertRowid);

        res.status(201).json(application);

    }
);

app.put(
    "/api/applications/:id",
    authenticateToken,
    function (req, res) {

        const {
            company,
            role,
            package: packageValue,
            date,
            status,
            notes
        } = req.body;

        const result =
            db.prepare(
                "UPDATE applications SET " +
                "company = ?, role = ?, package = ?, date = ?, status = ?, notes = ? " +
                "WHERE id = ? AND user_id = ?"
            ).run(
                company,
                role,
                packageValue || "",
                date,
                status,
                notes || "",
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Application not found."
            });

        }

        const application =
            db.prepare(
                "SELECT * FROM applications WHERE id = ?"
            ).get(req.params.id);

        res.json(application);

    }
);

app.delete(
    "/api/applications/:id",
    authenticateToken,
    function (req, res) {

        const result =
            db.prepare(
                "DELETE FROM applications WHERE id = ? AND user_id = ?"
            ).run(
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Application not found."
            });

        }

        res.json({
            message: "Application deleted successfully."
        });

    }
);

/* ================= COMPANIES ================= */

app.get(
    "/api/companies",
    authenticateToken,
    function (req, res) {

        const companies =
            db.prepare(
                "SELECT * FROM companies WHERE user_id = ? ORDER BY id DESC"
            ).all(req.user.id);

        res.json(companies);

    }
);

app.post(
    "/api/companies",
    authenticateToken,
    function (req, res) {

        const {
            name,
            industry,
            role,
            package: packageValue,
            location,
            website
        } = req.body;

        if (!name) {

            return res.status(400).json({
                message: "Company name is required."
            });

        }

        const result =
            db.prepare(
                "INSERT INTO companies " +
                "(user_id, name, industry, role, package, location, website) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).run(
                req.user.id,
                name,
                industry || "",
                role || "",
                packageValue || "",
                location || "",
                website || ""
            );

        const company =
            db.prepare(
                "SELECT * FROM companies WHERE id = ?"
            ).get(result.lastInsertRowid);

        res.status(201).json(company);

    }
);

app.put(
    "/api/companies/:id",
    authenticateToken,
    function (req, res) {

        const {
            name,
            industry,
            role,
            package: packageValue,
            location,
            website
        } = req.body;

        const result =
            db.prepare(
                "UPDATE companies SET " +
                "name = ?, industry = ?, role = ?, package = ?, location = ?, website = ? " +
                "WHERE id = ? AND user_id = ?"
            ).run(
                name,
                industry || "",
                role || "",
                packageValue || "",
                location || "",
                website || "",
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Company not found."
            });

        }

        const company =
            db.prepare(
                "SELECT * FROM companies WHERE id = ?"
            ).get(req.params.id);

        res.json(company);

    }
);

app.delete(
    "/api/companies/:id",
    authenticateToken,
    function (req, res) {

        const result =
            db.prepare(
                "DELETE FROM companies WHERE id = ? AND user_id = ?"
            ).run(
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Company not found."
            });

        }

        res.json({
            message: "Company deleted successfully."
        });

    }
);

/* ================= INTERVIEWS ================= */

app.get(
    "/api/interviews",
    authenticateToken,
    function (req, res) {

        const interviews =
            db.prepare(
                "SELECT * FROM interviews WHERE user_id = ? ORDER BY id DESC"
            ).all(req.user.id);

        res.json(interviews);

    }
);

app.post(
    "/api/interviews",
    authenticateToken,
    function (req, res) {

        const {
            company,
            role,
            date,
            time,
            mode,
            status,
            location
        } = req.body;

        if (!company || !date) {

            return res.status(400).json({
                message: "Company and date are required."
            });

        }

        const result =
            db.prepare(
                "INSERT INTO interviews " +
                "(user_id, company, role, date, time, mode, status, location) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ).run(
                req.user.id,
                company,
                role || "",
                date,
                time || "",
                mode || "",
                status || "",
                location || ""
            );

        const interview =
            db.prepare(
                "SELECT * FROM interviews WHERE id = ?"
            ).get(result.lastInsertRowid);

        res.status(201).json(interview);

    }
);

app.put(
    "/api/interviews/:id",
    authenticateToken,
    function (req, res) {

        const {
            company,
            role,
            date,
            time,
            mode,
            status,
            location
        } = req.body;

        const result =
            db.prepare(
                "UPDATE interviews SET " +
                "company = ?, role = ?, date = ?, time = ?, mode = ?, status = ?, location = ? " +
                "WHERE id = ? AND user_id = ?"
            ).run(
                company,
                role || "",
                date,
                time || "",
                mode || "",
                status || "",
                location || "",
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Interview not found."
            });

        }

        const interview =
            db.prepare(
                "SELECT * FROM interviews WHERE id = ?"
            ).get(req.params.id);

        res.json(interview);

    }
);

app.delete(
    "/api/interviews/:id",
    authenticateToken,
    function (req, res) {

        const result =
            db.prepare(
                "DELETE FROM interviews WHERE id = ? AND user_id = ?"
            ).run(
                req.params.id,
                req.user.id
            );

        if (result.changes === 0) {

            return res.status(404).json({
                message: "Interview not found."
            });

        }

        res.json({
            message: "Interview deleted successfully."
        });

    }
);

/* ================= PROFILE ================= */

app.get(
    "/api/profile",
    authenticateToken,
    function (req, res) {

        const user =
            db.prepare(
                "SELECT id, name, email, role FROM users WHERE id = ?"
            ).get(req.user.id);

        if (!user) {

            return res.status(404).json({
                message: "User not found."
            });

        }

        const profile =
            db.prepare(
                "SELECT course, college, skills FROM profiles WHERE user_id = ?"
            ).get(req.user.id);

        res.json({
            profile: {
                name: user.name,
                email: user.email,
                course: profile ? profile.course : "",
                college: profile ? profile.college : "",
                skills: profile ? profile.skills : ""
            }
        });

    }
);

app.put(
    "/api/profile",
    authenticateToken,
    function (req, res) {

        const {
            name,
            email,
            course,
            college,
            skills
        } = req.body;

        if (!name || !email) {

            return res.status(400).json({
                message: "Name and email are required."
            });

        }

        const existingUser =
            db.prepare(
                "SELECT id FROM users WHERE email = ? AND id != ?"
            ).get(
                email,
                req.user.id
            );

        if (existingUser) {

            return res.status(409).json({
                message: "Email already exists."
            });

        }

        const updateUser =
            db.prepare(
                "UPDATE users SET name = ?, email = ? WHERE id = ?"
            );

        const upsertProfile =
            db.prepare(
                "INSERT INTO profiles " +
                "(user_id, course, college, skills) " +
                "VALUES (?, ?, ?, ?) " +
                "ON CONFLICT(user_id) DO UPDATE SET " +
                "course = excluded.course, " +
                "college = excluded.college, " +
                "skills = excluded.skills, " +
                "updated_at = CURRENT_TIMESTAMP"
            );

        const transaction =
            db.transaction(function () {

                updateUser.run(
                    name,
                    email,
                    req.user.id
                );

                upsertProfile.run(
                    req.user.id,
                    course || "",
                    college || "",
                    skills || ""
                );

            });

        transaction();

        res.json({
            message: "Profile updated successfully.",
            profile: {
                name: name,
                email: email,
                course: course || "",
                college: college || "",
                skills: skills || ""
            }
        });

    }
);

/* ================= SETTINGS ================= */

/* Change Password */

app.put(
    "/api/change-password",
    authenticateToken,
    async function (req, res) {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;

            if (!currentPassword || !newPassword) {

                return res.status(400).json({
                    message:
                        "Current password and new password are required."
                });

            }

            if (newPassword.length < 6) {

                return res.status(400).json({
                    message:
                        "New password must contain at least 6 characters."
                });

            }

            if (currentPassword === newPassword) {

                return res.status(400).json({
                    message:
                        "New password must be different from current password."
                });

            }

            const user =
                db.prepare(
                    "SELECT password FROM users WHERE id = ?"
                ).get(req.user.id);

            if (!user) {

                return res.status(404).json({
                    message: "User not found."
                });

            }

            const passwordMatch =
                await bcrypt.compare(
                    currentPassword,
                    user.password
                );

            if (!passwordMatch) {

                return res.status(401).json({
                    message:
                        "Current password is incorrect."
                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            db.prepare(
                "UPDATE users SET password = ? WHERE id = ?"
            ).run(
                hashedPassword,
                req.user.id
            );

            res.json({
                message:
                    "Password updated successfully."
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Server error."
            });

        }

    }
);

/* Clear Applications */

app.delete(
    "/api/applications/all",
    authenticateToken,
    function (req, res) {

        db.prepare(
            "DELETE FROM applications WHERE user_id = ?"
        ).run(req.user.id);

        res.json({
            message:
                "Applications cleared successfully."
        });

    }
);

/* Clear Companies */

app.delete(
    "/api/companies/all",
    authenticateToken,
    function (req, res) {

        db.prepare(
            "DELETE FROM companies WHERE user_id = ?"
        ).run(req.user.id);

        res.json({
            message:
                "Companies cleared successfully."
        });

    }
);

/* Clear Interviews */

app.delete(
    "/api/interviews/all",
    authenticateToken,
    function (req, res) {

        db.prepare(
            "DELETE FROM interviews WHERE user_id = ?"
        ).run(req.user.id);

        res.json({
            message:
                "Interviews cleared successfully."
        });

    }
);

/* Clear Profile */

app.delete(
    "/api/profile",
    authenticateToken,
    function (req, res) {

        db.prepare(
            "DELETE FROM profiles WHERE user_id = ?"
        ).run(req.user.id);

        res.json({
            message:
                "Profile data cleared successfully."
        });

    }
);

/* Clear All Project Data */

app.delete(
    "/api/data/all",
    authenticateToken,
    function (req, res) {

        const transaction =
            db.transaction(function () {

                db.prepare(
                    "DELETE FROM applications WHERE user_id = ?"
                ).run(req.user.id);

                db.prepare(
                    "DELETE FROM companies WHERE user_id = ?"
                ).run(req.user.id);

                db.prepare(
                    "DELETE FROM interviews WHERE user_id = ?"
                ).run(req.user.id);

                db.prepare(
                    "DELETE FROM profiles WHERE user_id = ?"
                ).run(req.user.id);

            });

        transaction();

        res.json({
            message:
                "All project data cleared successfully."
        });

    }
);

/* ================= SERVER ================= */
require("./admin")(app, db, authenticateToken);

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {

    console.log(
        `PlacementHub backend running on port ${PORT}`
    );

});