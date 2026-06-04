import { useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Shield, Users, ShoppingBag } from 'lucide-react';
import LivePlayer from './LivePlayer';
import LiveStatusPill from './LiveStatusPill';
import LiveReactions from './LiveReactions';
import LivePinnedProduct from './LivePinnedProduct';
import LiveChatPanel from './LiveChatPanel';
import LiveVideoChrome from './LiveVideoChrome';
import { usePersistentStream } from '../../hooks/usePersistentStream';
import { useAuthStore } from '../../stores/authStore';
import { useLiveStreamStore } from '../../stores/liveStreamStore';
import { buyerProductPath } from '../../lib/productUrl';
import { persistentLiveEngine } from '../../live/persistentLiveEngine';

export default function BuyerLiveViewer({
  session,
  timeline = [],
  isReplay = false,
  bidPanel = null,
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Guest';

  useEffect(() => {
    document.documentElement.classList.add('rx-live-buyer-page');
    return () => document.documentElement.classList.remove('rx-live-buyer-page');
  }, []);

  const muted = useLiveStreamStore((s) => s.muted);
  const setMuted = useLiveStreamStore((s) => s.setMuted);

  const provider = session?.streamProvider || 'webrtc';
  const isWebRTC = provider === 'webrtc';
  const isLive = session?.status === 'live' && !isReplay;

  const {
    inlineVideoRef,
    remoteStream,
    viewerCount,
    pinnedProduct,
    reactions,
    chatMessages,
    chatEnabled,
    emitReaction,
    sendChat,
    webrtcStatus,
    hasVideo,
    isPersistent,
    closePlayer,
  } = usePersistentStream(session, {
    enabled: Boolean(session?.id),
    isReplay,
    token: token || undefined,
    guestName: !user ? displayName : undefined,
  });

  const playbackUrl = session?.playbackUrl || session?.streamUrl || '';
  const pin = pinnedProduct;

  const replayPins = useMemo(() => {
    if (!isReplay) return [];
    return (timeline || []).filter((e) => e.type === 'pin');
  }, [isReplay, timeline]);

  const productLink = pin?.productId
    ? buyerProductPath({ _id: pin.productId, title: pin.title })
    : null;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    persistentLiveEngine.setTrackMuted(next);
  };

  const handlePopOut = () => {
    useLiveStreamStore.getState().setMinimized(true);
    navigate(-1);
  };

  const handleDismiss = () => {
    closePlayer();
    navigate('/live');
  };

  return (
    <div className={`live-buyer live-buyer--sticky${isReplay ? ' live-buyer--replay' : ''}`}>
      <header className="live-buyer-top">
        <button type="button" className="live-buyer-icon-btn" onClick={() => navigate(-1)} aria-label="Leave">
          <ArrowLeft size={20} />
        </button>
        <div className="live-buyer-seller min-w-0 flex-1">
          <p className="live-buyer-seller-name">{session?.seller?.name || 'Seller'}</p>
          <p className="live-buyer-title">{session?.title}</p>
        </div>
        <span className="live-buyer-viewers">
          <Users size={12} />
          {isReplay ? session?.viewerCount : viewerCount}
        </span>
        <button type="button" className="live-buyer-icon-btn" aria-label="Share">
          <Share2 size={18} />
        </button>
      </header>

      <div className="live-buyer-video-rail">
        <div className="live-buyer-stage">
          <LivePlayer
            playbackUrl={playbackUrl}
            provider={provider}
            isLive={isLive}
            autoplay
            className="live-buyer-player"
            remoteStream={isWebRTC && isPersistent ? remoteStream : null}
            webrtcStatus={webrtcStatus}
            videoRef={isWebRTC && isLive ? inlineVideoRef : null}
            key={hasVideo ? 'live-video' : 'live-waiting'}
          />

          <div className="live-buyer-overlay-top">
            <LiveStatusPill status={isReplay ? 'replay_available' : session?.status} mode={session?.mode} compact />
            {session?.escrowProtected && (
              <span className="live-buyer-escrow">
                <Shield size={11} />
                Escrow
              </span>
            )}
          </div>

          {isLive && (
            <LiveVideoChrome
              videoRef={inlineVideoRef}
              muted={muted}
              onToggleMute={toggleMute}
              onPopOut={!isReplay ? handlePopOut : undefined}
              onDismiss={!isReplay ? handleDismiss : undefined}
              showLiveBadge={isWebRTC}
            />
          )}

          <div className="live-buyer-overlay-bottom">
            <LivePinnedProduct product={pin} />
            {pin && productLink && !isReplay && (
              <Link to={productLink} className="live-buyer-shop-btn">
                <ShoppingBag size={14} />
                View product
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="live-buyer-scroll">
        {session?.subtitle && <p className="live-buyer-subtitle">{session.subtitle}</p>}

        {!isReplay && session?.features?.reactions !== false && (
          <div className="live-buyer-reactions-inline">
            <LiveReactions reactions={reactions} onSend={emitReaction} compact />
          </div>
        )}

        {!isReplay && (
          <LiveChatPanel
            messages={chatMessages}
            onSend={sendChat}
            chatEnabled={chatEnabled}
            userDisplayName={displayName}
          />
        )}

        {isReplay && replayPins.length > 0 && (
          <p className="live-replay-hint text-center text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>
            Replay · {replayPins.length} product moments saved
          </p>
        )}

        {bidPanel}
      </div>
    </div>
  );
}
