import React from 'react';
import './ZoomPan.css';

type Props = {
  children: React.ReactNode;
  className?: string;
};

// Minimal zoom/pan container without external deps
export default function ZoomPan({ children, className }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const dragging = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const next = Math.min(6, Math.max(0.5, scale + delta * 0.0015));
    setScale(next);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onMouseUp = () => {
    dragging.current = false;
  };
  const onMouseLeave = () => {
    dragging.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - last.current.x, y: e.clientY - last.current.y });
  };

  // reflect state to CSS variables on elements (avoid inline styles in JSX)
  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.setProperty('--zoompan-x', `${pos.x}px`);
      contentRef.current.style.setProperty('--zoompan-y', `${pos.y}px`);
      contentRef.current.style.setProperty('--zoompan-scale', `${scale}`);
    }
    if (containerRef.current) {
      containerRef.current.style.setProperty('--zoompan-cursor', dragging.current ? 'grabbing' : 'grab');
    }
  }, [pos.x, pos.y, scale]);

  return (
    <div
      ref={containerRef}
      className={`zoompan-container ${className ?? ''}`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      <div
        ref={contentRef}
        className="zoompan-content"
        /* Styles fully handled by CSS via variables set on the element */
      >
        {children}
      </div>
    </div>
  );
}
