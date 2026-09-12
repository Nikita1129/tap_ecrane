"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Slide } from "@/lib/content";
import { newId } from "@/lib/content";
import { describeWindow, windowState } from "@/lib/schedule";

const STATE_LABEL = { on: "Pe ecran", outside: "În afara perioadei", off: "Oprit" } as const;

export default function PosterList({
  slides,
  onChange,
  onEdit,
}: {
  slides: Slide[];
  onChange: (s: Slide[]) => void;
  onEdit: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    onChange(arrayMove(slides, from, to));
  }

  if (!slides.length) return <div className="empty">Niciun poster. Adaugă unul mai sus.</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="list">
          {slides.map((s, i) => (
            <Row
              key={s.id}
              slide={s}
              index={i}
              count={slides.length}
              onEdit={() => onEdit(s.id)}
              onToggle={() => onChange(slides.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))}
              onMove={(d) => onChange(arrayMove(slides, i, i + d))}
              onDuplicate={() => {
                const copy = { ...s, id: newId("s"), pills: [...s.pills], days: [...s.days] };
                const next = [...slides];
                next.splice(i + 1, 0, copy);
                onChange(next);
              }}
              onDelete={() => onChange(slides.filter((x) => x.id !== s.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({
  slide,
  index,
  count,
  onEdit,
  onToggle,
  onMove,
  onDuplicate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  count: number;
  onEdit: () => void;
  onToggle: () => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const [confirming, setConfirming] = useState(false);
  const st = windowState(slide);
  const win = describeWindow(slide);
  const label = slide.type === "image" ? "Poster imagine" : slide.title || slide.kicker || "(fără titlu)";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={"card " + st + (isDragging ? " dragging" : "")}
    >
      <div className="prow">
        <div className="handle" {...attributes} {...listeners} aria-label="Trage pentru a reordona">
          ≡
        </div>
        <button className={"thumb" + (slide.type === "text" ? " text" + (slide.hot ? " hot" : "") : "")} onClick={onEdit} style={{ padding: 0, border: "1px solid var(--line)" }}>
          {slide.type === "image" ? (
            slide.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.img} alt="" loading="lazy" />
            ) : (
              <span style={{ color: "var(--muted)", fontSize: 11 }}>fără imagine</span>
            )
          ) : (
            <span>{slide.title || slide.kicker || "text"}</span>
          )}
        </button>
        <div className="pmeta" onClick={onEdit} role="button">
          <div className="t">
            {index + 1}. {label}
          </div>
          <div className="w">
            {win || "Permanent"} · {slide.secs}s · P{slide.prio}
          </div>
          <span className={"badge " + st}>{STATE_LABEL[st]}</span>
        </div>
        <button className={"sw" + (slide.active ? " on" : "")} onClick={onToggle} aria-label="Activ" />
      </div>
      <div className="row-actions">
        <button className="btn sm" onClick={onEdit}>
          Editează
        </button>
        <button className="btn sm" onClick={onDuplicate}>
          Duplică
        </button>
        <button className="btn sm ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Sus">
          ↑
        </button>
        <button className="btn sm ghost" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Jos">
          ↓
        </button>
        {confirming ? (
          <>
            <button className="btn sm danger" onClick={onDelete}>
              Da, șterge
            </button>
            <button className="btn sm ghost" onClick={() => setConfirming(false)}>
              Nu
            </button>
          </>
        ) : (
          <button className="btn sm ghost danger" onClick={() => setConfirming(true)}>
            Șterge
          </button>
        )}
      </div>
    </div>
  );
}
