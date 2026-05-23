import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SellerLiveStudio from '../components/live/SellerLiveStudio';
import BuyerLiveViewer from '../components/live/BuyerLiveViewer';
import { liveCommerceApi } from '../services/liveCommerceApi';
import { useAuthStore } from '../stores/authStore';
import { isLiveSessionHost } from '../lib/liveSessionRole';
import '../styles/live-commerce.css';

export default function LiveSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.initialized);
  const [bidAmount, setBidAmount] = useState('');

  const { data, isPending, isError } = useQuery({
    queryKey: ['live-commerce', 'session', sessionId],
    queryFn: () => liveCommerceApi.getSession(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => (q.state.data?.session?.status === 'live' ? 12000 : false),
  });

  const { data: replayData } = useQuery({
    queryKey: ['live-commerce', 'replay', sessionId],
    queryFn: () => liveCommerceApi.getReplay(sessionId),
    enabled: Boolean(sessionId) && data?.session?.status === 'replay_available',
  });

  const bidMutation = useMutation({
    mutationFn: (amount) => liveCommerceApi.placeBid(sessionId, { amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-commerce', 'session', sessionId] });
      setBidAmount('');
    },
  });

  const session = data?.session;
  const isReplay = session?.status === 'replay_available';
  const timeline = replayData?.timeline || data?.timeline || [];
  const isHost = authReady && isLiveSessionHost(user, session);

  if (isPending) {
    return (
      <div className="live-immersive live-immersive--loading">
        <div className="live-card--skel" style={{ flex: 1, minHeight: '70dvh' }} />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="live-immersive p-4">
        <p className="ex-empty">Live session not found.</p>
        <Link to="/live" className="live-btn-primary inline-flex mt-4 px-6 py-2 rounded-full">
          Browse live
        </Link>
      </div>
    );
  }

  const minBid =
    (session.highestBid || session.currentPrice || 0) + (session.minBidIncrement || 1);
  const isAuction = session.mode === 'auction' || session.mode === 'flash_deal';

  const bidPanel =
    isAuction && !isReplay ? (
      <div className="live-bid-panel">
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Highest bid
        </p>
        <p className="text-[18px] font-bold" style={{ color: 'var(--brand-primary)' }}>
          ${Number(session.highestBid || 0).toFixed(2)}
        </p>
        <div className="live-bid-row">
          <input
            type="number"
            className="live-bid-input"
            placeholder={`Min $${minBid}`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            min={minBid}
          />
          <button
            type="button"
            className="live-btn-primary"
            style={{ flex: '0 0 auto', padding: '0 16px' }}
            disabled={!user || bidMutation.isPending}
            onClick={() => {
              if (!user) {
                navigate('/auth?tab=login');
                return;
              }
              bidMutation.mutate(bidAmount || minBid);
            }}
          >
            Place bid
          </button>
        </div>
        {bidMutation.isError && (
          <p className="mt-2 text-[11px]" style={{ color: 'var(--badge-danger-text, #dc2626)' }}>
            {bidMutation.error?.response?.data?.message || 'Bid failed'}
          </p>
        )}
      </div>
    ) : null;

  if (!authReady) {
    return (
      <div className="live-immersive live-immersive--loading">
        <div className="live-card--skel" style={{ flex: 1, minHeight: '70dvh' }} />
      </div>
    );
  }

  if (isHost && !isReplay) {
    return <SellerLiveStudio session={session} bidPanel={bidPanel} />;
  }

  return (
    <BuyerLiveViewer
      session={session}
      timeline={timeline}
      isReplay={isReplay}
      bidPanel={bidPanel}
    />
  );
}
