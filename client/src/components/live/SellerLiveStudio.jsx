import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  Square,
  Package,
  RefreshCw,
} from 'lucide-react';
import WebRTCBroadcast from './WebRTCBroadcast';
import LivePlayer from './LivePlayer';
import LiveStatusPill from './LiveStatusPill';
import LiveChatPanel from './LiveChatPanel';
import { useLiveSocket } from '../../hooks/useLiveSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSellerLivePresence } from '../../hooks/useSellerLivePresence';
import { liveCommerceApi } from '../../services/liveCommerceApi';

export default function SellerLiveStudio({ session, bidPanel = null }) {
  const navigate = useNavigate();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const [panel, setPanel] = useState('products');

  const provider = session?.streamProvider || 'webrtc';
  const isWebRTC = provider === 'webrtc';
  const isLive = session?.status === 'live';

  const {
    socket,
    viewerCount,
    pinnedProduct,
    chatMessages,
    chatEnabled,
    pinProduct,
    unpinProduct,
    sendChat,
  } = useLiveSocket(session?.id, { enabled: Boolean(session?.id), token: token || undefined });

  const {
    localStream,
    status: webrtcStatus,
    error: webrtcError,
    micEnabled,
    camEnabled,
    toggleMic,
    toggleCam,
    retryMedia,
  } = useWebRTC({
    sessionId: session?.id,
    role: 'seller',
    socket,
    enabled: isWebRTC && isLive,
  });

  useSellerLivePresence(session?.id, {
    socket,
    enabled: isLive && Boolean(session?.id),
    token: token || undefined,
  });

  const { data: productsData } = useQuery({
    queryKey: ['live-commerce', 'seller-products', session?.id],
    queryFn: () => liveCommerceApi.getSellerProducts(session.id),
    enabled: Boolean(session?.id),
  });

  const endMutation = useMutation({
    mutationFn: () => liveCommerceApi.endStream(session.id),
    onSuccess: () => navigate('/seller'),
  });

  const products = productsData?.products || [];
  const playbackUrl = session?.playbackUrl || session?.streamUrl || '';
  const sellerName = session?.seller?.name || 'You';

  return (
    <div className="live-studio">
      <header className="live-studio-top">
        <button type="button" className="live-studio-icon-btn" onClick={() => navigate('/seller')} aria-label="Exit">
          <ArrowLeft size={20} />
        </button>
        <div className="live-studio-top-text">
          <p className="live-studio-label">Seller studio</p>
          <h1 className="live-studio-title">{session?.title}</h1>
        </div>
        <span className="live-studio-viewers">
          <Users size={14} />
          {viewerCount}
        </span>
      </header>

      <div className="live-studio-stage">
        {isWebRTC ? (
          <WebRTCBroadcast
            stream={localStream}
            status={webrtcStatus}
            className="live-studio-video"
            micOn={micEnabled}
            camOn={camEnabled}
          />
        ) : (
          <LivePlayer
            playbackUrl={playbackUrl}
            provider={provider}
            isLive={isLive}
            autoplay
            className="live-studio-video"
          />
        )}

        <div className="live-studio-stage-overlay">
          <LiveStatusPill status={session?.status} mode={session?.mode} compact />
          {webrtcError && (
            <div className="live-studio-error-box">
              <p className="live-studio-error">{webrtcError}</p>
              <button type="button" className="live-studio-retry-media" onClick={retryMedia}>
                <RefreshCw size={14} />
                Enable camera &amp; mic
              </button>
            </div>
          )}
          {webrtcStatus === 'connecting' && !webrtcError && (
            <p className="live-studio-error">Opening camera and microphone…</p>
          )}
        </div>

        {isWebRTC && isLive && localStream && (
          <div className="live-studio-media-controls">
            <button type="button" className="live-studio-media-btn" onClick={toggleMic} aria-label="Toggle microphone">
              {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button type="button" className="live-studio-media-btn" onClick={toggleCam} aria-label="Toggle camera">
              {camEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </div>
        )}
      </div>

      <div className="live-studio-tabs">
        <button
          type="button"
          className={panel === 'products' ? 'is-active' : ''}
          onClick={() => setPanel('products')}
        >
          <Package size={14} />
          Pin products
        </button>
        <button
          type="button"
          className={panel === 'chat' ? 'is-active' : ''}
          onClick={() => setPanel('chat')}
        >
          Chat
        </button>
      </div>

      {panel === 'products' && (
        <div className="live-studio-panel">
          {pinnedProduct && (
            <div className="live-studio-pinned">
              <img src={pinnedProduct.image} alt="" />
              <div>
                <p className="font-semibold text-sm">{pinnedProduct.title}</p>
                <p className="text-xs" style={{ color: 'var(--brand-primary)' }}>
                  ${Number(pinnedProduct.price || 0).toFixed(2)} · Pinned
                </p>
              </div>
              <button type="button" className="live-studio-unpin" onClick={() => unpinProduct()}>
                <PinOff size={16} />
              </button>
            </div>
          )}
          <p className="live-studio-hint">Tap a product to show it to all viewers with price and image.</p>
          <div className="live-studio-product-grid">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`live-studio-product${pinnedProduct?.productId === p.id ? ' is-pinned' : ''}`}
                onClick={() => pinProduct(p.id)}
              >
                {p.image && <img src={p.image} alt="" />}
                <span className="live-studio-product-title">{p.title}</span>
                <span className="live-studio-product-price">${Number(p.price || 0).toFixed(2)}</span>
                <Pin size={12} className="live-studio-pin-icon" />
              </button>
            ))}
            {!products.length && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Add products to your catalog to pin during live.
              </p>
            )}
          </div>
        </div>
      )}

      {panel === 'chat' && (
        <LiveChatPanel
          messages={chatMessages}
          onSend={sendChat}
          isSeller
          chatEnabled={chatEnabled}
          userDisplayName={sellerName}
        />
      )}

      {bidPanel}

      <footer className="live-studio-footer">
        <button
          type="button"
          className="live-studio-end"
          disabled={endMutation.isPending}
          onClick={() => endMutation.mutate()}
        >
          <Square size={14} />
          End live
        </button>
      </footer>
    </div>
  );
}
