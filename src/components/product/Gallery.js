import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaExpand, FaFlag, FaHeart, FaImages, FaRegHeart, FaShareAlt, FaTimes } from "react-icons/fa";

const PLACEHOLDER = "/placeholder.jpg";
const fallback = (e) => { if (!e.currentTarget.src.endsWith(PLACEHOLDER)) e.currentTarget.src = PLACEHOLDER; };

// Swipeable gallery (native scroll-snap → smooth touch swipe), thumbnails on desktop, fullscreen viewer.
export default function Gallery({ images, title, liked, likes, onLike, onShare, onReport, badge }) {
  const list = images.length ? images : [PLACEHOLDER];
  const count = list.length;
  const track = useRef(null);
  const [i, setI] = useState(0);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbI, setLbI] = useState(0);

  const go = (n) => {
    const t = (n + count) % count;
    setI(t);
    const el = track.current;
    if (el && el.scrollTo) el.scrollTo({ left: t * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== i && n >= 0 && n < count) setI(n);
  };

  const lbPrev = useCallback(() => setLbI((n) => (n - 1 + count) % count), [count]);
  const lbNext = useCallback(() => setLbI((n) => (n + 1) % count), [count]);
  useEffect(() => {
    if (!lbOpen) return undefined;
    const key = (e) => { if (e.key === "ArrowLeft") lbPrev(); else if (e.key === "ArrowRight") lbNext(); else if (e.key === "Escape") setLbOpen(false); };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [lbOpen, lbPrev, lbNext]);

  const openLb = (n) => { setLbI(n); setLbOpen(true); };

  return (
    <div className="pv-gallery">
      <div className="pv-stage">
        <div className="pv-track" ref={track} onScroll={onScroll} tabIndex={0} aria-label={`${title} photos`}>
          {list.map((src, n) => (
            <button type="button" className="pv-slide" key={src + n} onClick={() => openLb(n)} aria-label={`Open photo ${n + 1} of ${count}`}>
              <img src={src} alt={`${title} – ${n + 1}/${count}`} loading={n === 0 ? "eager" : "lazy"} onError={fallback} draggable={false} />
            </button>
          ))}
        </div>

        {badge && <span className="pv-badge-status">{badge}</span>}

        <div className="pv-tools">
          {onReport && <button type="button" className="pv-tool" onClick={onReport}><FaFlag /><span>Report</span></button>}
          <button type="button" className={`pv-tool${liked ? " on" : ""}`} onClick={onLike} aria-pressed={liked} aria-label={liked ? "Remove from favorites" : "Save to favorites"}>
            {liked ? <FaHeart /> : <FaRegHeart />}<span>{likes} {likes === 1 ? "like" : "likes"}</span>
          </button>
          <button type="button" className="pv-tool" onClick={onShare} aria-label="Share"><FaShareAlt /><span>Share</span></button>
        </div>

        {count > 1 && (
          <>
            <button type="button" className="pv-arrow left" onClick={() => go(i - 1)} aria-label="Previous photo"><FaChevronLeft /></button>
            <button type="button" className="pv-arrow right" onClick={() => go(i + 1)} aria-label="Next photo"><FaChevronRight /></button>
            <div className="pv-dots" aria-hidden="true">{list.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
          </>
        )}

        <button type="button" className="pv-count" onClick={() => openLb(i)}><FaImages /> {count} {count === 1 ? "image" : "images"} <FaExpand /></button>
      </div>

      {count > 1 && (
        <div className="pv-thumbs">
          {list.map((src, n) => (
            <button type="button" key={src + n} className={n === i ? "on" : ""} onClick={() => go(n)} aria-label={`Show photo ${n + 1}`}>
              <img src={src} alt="" loading="lazy" onError={fallback} />
            </button>
          ))}
        </div>
      )}

      {lbOpen && (
        <div className="pv-lb" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setLbOpen(false)}>
          <button type="button" className="pv-lb-close" onClick={() => setLbOpen(false)} aria-label="Close"><FaTimes /></button>
          <img className="pv-lb-img" src={list[lbI]} alt={`${title} – ${lbI + 1}/${count}`} onClick={(e) => e.stopPropagation()} onError={fallback} />
          {count > 1 && (
            <>
              <button type="button" className="pv-lb-arrow left" onClick={(e) => { e.stopPropagation(); lbPrev(); }} aria-label="Previous"><FaChevronLeft /></button>
              <button type="button" className="pv-lb-arrow right" onClick={(e) => { e.stopPropagation(); lbNext(); }} aria-label="Next"><FaChevronRight /></button>
            </>
          )}
          <div className="pv-lb-count">{lbI + 1} / {count}</div>
        </div>
      )}
    </div>
  );
}
