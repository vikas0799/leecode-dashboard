// LeetCode API utility using GraphQL
export interface LeetCodeStats {
    username: string;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    totalSolved: number;
    ranking: number;
    avatar: string;
    error?: string;
}

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const QUERY = `
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      userAvatar
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
}
`;

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query: QUERY,
                variables: { username },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data?.matchedUser) {
            return {
                username,
                easySolved: 0,
                mediumSolved: 0,
                hardSolved: 0,
                totalSolved: 0,
                ranking: 0,
                avatar: '',
                error: 'User not found',
            };
        }

        const user = data.data.matchedUser;
        const stats = user.submitStatsGlobal?.acSubmissionNum || [];

        const easySolved = stats.find((s: { difficulty: string; count: number }) => s.difficulty === 'Easy')?.count || 0;
        const mediumSolved = stats.find((s: { difficulty: string; count: number }) => s.difficulty === 'Medium')?.count || 0;
        const hardSolved = stats.find((s: { difficulty: string; count: number }) => s.difficulty === 'Hard')?.count || 0;
        const totalSolved = stats.find((s: { difficulty: string; count: number }) => s.difficulty === 'All')?.count || 0;

        return {
            username: user.username,
            easySolved,
            mediumSolved,
            hardSolved,
            totalSolved,
            ranking: user.profile?.ranking || 0,
            avatar: user.profile?.userAvatar || '',
        };
    } catch (error) {
        console.error(`Error fetching stats for ${username}:`, error);
        return {
            username,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            totalSolved: 0,
            ranking: 0,
            avatar: '',
            error: error instanceof Error ? error.message : 'Failed to fetch',
        };
    }
}
