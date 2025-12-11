import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper to format date to DDMMYYYY
function formatDateToPassword(date) {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${month}${year}`;
}

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const { username, password } = credentials;

                // 1. Check Admin (Users table)
                try {
                    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
                    if (users.length > 0) {
                        const user = users[0];
                        let isValid = user.password === password;
                        if (!isValid && user.password && user.password.startsWith('$2')) {
                            isValid = await bcrypt.compare(password, user.password);
                        }

                        if (isValid) {
                            // Prevent large base64 images from bloating the session cookie
                            const image = user.image && user.image.startsWith('data:') ? null : user.image;
                            return { id: user.id.toString(), name: user.name, email: null, image: image, role: 'admin' };
                        }
                    }
                } catch (e) { console.error("Admin login error", e); }

                // 2. Check Student
                try {
                    const [students] = await db.execute('SELECT * FROM students WHERE studentId = ?', [username]);
                    if (students.length > 0) {
                        const student = students[0];
                        let isValid = false;
                        if (student.password && student.password !== '1234') { // Check if password changed from default
                            if (student.password.startsWith('$2')) {
                                isValid = await bcrypt.compare(password, student.password);
                            } else {
                                isValid = student.password === password;
                            }
                        } else {
                            // Default: Check birthdate (DDMMYYYY) or default '1234'
                            const dob = formatDateToPassword(student.birthDate); // Note: Column often camelCase or snake_case depending on DB. Assuming birthDate based on add route.
                            // Actually add/route.js used birthDate (camelCase) in VALUES listing but lowercase in some selects?
                            // add/route.js: INSERT INTO students (..., birthDate, ...)
                            if (password === '1234') isValid = true;
                            else if (dob && dob === password) isValid = true;
                        }

                        if (isValid) {
                            return { id: student.id, name: student.name, email: null, image: student.image, role: 'student' };
                        }
                    }
                } catch (e) { console.error("Student login error", e); }

                // 3. Check Teacher
                try {
                    const [teachers] = await db.execute('SELECT * FROM teachers WHERE teacherId = ?', [username]);
                    if (teachers.length > 0) {
                        const teacher = teachers[0];
                        let isValid = false;

                        // Check default passwords first (1234, teacherId, birthdate)
                        const dob = formatDateToPassword(teacher.birthDate);
                        if (password === '1234') isValid = true;
                        else if (password === teacher.teacherId) isValid = true;
                        else if (dob && dob === password) isValid = true;

                        // If not default, check stored password
                        if (!isValid && teacher.password) {
                            if (teacher.password.startsWith('$2')) {
                                isValid = await bcrypt.compare(password, teacher.password);
                            } else {
                                isValid = teacher.password === password;
                            }
                        }

                        if (isValid) {
                            return { id: teacher.id, name: teacher.name, email: null, image: teacher.image, role: 'teacher' };
                        }
                    }
                } catch (e) { console.error("Teacher login error", e); }

                return null;
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    // Use env variable first, fallback to hardcoded for local dev
    secret: process.env.NEXTAUTH_SECRET || 'super-secret-key-123456789',
    debug: process.env.NODE_ENV !== 'production',
};
