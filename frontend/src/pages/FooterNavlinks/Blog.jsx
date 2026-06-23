import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

/**
 * Dynamic Blog System with Comments & Nested Replies
 * Features: API-driven blog loading, like/share/comment with nested replies
 */

function useScrollTop() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
}

// Blog Card Component
function BlogCard({ blog, onLike, onSelect, onEdit, onDelete, currentUser }) {
  const isAuthor = currentUser && (currentUser._id === blog.author?._id || currentUser.id === blog.author?._id);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative"
      onClick={() => onSelect(blog)}
    >
      {/* Edit / Delete actions for Author */}
      {isAuthor && (
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(blog); }} 
            className="p-1.5 bg-white/90 rounded-lg text-blue-600 hover:bg-white shadow-sm"
            title="Edit Blog"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(blog); }} 
            className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white shadow-sm"
            title="Delete Blog"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      <div className="h-40 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <svg className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.999 10-11.747 0-5.502-4.5-10.747-10-10.747z" />
        </svg>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Blog</span>
          <span className="text-xs text-gray-500">{blog.readTime || '5 min'}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {blog.title}
        </h3>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 text-sm">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
            {blog.author?.name?.charAt(0) || 'U'}
          </div>
          <span className="text-gray-700 font-medium text-xs">{blog.author?.name || 'Unknown'}</span>
          <span className="text-gray-400 text-xs">·</span>
          <span className="text-gray-500 text-xs">{new Date(blog.createdAt).toLocaleDateString()}</span>
          <span className="ml-auto flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.172 15.172a4 4 0 015.656 0l2.828-2.829a6 6 0 00-8.488-8.488l-2.83 2.829m5.656 5.656l2.83-2.829a6 6 0 008.488-8.488l-2.829-2.83" />
            </svg>
            {blog.likes || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// Main Blog Component
export default function Blog() {
  useScrollTop();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [writeForm, setWriteForm] = useState({ title: '', content: '', tags: '', category: 'Travel Stories' });
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      // Try to load from API, fall back to empty if endpoint doesn't exist
      try {
        const res = await api.get('/blogs', { params: { limit: 20 } });
        setBlogs(res.data?.data || []);
      } catch (err) {
        // API endpoint not ready, show placeholder message
        console.log('Blog API not ready yet');
        setBlogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBlog = async (blogId) => {
    if (!user) {
      toast.error('Please log in to like');
      return;
    }
    try {
      const res = await api.post(`/blogs/${blogId}/like`);
      loadBlogs();
      if (selectedBlog && (selectedBlog._id === blogId || selectedBlog.id === blogId)) {
        setSelectedBlog(prev => ({ ...prev, likes: res.data.likeCount }));
      }
      toast.success('Liked!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to like blog');
    }
  };

  const handleWriteBlog = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to write a blog');
      return;
    }
    if (!writeForm.title.trim() || !writeForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBlogId) {
        await api.put(`/blogs/${editingBlogId}`, {
          title: writeForm.title,
          content: writeForm.content,
          category: writeForm.category,
          tags: writeForm.tags.split(',').map(t => t.trim()).filter(t => t),
        });
        toast.success('Blog updated successfully!');
      } else {
        await api.post('/blogs', {
          title: writeForm.title,
          content: writeForm.content,
          category: writeForm.category,
          tags: writeForm.tags.split(',').map(t => t.trim()).filter(t => t),
        });
        toast.success('Blog published!');
      }
      setWriteForm({ title: '', content: '', tags: '', category: 'Travel Stories' });
      setEditingBlogId(null);
      setShowWriteForm(false);
      loadBlogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save blog');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (blog) => {
    setWriteForm({
      title: blog.title || '',
      content: blog.content || '',
      tags: blog.tags ? blog.tags.join(', ') : '',
      category: blog.category || 'Travel Stories'
    });
    setEditingBlogId(blog._id || blog.id);
    setShowWriteForm(true);
  };

  const handleDeleteBlog = async (blog) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;
    try {
      await api.delete(`/blogs/${blog._id || blog.id}`);
      toast.success('Blog deleted');
      loadBlogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete blog');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    try {
      const res = await api.post(`/blogs/${selectedBlog._id}/comments`, { content: newComment });
      setNewComment('');
      toast.success('Comment added!');
      
      // Update local state to reflect new comment immediately
      if (res.data?.data) {
        setSelectedBlog(prev => ({
          ...prev,
          comments: [...(prev.comments || []), res.data.data]
        }));
      }
      loadBlogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden py-32 sm:py-48 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold uppercase tracking-widest">
            Community Blog
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight">
            Stories from<br className="hidden sm:block" />
            <span className="text-green-400"> the Road</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto px-2 sm:px-0">
            Travel diaries, carpooling wisdom, and sustainability insights from the ShareMyRide community.
          </p>

          {user && (
            <button
              onClick={() => setShowWriteForm(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 text-sm sm:text-base rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg w-full sm:w-auto justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start Writing
            </button>
          )}
        </div>
      </section>

      {/* Write Blog Form Modal */}
      {showWriteForm && user && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{editingBlogId ? 'Edit Blog' : 'Write a Blog'}</h2>
              <button
                onClick={() => { setShowWriteForm(false); setEditingBlogId(null); setWriteForm({ title: '', content: '', tags: '', category: 'Travel Stories' }); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleWriteBlog} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Title *</label>
                <input
                  type="text"
                  value={writeForm.title}
                  onChange={(e) => setWriteForm({ ...writeForm, title: e.target.value })}
                  placeholder="Your story title..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">Category *</label>
                <select
                  value={writeForm.category}
                  onChange={(e) => setWriteForm({ ...writeForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="Travel Stories">Travel Stories</option>
                  <option value="Carpooling Tips">Carpooling Tips</option>
                  <option value="Community Stories">Community Stories</option>
                  <option value="Sustainability">Sustainability</option>
                  <option value="Industry Insights">Industry Insights</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Content *</label>
                <textarea
                  value={writeForm.content}
                  onChange={(e) => setWriteForm({ ...writeForm, content: e.target.value })}
                  placeholder="Tell your story..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Tags</label>
                <input
                  type="text"
                  value={writeForm.tags}
                  onChange={(e) => setWriteForm({ ...writeForm, tags: e.target.value })}
                  placeholder="Comma-separated: travel, carpooling..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowWriteForm(false); setEditingBlogId(null); setWriteForm({ title: '', content: '', tags: '', category: 'Travel Stories' }); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* Sort Options Removed */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Latest Stories</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600" />
            <p className="text-gray-600 mt-4">Loading stories...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-3xl mx-auto px-4 mt-8">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
              <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-3xl font-extrabold text-gray-900 mb-4">No blogs yet</h3>
            <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
              Our community is just getting started. Be the pioneer and share the first story about your travel experiences.
            </p>
            {user ? (
              <button
                onClick={() => setShowWriteForm(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Write the First Blog
              </button>
            ) : (
              <button
                onClick={() => { window.scrollTo(0, 0); navigate('/login'); }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-sm"
              >
                Log in to Share Your Story
              </button>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <div
                key={blog._id || blog.id}
                className="relative"
              >
                <BlogCard
                  blog={blog}
                  currentUser={user}
                  onLike={() => handleLikeBlog(blog._id || blog.id)}
                  onSelect={() => setSelectedBlog(blog)}
                  onEdit={handleEditInit}
                  onDelete={handleDeleteBlog}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blog Detail Modal */}
      {selectedBlog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">{selectedBlog.title}</h2>
              <button
                onClick={() => setSelectedBlog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-6">
              {/* Blog Content */}
              <div>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {selectedBlog.author?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedBlog.author?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{new Date(selectedBlog.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleLikeBlog(selectedBlog._id || selectedBlog.id)}
                    className="ml-auto flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.172 15.172a4 4 0 015.656 0l2.828-2.829a6 6 0 00-8.488-8.488l-2.83 2.829m5.656 5.656l2.83-2.829a6 6 0 008.488-8.488l-2.829-2.83" />
                    </svg>
                    {selectedBlog.likes || 0}
                  </button>
                </div>

                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedBlog.content}</p>

                {selectedBlog.tags && selectedBlog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-200">
                    {selectedBlog.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Comments ({selectedBlog.comments?.length || 0})
                </h3>

                {/* Add Comment Form */}
                {user ? (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      rows="3"
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-900">
                      <button onClick={() => navigate('/login')} className="text-blue-600 font-medium hover:underline">
                        Log in
                      </button>
                      {' '}to comment on this blog
                    </p>
                  </div>
                )}

                {/* Comments Thread */}
                <div className="space-y-4">
                  {selectedBlog.comments && selectedBlog.comments.length > 0 ? (
                    selectedBlog.comments.map((comment) => (
                      <div key={comment._id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {comment.author?.name?.charAt(0) || 'U'}
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{comment.author?.name || 'User'}</p>
                          <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm text-gray-700 ml-10">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-8">No comments yet. Be the first!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
