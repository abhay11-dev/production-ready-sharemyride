import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

/* ── Mock data ─────────────────────────────────────────────── */
const CATEGORIES = ['All', 'Travel Stories', 'Carpooling Tips', 'Community Stories', 'Sustainability', 'Industry Insights'];

const POSTS = [
    {
        id: 1,
        title: 'How I saved ₹18,000 in 3 months by carpooling from Pune to Mumbai',
        excerpt: 'Every Friday for three months I shared a ride with strangers who became friends. Here is what I learned about commuting, community, and cutting costs without cutting comfort.',
        category: 'Travel Stories',
        author: { name: 'Priya Sharma', avatar: 'PS', role: 'Software Engineer, Pune' },
        date: 'June 10, 2026',
        readTime: '5 min read',
        likes: 142,
        comments: 23,
        featured: true,
        tags: ['savings', 'Pune-Mumbai', 'weekly commute'],
        coverColor: 'from-blue-600 to-indigo-700',
        coverEmoji: '🚗',
    },
    {
        id: 2,
        title: 'The carbon math: what 4 people in one car actually does to emissions',
        excerpt: 'I ran the numbers using real fuel consumption data on Indian highways. The results are surprising — and they make the case for carpooling better than any campaign.',
        category: 'Sustainability',
        author: { name: 'Arjun Mehta', avatar: 'AM', role: 'Climate Researcher' },
        date: 'June 5, 2026',
        readTime: '7 min read',
        likes: 289,
        comments: 41,
        featured: true,
        tags: ['carbon', 'environment', 'data'],
        coverColor: 'from-green-600 to-emerald-700',
        coverEmoji: '🌿',
    },
    {
        id: 3,
        title: '10 etiquette rules every ShareMyRide passenger should know',
        excerpt: 'From the unspoken music negotiation to the correct way to handle a route detour — small things that make or break a shared ride experience.',
        category: 'Carpooling Tips',
        author: { name: 'Kavitha Nair', avatar: 'KN', role: 'Frequent Traveller' },
        date: 'May 28, 2026',
        readTime: '4 min read',
        likes: 95,
        comments: 17,
        featured: false,
        tags: ['etiquette', 'tips', 'passengers'],
        coverColor: 'from-violet-600 to-purple-700',
        coverEmoji: '📋',
    },
    {
        id: 4,
        title: 'How our college carpooling group grew to 200 students in 60 days',
        excerpt: 'We started with a WhatsApp group of 8 students trying to split Ola costs. Then we discovered ShareMyRide and everything changed.',
        category: 'Community Stories',
        author: { name: 'Rishi Kapoor', avatar: 'RK', role: 'Student, IIT Bombay' },
        date: 'May 22, 2026',
        readTime: '6 min read',
        likes: 203,
        comments: 38,
        featured: false,
        tags: ['college', 'community', 'students'],
        coverColor: 'from-amber-500 to-orange-600',
        coverEmoji: '🎓',
    },
    {
        id: 5,
        title: 'Why India needs BlaBlaCar — and what we\'re building instead',
        excerpt: 'Intercity ride-sharing has worked spectacularly in Europe. The Indian context is different — here is why, and what a truly India-first carpooling platform looks like.',
        category: 'Industry Insights',
        author: { name: 'Divya Rao', avatar: 'DR', role: 'Product Thinker' },
        date: 'May 15, 2026',
        readTime: '9 min read',
        likes: 410,
        comments: 67,
        featured: false,
        tags: ['product', 'India', 'market analysis'],
        coverColor: 'from-blue-500 to-cyan-600',
        coverEmoji: '🗺️',
    },
    {
        id: 6,
        title: 'The strangers who drove me home: a monsoon story from Nagpur',
        excerpt: 'My train was cancelled. My phone battery was at 8%. And somehow, two complete strangers on ShareMyRide got me home in one of the most memorable journeys of my life.',
        category: 'Travel Stories',
        author: { name: 'Sneha Kulkarni', avatar: 'SK', role: 'Teacher & Traveller' },
        date: 'May 8, 2026',
        readTime: '8 min read',
        likes: 517,
        comments: 82,
        featured: false,
        tags: ['monsoon', 'Nagpur', 'kindness'],
        coverColor: 'from-teal-600 to-blue-600',
        coverEmoji: '🌧️',
    },
];

/* ── Blog Card ── */
function BlogCard({ post, onClick }) {
    const [liked, setLiked] = useState(false);
    return (
        <div
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group"
            onClick={() => onClick(post)}
        >
            {/* Cover */}
            <div className={`h-36 bg-gradient-to-br ${post.coverColor} flex items-center justify-center`}>
                <span className="text-5xl">{post.coverEmoji}</span>
            </div>

            <div className="p-5">
                {/* Category + read time */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{post.category}</span>
                    <span className="text-xs text-gray-400">{post.readTime}</span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>

                {/* Author */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {post.author.avatar}
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-gray-800">{post.author.name}</div>
                            <div className="text-[10px] text-gray-400">{post.date}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 text-gray-400">
                        <button
                            onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
                            className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-red-500' : 'hover:text-red-400'}`}
                        >
                            {liked ? '❤️' : '🤍'} {post.likes + (liked ? 1 : 0)}
                        </button>
                        <span className="flex items-center gap-1 text-xs">
                            💬 {post.comments}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Blog Detail Modal ── */
function BlogModal({ post, onClose }) {
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([
        { id: 1, author: 'Rajan M.', avatar: 'RM', text: 'This resonates so much. I had a similar experience last year on the Bangalore–Mysore route.', time: '2 days ago', likes: 4 },
        { id: 2, author: 'Preethi S.', avatar: 'PS', text: 'Fantastic read. The cost breakdown is super accurate based on my own experience.', time: '3 days ago', likes: 7 },
    ]);

    if (!post) return null;

    const submitComment = () => {
        if (!comment.trim()) return;
        setComments(prev => [{ id: Date.now(), author: 'You', avatar: 'YO', text: comment, time: 'Just now', likes: 0 }, ...prev]);
        setComment('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto" onClick={onClose}>
            <div
                className="relative bg-white rounded-2xl m-4 sm:m-8 max-w-2xl w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 z-10"
                >
                    ✕
                </button>

                {/* Cover */}
                <div className={`h-48 rounded-t-2xl bg-gradient-to-br ${post.coverColor} flex items-center justify-center`}>
                    <span className="text-7xl">{post.coverEmoji}</span>
                </div>

                <div className="p-6 sm:p-8">
                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{post.category}</span>
                        <span className="text-xs text-gray-400">{post.readTime}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{post.date}</span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight">{post.title}</h1>

                    {/* Author */}
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {post.author.avatar}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 text-sm">{post.author.name}</div>
                            <div className="text-xs text-gray-500">{post.author.role}</div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="prose prose-sm text-gray-700 leading-relaxed space-y-4 mb-8">
                        <p>{post.excerpt}</p>
                        <p>Shared mobility in India is at an inflection point. With fuel prices rising and urban congestion worsening, the case for carpooling has never been stronger. But technology alone isn't enough — it's the community of people willing to trust strangers that makes it real.</p>
                        <p>What ShareMyRide has built is not just a booking platform. It's a social infrastructure for a new kind of travel — one that values connection, sustainability, and mutual benefit over convenience and profit.</p>
                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600">
                            "The journey is the destination — especially when you're sharing it."
                        </blockquote>
                        <p>Whether you're a daily commuter, a weekend traveller, or someone who simply wants to reduce your carbon footprint, there's a place for you in this community. And that's the point.</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.map(t => (
                            <span key={t} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">#{t}</span>
                        ))}
                    </div>

                    {/* Share + Like */}
                    <div className="flex items-center gap-3 mb-8">
                        <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                            ❤️ {post.likes} Likes
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                            🔗 Share
                        </button>
                    </div>

                    {/* Comments */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4">{comments.length} Comments</h3>

                        {/* Comment input */}
                        <div className="flex gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                YO
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Add a comment…"
                                    rows={2}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400"
                                />
                                <button
                                    onClick={submitComment}
                                    className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Post Comment
                                </button>
                            </div>
                        </div>

                        {/* Comment list */}
                        <div className="space-y-4">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {c.avatar}
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-900">{c.author}</span>
                                            <span className="text-[10px] text-gray-400">{c.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed">{c.text}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">❤️ {c.likes}</button>
                                            <button className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors">Reply</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Create Blog Modal ── */
function CreateBlogModal({ onClose, onPublish }) {
    const [form, setForm] = useState({ title: '', category: 'Travel Stories', content: '', tags: '' });
    const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Write a Post</h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
                </div>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
                        <input name="title" value={form.title} onChange={change} placeholder="A compelling title…" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                        <select name="category" value={form.category} onChange={change} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content *</label>
                        <textarea name="content" value={form.content} onChange={change} rows={8} placeholder="Tell your story…" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags (comma-separated)</label>
                        <input name="tags" value={form.tags} onChange={change} placeholder="carpooling, travel, india" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400" />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium">Cancel</button>
                    <button
                        onClick={() => { onPublish(form); onClose(); }}
                        disabled={!form.title.trim() || !form.content.trim()}
                        className="px-5 py-2.5 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Publish Post
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Blog Page ── */
export default function Blog() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [selectedPost, setSelectedPost] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [posts, setPosts] = useState(POSTS);

    const filtered = useMemo(() => {
        return posts.filter(p =>
            (category === 'All' || p.category === category) &&
            (!search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.author.name.toLowerCase().includes(search.toLowerCase()))
        );
    }, [posts, search, category]);

    const featured = posts.filter(p => p.featured);

    const handlePublish = (form) => {
        const colorsOptions = ['from-blue-600 to-indigo-700', 'from-green-600 to-emerald-700', 'from-violet-600 to-purple-700', 'from-amber-500 to-orange-600'];
        const emojis = ['✍️', '📝', '💡', '🚀'];
        const newPost = {
            id: Date.now(),
            title: form.title,
            excerpt: form.content.slice(0, 160) + '…',
            category: form.category,
            author: { name: 'You', avatar: 'YO', role: 'Community Member' },
            date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
            readTime: `${Math.max(1, Math.round(form.content.split(' ').length / 200))} min read`,
            likes: 0,
            comments: 0,
            featured: false,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            coverColor: colorsOptions[Math.floor(Math.random() * colorsOptions.length)],
            coverEmoji: emojis[Math.floor(Math.random() * emojis.length)],
        };
        setPosts(prev => [newPost, ...prev]);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {selectedPost && <BlogModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
            {showCreate && <CreateBlogModal onClose={() => setShowCreate(false)} onPublish={handlePublish} />}

            {/* ── Hero ── */}
            <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-16 sm:py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Community Blog</div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Stories from the road
                    </h1>
                    <p className="text-blue-100 leading-relaxed mb-8 max-w-xl mx-auto">
                        Travel diaries, carpooling wisdom, sustainability insights — written by the ShareMyRide community, for the community.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-lg"
                    >
                        ✍️ Write a Post
                    </button>
                </div>
            </section>

            {/* ── Featured Posts ── */}
            {featured.length > 0 && (
                <section className="bg-white border-b border-gray-100 py-10 sm:py-14">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-6">Featured Articles</div>
                        <div className="grid sm:grid-cols-2 gap-5">
                            {featured.map(post => (
                                <div
                                    key={post.id}
                                    className={`rounded-2xl bg-gradient-to-br ${post.coverColor} p-6 cursor-pointer hover:scale-[1.01] transition-transform`}
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <div className="text-4xl mb-4">{post.coverEmoji}</div>
                                    <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">{post.category}</span>
                                    <h3 className="text-lg font-bold text-white mt-3 mb-2 leading-snug">{post.title}</h3>
                                    <p className="text-white/70 text-xs leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                                    <div className="flex items-center gap-3 text-white/80">
                                        <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">{post.author.avatar}</div>
                                        <span className="text-xs">{post.author.name}</span>
                                        <span className="text-white/40">·</span>
                                        <span className="text-xs">{post.readTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Search + Filter ── */}
            <section className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15z" />
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search posts…"
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 bg-gray-50"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                        <span>+</span> Write
                    </button>
                </div>
            </section>

            {/* ── Post Grid ── */}
            <section className="py-10 sm:py-14">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-4xl mb-3">📭</div>
                            <div className="font-semibold text-gray-700 mb-2">No posts found</div>
                            <p className="text-gray-400 text-sm mb-5">Try a different search or be the first to write about this topic.</p>
                            <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                                Write the first post
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-xs text-gray-400 mb-5">
                                {filtered.length} post{filtered.length !== 1 ? 's' : ''} {category !== 'All' ? `in ${category}` : ''}
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filtered.map(post => (
                                    <BlogCard key={post.id} post={post} onClick={setSelectedPost} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

        </div>
    );
}