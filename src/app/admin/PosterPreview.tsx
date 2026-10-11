"use client";
import { useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/content";

// Loads the real player in preview mode inside an iframe and scales it to the
// container. Same file, same CSS, same fonts as the TV, so the preview cannot drift.
export default function PosterPreview({ slide }: { slide: Slide }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.25);
  const [ready, setReady] = useState(false);
  const W = slide.full ? 1920 : 1400;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    setScale(el.clientWidth / W);
    return () => ro.disconnect();
  }, [W]);

  const json = JSON.stringify(slide);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage({ type: "tv-preview", slide: JSON.parse(json) }, window.location.origin);
  }, [json, ready]);

  return (
    <>
      <div className={"preview" + (slide.full ? " full" : "")} ref={box}>
        <iframe
          ref={frame}
          src="/tv.html?preview=1"
          title="Previzualizare TV"
          style={{ transform: `scale(${scale})` }}
          onLoad={() => setReady(true)}
        />
      </div>
      <div className="preview-lbl">
        Previzualizare 1:1 cu ecranul ({slide.full ? "tot televizorul, 1920×1080" : "1400×960"}). Textul care nu încape
        aici nu încape nici pe perete.
      </div>
    </>
  );
}
