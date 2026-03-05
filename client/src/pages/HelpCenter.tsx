import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Search as SearchIcon, Check as CheckIcon, ArrowRight } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { HELP_CATEGORIES, HELP_ARTICLES } from '../data/helpCenterData';

const PRIMARY = '#f97316';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const popularSuggestions = [
    'Tracking order',
    'Refund policy',
    'Payment methods',
    'Escrow',
  ];

  const handleSearch = (value?: string) => {
    const q = (value ?? query).trim();
    if (!q) return;
    navigate(`/help/search?q=${encodeURIComponent(q)}`);
  };

  const heroVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  };

  const categoriesToShow = HELP_CATEGORIES;
  const featuredArticles = HELP_ARTICLES.slice(0, 6);

  // Category groups for dropdown
  const groupedCategories: {
    label: string;
    ids: string[];
  }[] = [
    { label: 'Shopping', ids: ['orders', 'payments', 'escrow', 'returns'] },
    { label: 'Account', ids: ['account', 'security'] },
    { label: 'Sellers', ids: ['sellers', 'deals'] },
    { label: 'Help', ids: ['technical'] },
  ];

  const selectedCategory = selectedCategoryId
    ? HELP_CATEGORIES.find((c) => c.id === selectedCategoryId) || null
    : null;

  const handleSelectCategory = (id: string) => {
    const cat = HELP_CATEGORIES.find((c) => c.id === id);
    if (!cat) return;
    setSelectedCategoryId(id);
    setCategoryDropdownOpen(false);
    setCategorySearch('');
    navigate(`/help/${cat.slug}`);
  };

  // Close dropdown on outside click / Esc
  useEffect(() => {
    if (!categoryDropdownOpen) return;

    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCategoryDropdownOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [categoryDropdownOpen]);

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        {/* Hero */}
        <motion.section
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full px-4 sm:px-6 lg:px-10 py-16 sm:py-20"
          style={{
            background:
              'linear-gradient(135deg,#0f0c24 0%,#1a0f3a 40%,#0d1f3a 70%,#0a1628 100%)',
          }}
        >
          {/* Floating blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="auth-blob auth-blob--orange"
              style={{
                width: 260,
                height: 260,
                top: -60,
                left: -40,
                animation: 'auth-float-10 11s ease-in-out infinite',
              }}
            />
            <div
              className="auth-blob auth-blob--purple"
              style={{
                width: 280,
                height: 280,
                bottom: -80,
                right: -40,
                animation: 'auth-float-12 14s ease-in-out infinite',
              }}
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center">
              <span
                className="text-xs font-medium"
                style={{
                  background: 'rgba(249,115,22,0.15)',
                  color: '#fb923c',
                  borderRadius: 999,
                  padding: '6px 16px',
                }}
              >
                🎧 24/7 Support Available
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold"
              style={{ color: '#ffffff' }}
            >
              How can we help you?
            </h1>
            <p
              className="text-sm sm:text-base"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Search our knowledge base or browse categories below.
            </p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="mt-6"
            >
              <div className="relative max-w-2xl mx-auto">
                <div
                  className="flex items-center gap-3"
                  style={{
                    height: 60,
                    background: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 999,
                    padding: '0 16px 0 20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
                  }}
                >
                  <span
                    className="text-lg"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    🔍
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder="Search for help articles..."
                    className="flex-1 bg-transparent outline-none text-sm sm:text-base"
                    style={{
                      color: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="text-xs sm:text-sm font-semibold"
                    style={{
                      background: PRIMARY,
                      color: '#ffffff',
                      borderRadius: 999,
                      padding: '8px 20px',
                      boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
                    }}
                  >
                    Search
                  </button>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && (
                  <div
                    className="absolute left-0 right-0 mt-3 text-left text-sm"
                    style={{
                      background: '#111420',
                      borderRadius: 16,
                      boxShadow: '0 18px 45px rgba(0,0,0,0.6)',
                    }}
                  >
                    <div className="px-4 py-3 border-b border-white/5 text-xs font-medium text-white/60">
                      Popular:
                    </div>
                    <ul className="py-2">
                      {popularSuggestions.map((sug) => (
                        <li key={sug}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSearch(sug)}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-white/5"
                            style={{ color: 'rgba(255,255,255,0.85)' }}
                          >
                            {sug}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Popular tags */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs sm:text-[13px]">
              {['Order Tracking', 'Payments', 'Returns', 'Account', 'Escrow', 'Sellers'].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(tag)}
                    className="px-3.5 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {tag}
                  </button>
                )
              )}
            </div>

            {/* Stats row */}
            <div
              className="mt-4 flex flex-wrap justify-center gap-2 text-[13px]"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <span>📚 240+ Articles</span>
              <span>•</span>
              <span>⚡ Avg. 2min read</span>
              <span>•</span>
              <span>✓ Updated weekly</span>
            </div>
          </div>
        </motion.section>

        {/* Content body */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-12">
          {/* Categories dropdown */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Browse by Category
              </h2>
              <div className="mt-2 h-[3px] w-24 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-rose-400" />
            </div>

            <div className="mt-3" ref={dropdownRef}>
              {/* Dropdown button */}
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((open) => !open)}
                className="w-full max-w-md flex items-center justify-between gap-3 text-left text-sm"
                style={{
                  height: 52,
                  background: 'var(--card-bg)',
                  borderRadius: 14,
                  padding: '0 20px',
                  boxShadow: '0 16px 40px rgba(15,23,42,0.45)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-[12px] flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: selectedCategory?.gradient || 'rgba(148,163,184,0.15)',
                      color: '#ffffff',
                    }}
                  >
                    {selectedCategory?.icon || '🔎'}
                  </div>
                  <span
                    className="truncate"
                    style={{
                      color: selectedCategory
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)',
                      fontWeight: selectedCategory ? 500 : 400,
                    }}
                  >
                    {selectedCategory ? selectedCategory.name : 'Select a category...'}
                  </span>
                </div>
                <ChevronDown
                  className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: 'var(--text-muted)',
                    transform: categoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Dropdown menu */}
              <motion.div
                initial={false}
                animate={categoryDropdownOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  pointerEvents: categoryDropdownOpen ? 'auto' : 'none',
                }}
              >
                {categoryDropdownOpen && (
                  <div
                    className="mt-3 w-full max-w-md text-sm"
                    style={{
                      background: 'var(--card-bg)',
                      borderRadius: 16,
                      boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
                      padding: 8,
                      maxHeight: 380,
                      overflowY: 'auto',
                      zIndex: 100,
                    }}
                  >
                    {/* Search inside dropdown */}
                    <div
                      className="flex items-center gap-2 mb-2 px-1"
                    >
                      <div
                        className="flex items-center gap-2 w-full h-9 rounded-[10px] text-xs"
                        style={{
                          background: 'var(--bg-secondary)',
                          boxShadow: '0 0 0 1px rgba(15,23,42,0.08)',
                          padding: '0 12px',
                        }}
                      >
                        <SearchIcon
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        />
                        <input
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search categories..."
                          className="flex-1 bg-transparent outline-none text-xs"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    {/* Grouped options */}
                    {groupedCategories.map((group) => {
                      const groupCats = categoriesToShow.filter((c) =>
                        group.ids.includes(c.id)
                      ).filter((c) =>
                        categorySearch
                          ? c.name.toLowerCase().includes(categorySearch.toLowerCase())
                          : true
                      );
                      if (!groupCats.length) return null;
                      return (
                        <div key={group.label}>
                          <p
                            className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-[0.08em]"
                            style={{ color: 'var(--text-faint)' }}
                          >
                            {group.label}
                          </p>
                          {groupCats.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleSelectCategory(cat.id)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[10px] text-left text-sm mb-1 transition-colors"
                                style={{
                                  background: isSelected
                                    ? 'rgba(249,115,22,0.08)'
                                    : 'transparent',
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
                                    style={{
                                      background: cat.gradient,
                                      color: '#ffffff',
                                    }}
                                  >
                                    {cat.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate"
                                      style={{
                                        fontSize: 15,
                                        fontWeight: isSelected ? 600 : 500,
                                        color: isSelected
                                          ? PRIMARY
                                          : 'var(--text-primary)',
                                      }}
                                    >
                                      {cat.name}
                                    </p>
                                    <p
                                      className="text-[12px]"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      {cat.articleCount} articles
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-[13px] flex items-center">
                                  {isSelected ? (
                                    <CheckIcon
                                      className="w-4 h-4"
                                      style={{ color: PRIMARY }}
                                    />
                                  ) : (
                                    <ArrowRight
                                      className="w-4 h-4 transition-transform"
                                      style={{ color: 'var(--text-faint)' }}
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </section>

          {/* Featured articles */}
          <section className="space-y-4">
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>📌</span>
                <span>Most Helpful Articles</span>
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Answers to the most common questions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {featuredArticles.map((article) => {
                const category = HELP_CATEGORIES.find(
                  (c) => c.id === article.categoryId
                );
                return (
                  <motion.button
                    key={article.id}
                    type="button"
                    onClick={() =>
                      navigate(`/help/${category?.slug}/${article.slug}`)
                    }
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.25 }}
                    className="text-left rounded-[16px] p-5 sm:p-6 transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: '0 14px 36px rgba(15,23,42,0.45)',
                    }}
                    whileHover={{
                      y: -2,
                      boxShadow: '0 20px 50px rgba(15,23,42,0.75)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          background: category?.gradient || PRIMARY,
                          color: '#ffffff',
                        }}
                      >
                        {category?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm sm:text-[15px] font-semibold mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {article.title}
                        </h3>
                        <p
                          className="text-[13px] line-clamp-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {article.excerpt}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span style={{ color: 'var(--text-faint)' }}>
                            {article.readTime} · 👍 Helpful (
                            {article.helpfulCount.toLocaleString()})
                          </span>
                          <span
                            className="transition-all"
                            style={{ color: 'var(--text-faint)' }}
                          >
                            →
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Contact support */}
          <section className="space-y-4 pb-10">
            <div className="text-center mb-2">
              <h2
                className="text-xl sm:text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Still need help? Contact us
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Our support team is here 24/7.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Live chat */}
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 18px 50px rgba(15,23,42,0.7)' }}
                className="rounded-[20px] p-6 text-center"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 16px 40px rgba(15,23,42,0.55)',
                }}
              >
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(34,197,94,0.12)' }}
                  >
                    💬
                  </div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Live Chat
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Chat with us now, average response: 2 minutes.
                  </p>
                  <div
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: '#16a34a' }}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Online Now</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full py-2.5 rounded-[12px] text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg,#059669,#047857)',
                    boxShadow: '0 6px 20px rgba(5,150,105,0.35)',
                  }}
                >
                  Start Chat →
                </button>
              </motion.div>

              {/* Email */}
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 18px 50px rgba(15,23,42,0.7)' }}
                className="rounded-[20px] p-6 text-center"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 16px 40px rgba(15,23,42,0.55)',
                }}
              >
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(59,130,246,0.15)' }}
                  >
                    ✉️
                  </div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Email Support
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Send us a detailed message, reply within 24 hours.
                  </p>
                  <button
                    type="button"
                    className="text-[11px] font-semibold mt-1"
                    style={{ color: PRIMARY }}
                  >
                    reaglerobust2020@gmail.com
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full py-2.5 rounded-[12px] text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                    boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
                  }}
                >
                  Send Email →
                </button>
              </motion.div>

              {/* Community */}
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 18px 50px rgba(15,23,42,0.7)' }}
                className="rounded-[20px] p-6 text-center"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 16px 40px rgba(15,23,42,0.55)',
                }}
              >
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(124,58,237,0.18)' }}
                  >
                    👥
                  </div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Community Forum
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Ask the community and get answers from real users.
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    4,521 members active
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full py-2.5 rounded-[12px] text-xs font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                    boxShadow: '0 6px 20px rgba(124,58,237,0.4)',
                  }}
                >
                  Visit Forum →
                </button>
              </motion.div>
            </div>
          </section>
        </div>
      </div>
    </BuyerLayout>
  );
}

