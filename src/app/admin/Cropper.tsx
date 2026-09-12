"use client";
import { useEffect, useRef, useState } from "react";

export type CropRect = { x: number; y: number; w: number; h: number }; // normalised 0..1 of the source image

const ASPECT = 1400 / 960;
const MAX_ZOOM = 4;

/**
 * Phone-first cropper. The frame has the TV poster aspect (1400x960). The image
 * is always at least as large as the frame (cover). One finger drags, two fingers
 * pinch, the slider zooms. No canvas work here: we only compute the rectangle
 * and the server cuts it from the full-resolution upload.
 */
export default function Cropper({
  src,
  imgW,
  imgH,
  busy,
  onConfirm,
  onWhole,
  onCancel,
}: {
  src: string;
  imgW: number;
  imgH: number;
  busy: boolean;
  onConfirm: (crop: CropRect) => void;
  onWhole: () => void;
  onCancel: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image top-left relative to frame top-left, CSS px
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; zoom: number; mid: { x: number; y: number }; off: { x: number; y: number } } | null>(null);

  // Measure the frame.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientWidth / ASPECT });
    measure();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base = frame.w ? Math.max(frame.w / imgW, frame.h / imgH) : 1; // cover scale
  const scale = base * zoom;
  const dispW = imgW * scale;
  const dispH = imgH * scale;

  function clamp(o: { x: number; y: number }, s = scale) {
    const dw = imgW * s;
    const dh = imgH * s;
    return {
      x: Math.min(0, Math.max(frame.w - dw, o.x)),
      y: Math.min(0, Math.max(frame.h - dh, o.y)),
    };
  }

  // Centre when the frame is first measured.
  useEffect(() => {
    if (!frame.w) return;
    setZoom(1);
    setOff({ x: (frame.w - imgW * base) / 2, y: (frame.h - imgH * base) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.w, frame.h, src]);

  function setZoomKeepingCentre(z: number) {
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    const ns = base * nz;
    // keep the frame centre pointing at the same image pixel
    const cx = frame.w / 2;
    const cy = frame.h / 2;
    const ix = (cx - off.x) / scale;
    const iy = (cy - off.y) / scale;
    setZoom(nz);
    setOff(clamp({ x: cx - ix * ns, y: cy - iy * ns }, ns));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  }
  function startGesture() {
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = { dist: 0, zoom, mid: pts[0], off };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        off,
      };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 1) {
      const dx = pts[0].x - g.mid.x;
      const dy = pts[0].y - g.mid.y;
      setOff(clamp({ x: g.off.x + dx, y: g.off.y + dy }));
    } else {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nz = Math.min(MAX_ZOOM, Math.max(1, (g.zoom * dist) / (g.dist || dist)));
      const ns = base * nz;
      const os = base * g.zoom;
      const rect = frameRef.current!.getBoundingClientRect();
      // image pixel under the initial midpoint stays under the current midpoint
      const ix = (g.mid.x - rect.left - g.off.x) / os;
      const iy = (g.mid.y - rect.top - g.off.y) / os;
      setZoom(nz);
      setOff(clamp({ x: mid.x - rect.left - ix * ns, y: mid.y - rect.top - iy * ns }, ns));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  }

  function confirm() {
    const crop: CropRect = {
      x: -off.x / dispW,
      y: -off.y / dispH,
      w: frame.w / dispW,
      h: frame.h / dispH,
    };
    onConfirm(crop);
  }

  return (
    <div className="cropper">
      <div
        ref={frameRef}
        className="crop-frame"
        style={{ height: frame.h || undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {frame.w > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            style={{ width: dispW, height: dispH, transform: `translate(${off.x}px, ${off.y}px)` }}
          />
        )}
        <div className="crop-grid" />
      </div>
      <div className="crop-zoom">
        <span>−</span>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoomKeepingCentre(Number(e.target.value))} />
        <span>+</span>
      </div>
      <div className="hint" style={{ textAlign: "center" }}>Trage cu degetul ca să poziționezi. Cadrul este exact ce apare pe ecran.</div>
      <div className="row-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" style={{ flex: 1 }} onClick={confirm} disabled={busy || !frame.w}>
          {busy ? "Se încarcă…" : "Decupează și încarcă"}
        </button>
        <button className="btn" onClick={onWhole} disabled={busy} title="Fără decupare, cu benzi întunecate">
          Întreagă
        </button>
        <button className="btn ghost" onClick={onCancel} disabled={busy}>
          Anulează
        </button>
      </div>
    </div>
  );
}
