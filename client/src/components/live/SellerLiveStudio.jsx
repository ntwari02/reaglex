import { useState, useCallback, useEffect } from 'react';
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
  Radio,
  Package,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import WebRTCBroadcast from './WebRTCBroadcast';
import LiveChatPanel from './LiveChatPanel';
import { useLiveSocket } from '../../hooks/useLiveSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSellerLivePresence } from '../../hooks/useSellerLivePresence';
import { useSellerLiveHost } from '../../hooks/useSellerLiveHost';
import { clearSellerLiveHost } from '../../live/sellerLiveHost';
import { liveCommerceApi } from '../../services/liveCommerceApi';
import { useToastStore } from '../../stores/toastStore';
import '../../styles/seller-live-studio.css';

export default function SellerLiveStudio({ session, bidPanel = null }) {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const [panel, setPanel] = useState('products');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('rx-live-seller-page');
    return () => document.documentElement.classList.remove('rx-live-seller-page');
  }, []);

  const isWebRTC = (session?.streamProvider || 'webrtc') === 'webrtc';
  const isLive = session?.status === 'live';
  const sessionId = session?.id;

  const {
    socket,
    connected,
    viewerCount,
    pinnedProduct,
    chatMessages,
    chatEnabled,
    pinProduct,
    unpinProduct,
    sendChat,
  } = useLiveSocket(sessionId, { enabled: Boolean(sessionId), token: token || undefined });

  const {
    localStream,
    status: webrtcStatus,
    error: webrtcError,
    micEnabled,
    camEnabled,
    toggleMic,
    toggleCam,
    startMedia,
    stopMedia,
  } = useWebRTC({
    sessionId,
    role: 'seller',
    socket,
    enabled: isWebRTC && isLive && broadcasting,
    mediaActive: broadcasting,
  });

  useSellerLiveHost(sessionId, { enabled: isLive && Boolean(sessionId) });

  useSellerLivePresence(sessionId, {
    socket,
    enabled: isLive && broadcasting && Boolean(sessionId),
    token: token || undefined,
  });

  useEffect(() => {
    const onEnded = () => {
      stopMedia();
      setBroadcasting(false);
    };
    window.addEventListener('rx-seller-live-ended', onEnded);
    return () => window.removeEventListener('rx-seller-live-ended', onEnded);
  }, [stopMedia]);

  const { data: productsData } = useQuery({
    queryKey: ['live-commerce', 'seller-products', sessionId],
    queryFn: () => liveCommerceApi.getSellerProducts(session.id),
    enabled: Boolean(sessionId),
  });

  const endMutation = useMutation({
    mutationFn: () => liveCommerceApi.endStream(session.id),
    onSuccess: () => {
      clearSellerLiveHost(session.id);
      stopMedia();
      setBroadcasting(false);
      showToast('Live ended', 'success');
      navigate('/seller');
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || 'Could not end live', 'error');
    },
  });

  const handleStartBroadcast = useCallback(async () => {
    const ok = await startMedia();
    if (ok) setBroadcasting(true);
  }, [startMedia]);

  const handleEndLive = () => {
    if (window.confirm('End this live stream for all viewers?')) {
      endMutation.mutate();
    }
  };

  const products = productsData?.products || [];
  const sellerName = session?.seller?.name || 'You';
  const onAir = broadcasting && localStream && webrtcStatus === 'live';

  return (
    <div className="sls-root">
      <header className="sls-header">
        <button
          type="button"
          className="sls-icon-btn"
          onClick={() => navigate('/seller')}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="sls-header-text">
          <span className="sls-kicker">Seller studio</span>
          <h1 className="sls-title">{session?.title}</h1>
        </div>
        <div className="sls-header-stats">
          <span className="sls-live-pill">
            <Radio size={12} />
            {onAir ? 'ON AIR' : 'READY'}
          </span>
          <span className="sls-viewers">
            <Users size={14} />
            {viewerCount}
          </span>
        </div>
      </header>

      <div className="sls-video-card">
        <div className="sls-video-wrap">
          {broadcasting ? (
            <WebRTCBroadcast
              stream={localStream}
              status={webrtcStatus}
              className="sls-video"
              micOn={micEnabled}
              camOn={camEnabled}
            />
          ) : (
            <div className="sls-video-placeholder">
              <Video size={40} strokeWidth={1.25} />
              <p>Camera preview appears here</p>
            </div>
          )}

          {!broadcasting && (
            <div className="sls-prebroadcast">
              <p className="sls-prebroadcast-title">Ready to go live?</p>
              <p className="sls-prebroadcast-sub">
                Tap below so your browser can use the camera and microphone (required on mobile).
              </p>
              <button type="button" className="sls-start-btn" onClick={handleStartBroadcast}>
                <Video size={18} />
                Start camera &amp; microphone
              </button>
            </div>
          )}

          {webrtcError && (
            <div className="sls-error-banner">
              <p>{webrtcError}</p>
              <button type="button" onClick={handleStartBroadcast}>
                Try again
              </button>
            </div>
          )}

          {broadcasting && webrtcStatus === 'connecting' && (
            <div className="sls-connecting">
              <Loader2 size={20} className="sls-spin" />
              <span>Starting camera…</span>
            </div>
          )}
        </div>

        {broadcasting && (
          <div className="sls-dock">
            <button
              type="button"
              className={`sls-dock-btn${micEnabled ? '' : ' is-off'}`}
              onClick={toggleMic}
              aria-label="Microphone"
            >
              {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              type="button"
              className={`sls-dock-btn${camEnabled ? '' : ' is-off'}`}
              onClick={toggleCam}
              aria-label="Camera"
            >
              {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              type="button"
              className="sls-dock-btn sls-dock-btn--end"
              disabled={endMutation.isPending}
              onClick={handleEndLive}
            >
              {endMutation.isPending ? <Loader2 size={18} className="sls-spin" /> : 'End'}
            </button>
          </div>
        )}
      </div>

      {!connected && broadcasting && (
        <p className="sls-socket-hint">Reconnecting to live server…</p>
      )}

      <nav className="sls-tabs" aria-label="Studio panels">
        <button
          type="button"
          className={panel === 'products' ? 'is-active' : ''}
          onClick={() => setPanel('products')}
        >
          <Package size={15} />
          Products
        </button>
        <button
          type="button"
          className={panel === 'chat' ? 'is-active' : ''}
          onClick={() => setPanel('chat')}
        >
          <MessageCircle size={15} />
          Chat
        </button>
      </nav>

      <div className="sls-scroll">
        {panel === 'products' && (
          <div className="sls-panel">
            {pinnedProduct && (
              <div className="sls-pinned">
                {pinnedProduct.image && <img src={pinnedProduct.image} alt="" />}
                <div>
                  <p className="sls-pinned-title">{pinnedProduct.title}</p>
                  <p className="sls-pinned-price">${Number(pinnedProduct.price || 0).toFixed(2)}</p>
                </div>
                <button type="button" className="sls-unpin" onClick={() => unpinProduct()} aria-label="Unpin">
                  <PinOff size={16} />
                </button>
              </div>
            )}
            <div className="sls-product-grid">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`sls-product${pinnedProduct?.productId === p.id ? ' is-pinned' : ''}`}
                  onClick={() => pinProduct(p.id)}
                  disabled={!broadcasting}
                >
                  {p.image && <img src={p.image} alt="" />}
                  <span className="sls-product-name">{p.title}</span>
                  <span className="sls-product-price">${Number(p.price || 0).toFixed(2)}</span>
                  <Pin size={12} className="sls-pin-icon" />
                </button>
              ))}
            </div>
          </div>
        )}

        {panel === 'chat' && (
          <LiveChatPanel
            messages={chatMessages}
            onSend={sendChat}
            isSeller
            chatEnabled={chatEnabled && broadcasting}
            userDisplayName={sellerName}
          />
        )}

        {bidPanel}
      </div>
    </div>
  );
}
