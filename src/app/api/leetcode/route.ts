// API route to fetch LeetCode stats for multiple users
import { NextRequest, NextResponse } from 'next/server';
import { fetchLeetCodeStats } from '@/lib/leetcode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { usernames } = body;

        if (!Array.isArray(usernames)) {
            return NextResponse.json(
                { error: 'Usernames must be an array' },
                { status: 400 }
            );
        }

        // Fetch stats for all users in parallel
        const promises = usernames.map(username => fetchLeetCodeStats(username.trim()));
        const stats = await Promise.all(promises);

        return NextResponse.json({
            students: stats,
            lastUpdated: new Date().toISOString(),
            totalStudents: stats.length,
        });
    } catch (error) {
        console.error('Error fetching LeetCode stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
