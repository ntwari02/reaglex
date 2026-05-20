import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../../stores/toastStore';

function useLaunchCountdown(launchAt) {
  const [text, setText] = useState('00D : 00H : 00M');
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, launchAt - Date.now());
      const d = Math.floor(left / 86400000);
      const h = Math.floor((left % 86400000) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const pad = (n) => String(n).padStart(2, '0');
      setText(`${pad(d)}D : ${pad(h)}H : ${pad(m)}M`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [launchAt]);
  return text;
}

export default function UpcomingProductCard({ drop, onNotify }) {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);
  const countdown = useLaunchCountdown(drop.launchAt);

  const openDetail = () => {
    navigate('/upcoming', { state: { focusId: drop.id } });
  };

  const handleNotify = (e) => {
    e.stopPropagation();
    showToast(`You'll be notified when ${drop.name} launches`, 'success');
    onNotify?.(drop);
  };

  return (
    <article className="up-card" onClick={openDetail} role="button" tabIndex={0}>
      <div className="up-particles" aria-hidden />
      <div className="up-card-inner">
        <div className="up-card-left">
          <span className="up-badge">COMING SOON</span>
          <h3 className="up-card-name">{drop.name}</h3>
          <p className="up-card-desc">{drop.description}</p>
          <span className="up-countdown" aria-live="polite">
            {countdown}
          </span>
          <button type="button" className="up-notify-btn" onClick={handleNotify}>
            Notify Me
          </button>
        </div>
        <div className="up-card-right">
          <div className="up-img-glow" aria-hidden />
          <img
            src={drop.image}
            alt=""
            className="up-product-img"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    </article>
  );
}
