import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { HELP_ARTICLES, HELP_CATEGORIES } from '../data/helpCenterData';

const PRIMARY = '#f97316';

export default function HelpArticle() {
  const { category, article: articleSlug } = useParams();
  const navigate = useNavigate();

  const cat = HELP_CATEGORIES.find((c) => c.slug === category);
  const article = HELP_ARTICLES.find((a) => a.slug === articleSlug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [articleSlug]);

  if (!cat || !article) {
    return (
      <BuyerLayout>
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
        >
          <div className="text-center space-y-2">
            <p className="text-2xl">📄</p>
            <p className="font-semibold">Article not found</p>
          </div>
        </div>
      </BuyerLayout>
    );
  }

  const renderBody = () => {
    if (article.id === 'escrow-how-it-works') {
      return (
        <>
          <h2
            id="overview"
            className="text-lg font-semibold mt-8 mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Overview
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Reaglex escrow protects both buyers and sellers by holding funds in a secure
            account until the order is delivered and confirmed. Instead of paying the
            seller directly, you pay into escrow, and the money is only released when
            everyone is satisfied.
          </p>

          <div
            className="mt-5 rounded-[12px] px-4 py-3 text-sm"
            style={{
              background: 'rgba(37,99,235,0.08)',
              boxShadow: 'inset 4px 0 0 #3b82f6',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> You&apos;ll
            always see an &quot;Escrow protected&quot; label at checkout when your
            purchase is covered.
          </div>

          <h2
            id="flow"
            className="text-lg font-semibold mt-8 mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Step-by-step flow
          </h2>
          <ol className="mt-3 space-y-4">
            {[
              'You place an order and complete payment into escrow.',
              'The seller prepares and ships your order.',
              'You receive the order and confirm that everything is as described.',
              'Escrow releases the funds to the seller.',
            ].map((text, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mt-1"
                  style={{
                    background: 'rgba(249,115,22,0.1)',
                    color: PRIMARY,
                  }}
                >
                  {idx + 1}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{text}</p>
              </li>
            ))}
          </ol>

          <h3
            id="code"
            className="text-base font-semibold mt-8 mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Example: escrow status payload
          </h3>
          <pre
            className="mt-2 text-xs overflow-x-auto"
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 12,
              padding: 16,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              color: 'var(--text-secondary)',
            }}
          >
{`{
  "orderId": "ORD-1002",
  "status": "ESCROW_HOLD",
  "amount": 29.0,
  "currency": "USD",
  "releaseAt": "2026-03-06T12:00:00Z"
}`}
          </pre>

          <div
            className="mt-5 rounded-[12px] px-4 py-3 text-sm"
            style={{
              background: 'rgba(249,115,22,0.08)',
              boxShadow: 'inset 4px 0 0 #f97316',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> If your order
            hasn&apos;t arrived yet but the timer is close to auto-release, open a dispute
            or contact support before the countdown ends.
          </div>
        </>
      );
    }

    return (
      <p style={{ color: 'var(--text-secondary)' }}>
        This article is coming soon. In the meantime, you can contact support or browse
        other articles in the Help Center.
      </p>
    );
  };

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-12"
        >
          {/* Breadcrumb */}
          <div className="text-xs mb-4 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => navigate('/help')}
              className="hover:underline"
              style={{ color: PRIMARY }}
            >
              Help Center
            </button>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <button
              type="button"
              onClick={() => navigate(`/help/${cat.slug}`)}
              className="hover:underline"
              style={{ color: PRIMARY }}
            >
              {cat.name}
            </button>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span style={{ color: 'var(--text-muted)' }}>{article.title}</span>
          </div>

          <div className="lg:flex lg:items-start lg:gap-10">
            {/* Main article */}
            <article className="flex-1 max-w-3xl">
              <div className="mb-4">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: 'rgba(249,115,22,0.12)',
                    color: PRIMARY,
                  }}
                >
                  {cat.name}
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[11px] mb-5">
                <span style={{ color: 'var(--text-muted)' }}>
                  📅 Updated Feb 2026
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  ⏱ {article.readTime}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  👁 8,492 views
                </span>
              </div>

              <div className="prose prose-sm max-w-none">
                {renderBody()}
              </div>

              {/* Footer helpfulness */}
              <div className="mt-10 pt-5 border-t border-[var(--divider)]">
                <p
                  className="text-sm mb-3"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Was this article helpful?
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-[10px] font-semibold"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 0 0 1px var(--divider-strong)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    👍 Yes, this helped
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-[10px] font-semibold"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 0 0 1px var(--divider-strong)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    👎 No, I need more help
                  </button>
                </div>

                {/* Related articles (simple list) */}
                <div className="mt-8">
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    📎 Related Articles
                  </h3>
                  <ul className="space-y-1 text-xs">
                    {HELP_ARTICLES.slice(0, 3).map((a) => {
                      const c = HELP_CATEGORIES.find(
                        (x) => x.id === a.categoryId
                      );
                      if (!c) return null;
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/help/${c.slug}/${a.slug}`)
                            }
                            className="hover:underline"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {a.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="mt-10 lg:mt-0 lg:w-72 lg:flex-shrink-0 space-y-6">
              {/* In this article */}
              <div
                className="rounded-[16px] p-4 text-xs sticky top-20"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: '0 16px 40px rgba(15,23,42,0.45)',
                }}
              >
                <p
                  className="font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  📋 In this article
                </p>
                <ul className="space-y-1">
                  <li>
                    <a
                      href="#overview"
                      className="text-[11px] hover:underline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Overview
                    </a>
                  </li>
                  <li>
                    <a
                      href="#flow"
                      className="text-[11px] hover:underline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Step-by-step flow
                    </a>
                  </li>
                  <li>
                    <a
                      href="#code"
                      className="text-[11px] hover:underline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Escrow status payload
                    </a>
                  </li>
                </ul>

                <div className="mt-5 pt-4 border-t border-[var(--divider)]">
                  <p
                    className="text-[11px] font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    📞 Still stuck?
                  </p>
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-[10px] text-[11px] font-semibold text-white"
                    style={{
                      background:
                        'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                      boxShadow:
                        '0 8px 24px rgba(249,115,22,0.45),0 2px 8px rgba(249,115,22,0.25)',
                    }}
                  >
                    Chat with support
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </motion.div>
      </div>
    </BuyerLayout>
  );
}

