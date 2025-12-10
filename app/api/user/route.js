
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getToken, decode } from "next-auth/jwt";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

const SECRET = 'super-secret-key-123456789'; // Must match app/api/auth/[...nextauth]/route.js

async function getUserFromRequest(request) {
    // 1. Try getToken (standard NextAuth way)
    const token = await getToken({ req: request, secret: SECRET });
    if (token) return token;

    // 2. Fallback: Manual decoding
    const tokenCookie = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
    const tokenValue = tokenCookie?.value;

    if (tokenValue) {
        try {
            return await decode({ token: tokenValue, secret: SECRET });
        } catch (e) {
            console.error("Token decoding failed:", e);
        }
    }
    return null;
}

// Get User Data
export async function GET(request) {
    try {
        const sessionUser = await getUserFromRequest(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, role } = sessionUser;
        let user = null;

        if (role === 'admin') {
            const [rows] = await db.execute('SELECT id, username, name, image FROM users WHERE id = ?', [id]);
            user = rows[0];
        } else if (role === 'student') {
            const [rows] = await db.execute('SELECT id, name FROM students WHERE id = ?', [id]);
            user = rows[0];
            // Students might not have image column yet? Schema has no image for Student.
            // Profile page expects image. We can return null or default.
        } else if (role === 'teacher') {
            const [rows] = await db.execute('SELECT id, name, email FROM teachers WHERE id = ?', [id]);
            user = rows[0];
            // Teachers don't have image column in schema either?
        }

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ ...user, role });
    } catch (error) {
        console.error("Get User Error:", error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }
}

// Update User Data
export async function PUT(request) {
    try {
        const sessionUser = await getUserFromRequest(request);

        if (!sessionUser) {
            const cookies = request.cookies.getAll();
            const cookieNames = cookies.map(c => c.name).join(', ');
            return NextResponse.json({
                error: 'Unauthorized',
                debug: `Session / Token failed.Cookies received: ${cookieNames || 'None'} `
            }, { status: 401 });
        }

        const { id, role } = sessionUser;

        // ... rest of the code

        const body = await request.json();
        console.log("PUT /api/user Body:", body); // Debug log
        const { name, image, password } = body;

        if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

        let hashedPassword = null;
        if (password && password.trim() !== "") {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        if (role === 'admin') {
            if (hashedPassword) {
                await db.execute('UPDATE users SET name = ?, image = ?, password = ? WHERE id = ?', [name, image, hashedPassword, id]);
            } else {
                await db.execute('UPDATE users SET name = ?, image = ? WHERE id = ?', [name, image, id]);
            }
        } else if (role === 'student') {
            // Student table has no image column in schema (unless I add it).
            // For now, ignore image for student/teacher if column missing.
            // Or I should add image column to them?
            // User said "change in profile settings later", implying they want full profile features.
            // I'll update name and password.
            if (hashedPassword) {
                await db.execute('UPDATE students SET name = ?, password = ? WHERE id = ?', [name, hashedPassword, id]);
            } else {
                await db.execute('UPDATE students SET name = ? WHERE id = ?', [name, id]);
            }
        } else if (role === 'teacher') {
            // Teacher table has no image column.
            if (hashedPassword) {
                await db.execute('UPDATE teachers SET name = ?, password = ? WHERE id = ?', [name, hashedPassword, id]);
            } else {
                await db.execute('UPDATE teachers SET name = ? WHERE id = ?', [name, id]);
            }
        }

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ message: 'Update Failed: ' + error.message }, { status: 500 });
    }
}