import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { HELP_ARTICLES, HELP_CATEGORIES } from '../data/helpCenterData';

export default function HelpCategory() {
  const { category } = useParams();
  const navigate = useNavigate();

  const cat = HELP_CATEGORIES.find((c) => c.slug === category);

  const articles = useMemo(
    () => HELP_ARTICLES.filter((a) => a.categoryId === (cat?.id || '')),
    [cat?.id]
  );

  if (!cat) {
    return (
      <BuyerLayout>
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
        >
          <div className="text-center space-y-2">
            <p className="text-2xl">🤔</p>
            <p className="font-semibold">Category not found</p>
          </div>
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 py-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/help')}
              className="text-xs font-medium w-fit"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back to Help Center
            </button>
            <div className="flex items-start gap-3 mt-1">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: cat.gradient,
                  color: '#ffffff',
                }}
              >
                {cat.icon}
              </div>
              <div>
                <h1
                  className="text-xl sm:text-2xl font-bold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {cat.name}
                </h1>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {cat.description}
                </p>
              </div>
            </div>
          </div>

          {/* Articles list */}
          <div className="space-y-3 mt-2">
            {articles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => navigate(`/help/${cat.slug}/${article.slug}`)}
                className="w-full text-left rounded-[14px] px-4 py-3 sm:px-5 sm:py-4 transition-all"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.45)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
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
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span style={{ color: 'var(--text-faint)' }}>
                        {article.readTime}
                      </span>
                      <span style={{ color: 'var(--text-faint)' }}>•</span>
                      <span style={{ color: 'var(--text-faint)' }}>
                        👍 Helpful ({article.helpfulCount.toLocaleString()})
                      </span>
                    </div>
                  </div>
                  <div
                    className="hidden sm:flex items-center justify-center text-lg"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

