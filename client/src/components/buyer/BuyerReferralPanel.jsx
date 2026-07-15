import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Gift, Link2, Loader2, Share2, Users } from 'lucide-react';
import { buyerReferralApi } from '../../services/buyerReferralApi';
import { useToastStore } from '../../stores/toastStore';
import '../../styles/buyer-referral.css';

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function BuyerReferralPanel() {
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    return buyerReferralApi
      .getDashboard()
      .then(setData)
      .catch((e) => {
        showToast(e.message || 'Could not load referral program', 'error');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCopy = async (text, kind) => {
    if (!text) return;
    try {
      await copyText(text);
      if (kind === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      showToast(kind === 'link' ? 'Invite link copied' : 'Referral code copied', 'success');
    } catch {
      showToast('Copy failed — select and copy manually', 'error');
    }
  };

  const handleShare = async () => {
    if (!data?.shareLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Spacilly',
          text: `Use my referral code ${data.referralCode} or open this link to sign up.`,
          url: data.shareLink,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    void handleCopy(data.shareLink, 'link');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
      </div>
    );
  }

  if (!data?.programEnabled) {
    return (
      <div className="rx-ref-root">
        <div className="rx-ref-disabled">
          <Gift size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Referral program is not active right now
          </p>
          <p className="text-sm mt-2">
            When Spacilly turns invites back on, your personal link and code will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rx-ref-root">
      <motion.div
        className="rx-ref-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="rx-ref-kicker">Invite friends</p>
        <h2 className="rx-ref-title">Share Spacilly, earn rewards</h2>
        <p className="rx-ref-sub">
          Send your link or code. When a friend signs up and completes their first paid order, you earn a
          reward — tracked automatically in your account.
        </p>
        <span className="rx-ref-reward-pill">
          <Gift size={16} />
          {data.rewardLabel}
        </span>
      </motion.div>

      <div className="rx-ref-stats">
        <div className="rx-ref-stat">
          <div className="rx-ref-stat-value">{data.stats.friendsInvited}</div>
          <div className="rx-ref-stat-label">Friends invited</div>
        </div>
        <div className="rx-ref-stat">
          <div className="rx-ref-stat-value">{data.stats.rewardsEarned}</div>
          <div className="rx-ref-stat-label">Rewards earned</div>
        </div>
        <div className="rx-ref-stat">
          <div className="rx-ref-stat-value">{data.stats.totalRewardAmount}</div>
          <div className="rx-ref-stat-label">Total rewards</div>
        </div>
      </div>

      <div className="rx-ref-share-card">
        <div className="rx-ref-share-label">
          <Link2 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Your invite link
        </div>
        <div className="rx-ref-share-row">
          <input className="rx-ref-share-input" readOnly value={data.shareLink || ''} aria-label="Invite link" />
          <button type="button" className="rx-ref-copy-btn" onClick={() => handleCopy(data.shareLink, 'link')}>
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            {copiedLink ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="rx-ref-copy-btn rx-ref-copy-btn--ghost" onClick={handleShare}>
            <Share2 size={16} />
            Share
          </button>
        </div>

        <div className="rx-ref-share-label" style={{ marginTop: 20 }}>
          Your referral code
        </div>
        <div className="rx-ref-share-row">
          <input
            className="rx-ref-share-input"
            readOnly
            value={data.referralCode || ''}
            aria-label="Referral code"
            style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em' }}
          />
          <button type="button" className="rx-ref-copy-btn" onClick={() => handleCopy(data.referralCode, 'code')}>
            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
            {copiedCode ? 'Copied' : 'Copy code'}
          </button>
        </div>

        <div className="rx-ref-steps">
          <div className="rx-ref-step">
            <span className="rx-ref-step-num">1</span>
            <span>Share your link on WhatsApp, SMS, or social — or tell friends your code at signup.</span>
          </div>
          <div className="rx-ref-step">
            <span className="rx-ref-step-num">2</span>
            <span>They create an account with your code (or open your link — we fill it in for them).</span>
          </div>
          <div className="rx-ref-step">
            <span className="rx-ref-step-num">3</span>
            <span>When they complete their first paid order, your reward is recorded here.</span>
          </div>
        </div>
      </div>

      {data.recentRewards.length > 0 ? (
        <div className="rx-ref-history">
          <div className="rx-ref-history-head">
            <Users size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
            Recent rewards
          </div>
          {data.recentRewards.map((r) => (
            <div key={r.id} className="rx-ref-history-row">
              <span style={{ color: 'var(--text-secondary)' }}>
                {new Date(r.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                +{r.amount} {r.rewardType}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
