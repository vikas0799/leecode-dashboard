import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_FILE = path.join(process.cwd(), 'data', 'usernames.json');

async function readUsernames(): Promise<string[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

async function writeUsernames(usernames: string[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(usernames, null, 2), 'utf-8');
}

export async function GET() {
  const usernames = await readUsernames();
  return NextResponse.json({ usernames });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username } = body as { action: 'add' | 'remove'; username?: string };

    if (!action || !username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const trimmed = username.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const existing = await readUsernames();

    if (action === 'add') {
      if (!existing.includes(trimmed)) {
        existing.push(trimmed);
      }
    } else if (action === 'remove') {
      const index = existing.indexOf(trimmed);
      if (index !== -1) {
        existing.splice(index, 1);
      }
    }

    await writeUsernames(existing);

    return NextResponse.json({ usernames: existing });
  } catch (error) {
    console.error('Error updating usernames.json:', error);
    return NextResponse.json({ error: 'Failed to update usernames' }, { status: 500 });
  }
}



