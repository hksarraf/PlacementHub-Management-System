const bcrypt = require("bcryptjs");

module.exports = function (app, db, authenticateToken) {

    /* ================= ADMIN CHECK ================= */

    function authenticateAdmin(req, res, next) {

        authenticateToken(req, res, function () {

            if (req.user.role !== "admin") {

                return res.status(403).json({
                    message: "Admin access required."
                });

            }

            next();

        });

    }


    /* ================= ADMIN DASHBOARD ================= */

    app.get(
        "/api/admin/stats",
        authenticateAdmin,
        function (req, res) {

            const students =
                db.prepare(
                    "SELECT COUNT(*) AS count FROM users WHERE role = 'student'"
                ).get().count;

            const applications =
                db.prepare(
                    "SELECT COUNT(*) AS count FROM applications"
                ).get().count;

            const companies =
                db.prepare(
                    "SELECT COUNT(*) AS count FROM companies"
                ).get().count;

            const interviews =
                db.prepare(
                    "SELECT COUNT(*) AS count FROM interviews"
                ).get().count;

            const selected =
                db.prepare(
                    "SELECT COUNT(*) AS count FROM applications WHERE status = 'Selected'"
                ).get().count;

            res.json({
                students,
                applications,
                companies,
                interviews,
                selected
            });

        }
    );


    /* ================= ALL STUDENTS ================= */

    app.get(
        "/api/admin/students",
        authenticateAdmin,
        function (req, res) {

            const students =
                db.prepare(
                    "SELECT id, name, email, created_at FROM users WHERE role = 'student' ORDER BY id DESC"
                ).all();

            res.json(students);

        }
    );


    /* ================= STUDENT DETAILS ================= */

    app.get(
        "/api/admin/students/:id",
        authenticateAdmin,
        function (req, res) {

            const student =
                db.prepare(
                    "SELECT id, name, email, created_at FROM users WHERE id = ? AND role = 'student'"
                ).get(req.params.id);

            if (!student) {

                return res.status(404).json({
                    message: "Student not found."
                });

            }

            const applications =
                db.prepare(
                    "SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC"
                ).all(req.params.id);

            const companies =
                db.prepare(
                    "SELECT * FROM companies WHERE user_id = ? ORDER BY id DESC"
                ).all(req.params.id);

            const interviews =
                db.prepare(
                    "SELECT * FROM interviews WHERE user_id = ? ORDER BY id DESC"
                ).all(req.params.id);

            const profile =
                db.prepare(
                    "SELECT course, college, skills FROM profiles WHERE user_id = ?"
                ).get(req.params.id);

            res.json({
                student,
                profile: profile || {
                    course: "",
                    college: "",
                    skills: ""
                },
                applications,
                companies,
                interviews
            });

        }
    );


    /* ================= DELETE STUDENT ================= */

    app.delete(
        "/api/admin/students/:id",
        authenticateAdmin,
        function (req, res) {

            const studentId = req.params.id;

            const student =
                db.prepare(
                    "SELECT id FROM users WHERE id = ? AND role = 'student'"
                ).get(studentId);

            if (!student) {

                return res.status(404).json({
                    message: "Student not found."
                });

            }

            const transaction =
                db.transaction(function () {

                    db.prepare(
                        "DELETE FROM applications WHERE user_id = ?"
                    ).run(studentId);

                    db.prepare(
                        "DELETE FROM companies WHERE user_id = ?"
                    ).run(studentId);

                    db.prepare(
                        "DELETE FROM interviews WHERE user_id = ?"
                    ).run(studentId);

                    db.prepare(
                        "DELETE FROM profiles WHERE user_id = ?"
                    ).run(studentId);

                    db.prepare(
                        "DELETE FROM users WHERE id = ?"
                    ).run(studentId);

                });

            transaction();

            res.json({
                message: "Student deleted successfully."
            });

        }
    );


    /* ================= ADMIN USERS ================= */

    app.get(
        "/api/admin/users",
        authenticateAdmin,
        function (req, res) {

            const users =
                db.prepare(
                    "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC"
                ).all();

            res.json(users);

        }
    );

};