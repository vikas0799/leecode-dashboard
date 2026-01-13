import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_FILE = path.join(process.cwd(), 'data', 'usernames.json');

type UsernameEntry = {
  username: string;
  college?: string;
};

async function readUsernames(): Promise<UsernameEntry[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // Case 1: simple array of strings or objects
    if (Array.isArray(parsed)) {
      return parsed.map((item: unknown) => {
        if (typeof item === 'string') {
          return { username: item };
        }
        if (item && typeof item === 'object' && 'username' in (item as any)) {
          const { username, college } = item as any;
          return { username, college };
        }
        return null;
      }).filter((item): item is UsernameEntry => !!item);
    }

    // Case 2: grouped by college, like { "COLLEGE": [{ username, college }, ...] }
    if (parsed && typeof parsed === 'object') {
      const result: UsernameEntry[] = [];
      Object.values(parsed as Record<string, unknown>).forEach((group) => {
        if (Array.isArray(group)) {
          group.forEach((entry: unknown) => {
            if (entry && typeof entry === 'object' && 'username' in (entry as any)) {
              const { username, college } = entry as any;
              result.push({ username, college });
            }
          });
        }
      });
      return result;
    }

    return [];
  } catch {
    return [];
  }
}

// Only write back to file when the JSON is a simple array (backwards compatible).
async function writeUsernamesIfSimple(usernames: string[]): Promise<void> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      await fs.writeFile(DATA_FILE, JSON.stringify(usernames, null, 2), 'utf-8');
    }
  } catch {
    // If we can't read or it's not an array, treat file as read-only.
  }
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

    // Maintain behaviour for simple-array files; for grouped files, this is effectively a no-op.
    const existingEntries = await readUsernames();
    const existingUsernames = existingEntries.map((e) => e.username);

    if (action === 'add') {
      if (!existingUsernames.includes(trimmed)) {
        existingUsernames.push(trimmed);
      }
    } else if (action === 'remove') {
      const index = existingUsernames.indexOf(trimmed);
      if (index !== -1) {
        existingUsernames.splice(index, 1);
      }
    }

    await writeUsernamesIfSimple(existingUsernames);

    return NextResponse.json({ usernames: existingEntries });
  } catch (error) {
    console.error('Error updating usernames.json:', error);
    return NextResponse.json({ error: 'Failed to update usernames' }, { status: 500 });
  }
}
