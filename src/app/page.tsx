'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LeetCodeStats } from '@/lib/leetcode';
import * as XLSX from 'xlsx';

const REFRESH_INTERVAL = 30;
const STORAGE_KEY = 'leetcode_usernames';

export default function Dashboard() {
    const [usernames, setUsernames] = useState<string[]>([]);
    const [students, setStudents] = useState<LeetCodeStats[]>([]);
    const [collegeByUsername, setCollegeByUsername] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [newUsername, setNewUsername] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCollege, setSelectedCollege] = useState('');
    const [sortKey, setSortKey] = useState<keyof LeetCodeStats | 'college'>('totalSolved');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const loadUsernames = async () => {
            try {
                const response = await fetch('/api/usernames');
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data.usernames)) {
                        // Handle both string[] and { username, college }[]
                        if (data.usernames.length > 0 && typeof data.usernames[0] === 'object') {
                            const entries = data.usernames as { username: string; college?: string }[];
                            const names = entries.map((e) => e.username);
                            const collegeMap: Record<string, string> = {};
                            entries.forEach((e) => {
                                if (e.username) {
                                    // Normalize to lowercase for case-insensitive lookup
                                    collegeMap[e.username.toLowerCase()] = e.college ?? '';
                                }
                            });
                            setUsernames(names);
                            setCollegeByUsername(collegeMap);
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
                            return;
                        }

                        // Fallback: simple list of usernames
                        setUsernames(data.usernames as string[]);
                        setCollegeByUsername({});
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.usernames));
                        return;
                    }
                }
            } catch {
                // Fallback to localStorage if API fails
            }

            const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
            if (stored) {
                try {
                    setUsernames(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse stored usernames');
                }
            }
        };

        loadUsernames();
    }, []);

    const fetchData = useCallback(async () => {
        if (usernames.length === 0) {
            setStudents([]);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('/api/leetcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames }),
            });
            if (response.ok) {
                const data = await response.json();
                setStudents(data.students || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [usernames]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, REFRESH_INTERVAL * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setCountdown(REFRESH_INTERVAL);
    }, [students]);

    const handleAddUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newUsername.trim();
        if (!trimmed) return;

        if (trimmed.includes(' ')) {
            alert('Username cannot contain spaces.');
            return;
        }

        if (usernames.includes(trimmed)) {
            alert('Username already exists!');
            return;
        }
        const updated = [...usernames, trimmed];
        setUsernames(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setNewUsername('');

        // New usernames won't have a college by default
        setCollegeByUsername(prev => ({
            ...prev,
            [trimmed.toLowerCase()]: prev[trimmed.toLowerCase()] ?? '',
        }));

        try {
            await fetch('/api/usernames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', username: trimmed }),
            });
        } catch (error) {
            console.error('Failed to persist username:', error);
        }
    };

    const handleDeleteUsername = async (username: string) => {
        if (confirm(`Remove ${username}?`)) {
            const updated = usernames.filter(u => u !== username);
            setUsernames(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            setCollegeByUsername(prev => {
                const { [username]: _removed, ...rest } = prev;
                return rest;
            });

            try {
                await fetch('/api/usernames', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'remove', username }),
                });
            } catch (error) {
                console.error('Failed to update usernames:', error);
            }
        }
    };

    const handleSort = (key: keyof LeetCodeStats | 'college') => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    const uniqueColleges = useMemo(() => {
        const colleges = new Set(Object.values(collegeByUsername).filter(Boolean));
        return Array.from(colleges).sort();
    }, [collegeByUsername]);

    const filteredStudents = useMemo(() => {
        let result = [...students];
        if (searchQuery) {
            result = result.filter(s =>
                s.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedCollege) {
            result = result.filter(s =>
                collegeByUsername[s.username.toLowerCase()] === selectedCollege
            );
        }
        result.sort((a, b) => {
            let aVal: string | number | undefined;
            let bVal: string | number | undefined;

            if (sortKey === 'college') {
                aVal = collegeByUsername[a.username.toLowerCase()] || '';
                bVal = collegeByUsername[b.username.toLowerCase()] || '';
            } else {
                aVal = a[sortKey];
                bVal = b[sortKey];
            }

            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal as string).toLowerCase();
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [students, searchQuery, selectedCollege, sortKey, sortOrder, collegeByUsername]);

    const totalEasy = students.reduce((sum, s) => sum + s.easySolved, 0);
    const totalMedium = students.reduce((sum, s) => sum + s.mediumSolved, 0);
    const totalHard = students.reduce((sum, s) => sum + s.hardSolved, 0);
    const totalSolved = students.reduce((sum, s) => sum + s.totalSolved, 0);

    const SortIcon = ({ column }: { column: keyof LeetCodeStats | 'college' }) => {
        if (sortKey !== column) return <span className="text-slate-300 ml-1 text-[10px]">↕</span>;
        return <span className="text-blue-500 ml-1 text-[10px] font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleDownloadExcel = () => {
        const dataToExport = filteredStudents.map((s, index) => ({
            Rank: index + 1,
            Student: s.username,
            College: collegeByUsername[s.username.toLowerCase()] || '',
            Easy: s.easySolved,
            Medium: s.mediumSolved,
            Hard: s.hardSolved,
            Total: s.totalSolved,
            LeetCode_Rank: s.ranking
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "LeetCode Stats");
        XLSX.writeFile(workbook, "leetcode_stats.xlsx");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold text-slate-800">LeetCode<span className="text-blue-500">Dash</span></h1>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span>Refreshing in {countdown}s</span>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-white border border-slate-200 text-slate-600 hover:text-blue-500 hover:border-blue-500 p-2 rounded-lg transition-all ml-2"
                            title="Download Excel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 0 1-.708.708l3 3z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 card-hover">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Students</p>
                        <p className="text-2xl font-bold text-slate-800">{students.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 card-hover">
                        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">Easy</p>
                        <p className="text-2xl font-bold text-emerald-600">{totalEasy}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 card-hover">
                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Medium</p>
                        <p className="text-2xl font-bold text-amber-600">{totalMedium}</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 card-hover">
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Hard</p>
                        <p className="text-2xl font-bold text-red-600">{totalHard}</p>
                    </div>
                    <div className="bg-blue-500 rounded-xl p-5 card-hover">
                        <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{totalSolved}</p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 mb-8 flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <svg width="20" height="20" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            className="input-clean w-full pl-12"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative min-w-[200px]">
                        <select
                            className="input-clean w-full appearance-none cursor-pointer"
                            value={selectedCollege}
                            onChange={(e) => setSelectedCollege(e.target.value)}
                        >
                            <option value="">All Colleges</option>
                            {uniqueColleges.map((college) => (
                                <option key={college} value={college}>
                                    {college}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                            </svg>
                        </div>
                    </div>

                    <form onSubmit={handleAddUsername} className="flex-1 flex gap-3">
                        <input
                            type="text"
                            className="input-clean flex-1"
                            placeholder="Add LeetCode username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
                        >
                            Add
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-blue-500" onClick={() => handleSort('username')}>
                                    Student <SortIcon column="username" />
                                </th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-blue-500" onClick={() => handleSort('college')}>
                                    College <SortIcon column="college" />
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-emerald-500" onClick={() => handleSort('easySolved')}>
                                    Easy <SortIcon column="easySolved" />
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-amber-500" onClick={() => handleSort('mediumSolved')}>
                                    Medium <SortIcon column="mediumSolved" />
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-red-500" onClick={() => handleSort('hardSolved')}>
                                    Hard <SortIcon column="hardSolved" />
                                </th>

                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-blue-500" onClick={() => handleSort('totalSolved')}>
                                    Total <SortIcon column="totalSolved" />
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-blue-500" onClick={() => handleSort('ranking')}>
                                    Rank <SortIcon column="ranking" />
                                </th>
                                <th className="px-5 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-16 text-center">
                                        <div className="flex justify-center items-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                                            <span className="text-slate-400 text-sm">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                                        No students yet. Add a username above to get started.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <tr key={student.username} className="table-row-hover border-b border-slate-100 last:border-0 group">
                                        <td className="px-5 py-4">
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-600' :
                                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-500'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {student.avatar ? (
                                                    <img
                                                        src={student.avatar}
                                                        alt=""
                                                        className="w-9 h-9 rounded-full object-cover border-2 border-slate-100"
                                                        style={{ width: '36px', height: '36px', minWidth: '36px' }}
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {student.username[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <a href={`https://leetcode.com/${student.username}`} target="_blank" className="font-semibold text-slate-700 hover:text-blue-500 transition-colors">
                                                    {student.username}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-slate-600">
                                                {collegeByUsername[student.username.toLowerCase()] || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">{student.easySolved}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600">{student.mediumSolved}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">{student.hardSolved}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="font-bold text-slate-700">{student.totalSolved}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="text-sm text-slate-500">#{student.ranking.toLocaleString()}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => handleDeleteUsername(student.username)}
                                                className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
