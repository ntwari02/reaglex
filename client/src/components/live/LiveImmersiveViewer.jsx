import { useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, Share2, Shield, Users } from 'lucide-react';

import LivePlayer from './LivePlayer';

import LiveStatusPill from './LiveStatusPill';

import LiveReactions from './LiveReactions';

import LivePinnedProduct from './LivePinnedProduct';

import WebRTCBroadcast from './WebRTCBroadcast';

import { useLiveSocket } from '../../hooks/useLiveSocket';

import { useWebRTC } from '../../hooks/useWebRTC';

import { useAuthStore } from '../../stores/authStore';
import { isLiveSessionHost } from '../../lib/liveSessionRole';



/**

 * TikTok-style immersive live viewer — transport layer agnostic.

 */

export default function LiveImmersiveViewer({

  session,

  timeline = [],

  isReplay = false,

  bidPanel = null,

  actionBar = null,

}) {

  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;



  const isSeller = isLiveSessionHost(user, session);



  const provider = session?.streamProvider || 'webrtc';

  const isWebRTC = provider === 'webrtc';

  const isLive = session?.status === 'live' && !isReplay;



  const {

    socket,

    viewerCount,

    pinnedProduct,

    reactions,

    emitReaction,

    viewerState,

  } = useLiveSocket(session?.id, {

    enabled: Boolean(session?.id) && !isReplay,

    token: token || undefined,

  });



  const webrtcRole = isSeller ? 'seller' : 'viewer';

  const { localStream, remoteStream, status: webrtcStatus } = useWebRTC({

    sessionId: session?.id,

    role: webrtcRole,

    socket,

    enabled: isWebRTC && isLive && Boolean(socket),

  });



  const displayViewers = isReplay ? session?.viewerCount : viewerCount;

  const pin = pinnedProduct;



  const playbackUrl = session?.playbackUrl || session?.streamUrl || '';



  const replayPins = useMemo(() => {

    if (!isReplay) return [];

    return (timeline || []).filter((e) => e.type === 'pin');

  }, [isReplay, timeline]);



  const showSellerPreview = isWebRTC && isLive && isSeller && localStream;



  return (

    <div className={`live-immersive${isReplay ? ' live-immersive--replay' : ''}`}>

      <header className="live-immersive-top">

        <button type="button" className="live-immersive-icon-btn" onClick={() => navigate(-1)} aria-label="Back">

          <ArrowLeft size={20} />

        </button>

        <div className="live-immersive-seller min-w-0 flex-1">

          <p className="live-immersive-seller-name">{session?.seller?.name || 'Seller'}</p>

          <p className="live-immersive-title">{session?.title}</p>

        </div>

        <span className="live-immersive-viewers">

          <Users size={12} />

          {displayViewers}

        </span>

        <button type="button" className="live-immersive-icon-btn" aria-label="Share">

          <Share2 size={18} />

        </button>

      </header>



      <div className="live-immersive-stage">

        {showSellerPreview ? (

          <WebRTCBroadcast stream={localStream} status={webrtcStatus} className="live-immersive-player" />

        ) : (

          <LivePlayer

            playbackUrl={playbackUrl}

            provider={provider}

            isLive={isLive}

            autoplay

            className="live-immersive-player"

            remoteStream={isWebRTC ? remoteStream : null}

            localStream={isWebRTC && !isSeller ? null : null}

            webrtcStatus={webrtcStatus || viewerState?.role}

          />

        )}



        <div className="live-immersive-overlay-top">

          <LiveStatusPill status={isReplay ? 'replay_available' : session?.status} mode={session?.mode} compact />

          {isWebRTC && isLive && (

            <span className="live-immersive-provider-badge">WebRTC</span>

          )}

          {session?.escrowProtected && (

            <span className="live-immersive-escrow">

              <Shield size={11} />

              Escrow

            </span>

          )}

        </div>



        <div className="live-immersive-overlay-side">

          {!isReplay && session?.features?.reactions !== false && (

            <LiveReactions reactions={reactions} onSend={emitReaction} compact />

          )}

        </div>



        <div className="live-immersive-overlay-bottom">

          <LivePinnedProduct product={pin} />

          {isReplay && replayPins.length > 0 && (

            <p className="live-replay-hint text-[10px] opacity-80">

              Replay · {replayPins.length} product moments

            </p>

          )}

        </div>

      </div>



      {session?.aiInsight && (

        <p className="live-immersive-ai">{session.aiInsight}</p>

      )}



      {bidPanel}

      {actionBar}

    </div>

  );

}

