import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Reply } from 'lucide-react';

export default function LiveChatPanel({
  messages = [],
  onSend,
  isSeller = false,
  chatEnabled = true,
  userDisplayName = 'You',
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!chatEnabled) {
    return (
      <div className="live-chat live-chat--off">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Chat is disabled for this stream.
        </p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend?.(trimmed, replyTo?.id);
    setText('');
    setReplyTo(null);
  };

  return (
    <div className={`live-chat${isSeller ? ' live-chat--seller' : ''}`}>
      <div className="live-chat-head">
        <MessageCircle size={16} />
        <span>Live chat</span>
        <span className="live-chat-count">{messages.length}</span>
      </div>

      <div className="live-chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="live-chat-empty">Say hi — seller and shoppers see messages in real time.</p>
        )}
        {messages.map((m) => {
          const isMine = m.displayName === userDisplayName;
          const isSellerMsg = m.isSellerReply || m.isHost;
          return (
            <div
              key={m.id}
              className={`live-chat-msg${isSellerMsg ? ' live-chat-msg--seller' : ''}${isMine ? ' live-chat-msg--mine' : ''}`}
            >
              <div className="live-chat-msg-meta">
                <span className="live-chat-msg-name">{m.displayName}</span>
                {isSellerMsg && <span className="live-chat-msg-badge">Seller</span>}
              </div>
              {m.replyToName && (
                <p className="live-chat-reply-ref">↳ {m.replyToName}</p>
              )}
              <p className="live-chat-msg-text">{m.text}</p>
              {isSeller && !isSellerMsg && (
                <button
                  type="button"
                  className="live-chat-reply-btn"
                  onClick={() => setReplyTo(m)}
                >
                  <Reply size={12} />
                  Reply
                </button>
              )}
            </div>
          );
        })}
      </div>

      {replyTo && (
        <div className="live-chat-replying">
          <span>Replying to {replyTo.displayName}</span>
          <button type="button" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </div>
      )}

      <form className="live-chat-form" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isSeller ? 'Reply to buyers…' : 'Ask about the product…'}
          maxLength={500}
          className="live-chat-input"
        />
        <button type="submit" className="live-chat-send" disabled={!text.trim()} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
