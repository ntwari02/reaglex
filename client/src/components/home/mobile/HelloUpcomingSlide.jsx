import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getHelloUpcomingSlide } from './upcomingProductsData';

function useCountdown(endMs) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, endMs - Date.now());
      const d = Math.floor(left / 86400000);
      const h = Math.floor((left % 86400000) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const pad = (n) => String(n).padStart(2, '0');
      setText(`${pad(d)}D : ${pad(h)}H : ${pad(m)}M`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endMs]);
  return text;
}

/** Single upcoming teaser slide for Hello carousel (mobile only). */
export default function HelloUpcomingSlide() {
  const slide = getHelloUpcomingSlide();
  const countdown = useCountdown(slide.countdownEnd);

  return (
    <article className="up-hello-slide">
      <div className="up-hello-inner">
        <div className="up-hello-left">
          <span className="up-badge">COMING SOON</span>
          <h2 className="up-hello-title">{slide.title}</h2>
          <p className="up-hello-sub">{slide.subtitle}</p>
          {countdown && <span className="up-countdown">{countdown}</span>}
          <Link to={slide.href} className="up-hello-cta">
            {slide.cta}
          </Link>
        </div>
        <div className="up-hello-right">
          <div className="up-img-glow" aria-hidden />
          <img src={slide.image} alt="" className="up-hello-img" loading="lazy" draggable={false} />
        </div>
      </div>
    </article>
  );
}
