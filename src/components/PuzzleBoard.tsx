import React, { useState, useRef } from 'react';
import { sounds } from '../services/sound';

interface PuzzleBoardProps {
  gridSize: number; // 5 for 5x5
  imageUrl: string;
  pieces: number[]; // 25 pieces arrangement
  onPiecesChange: (newPieces: number[], moveCount: number) => void;
  disabled?: boolean;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  gridSize = 5,
  imageUrl,
  pieces,
  onPiecesChange,
  disabled = false
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Swap two piece slots
  const swapPieces = (idxA: number, idxB: number) => {
    if (idxA === idxB || disabled) return;
    const nextPieces = [...pieces];
    const temp = nextPieces[idxA];
    nextPieces[idxA] = nextPieces[idxB];
    nextPieces[idxB] = temp;

    sounds.playPieceSwap();
    setSelectedIdx(null);
    setDraggingIdx(null);
    setDragOverIdx(null);
    onPiecesChange(nextPieces, 1);
  };

  // Reliable tap-to-swap logic for touch devices
  const handlePieceClick = (idx: number) => {
    if (disabled) return;

    if (selectedIdx === null) {
      setSelectedIdx(idx);
      sounds.playPieceSelect();
    } else if (selectedIdx === idx) {
      // Deselect on tapping the same piece
      setSelectedIdx(null);
    } else {
      // Swap with previously selected tile
      swapPieces(selectedIdx, idx);
    }
  };

  // Pointer drag logic
  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    if (disabled) return;
    if (e.isPrimary) {
      setDraggingIdx(idx);
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx === null || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const col = Math.min(gridSize - 1, Math.max(0, Math.floor((x / rect.width) * gridSize)));
      const row = Math.min(gridSize - 1, Math.max(0, Math.floor((y / rect.height) * gridSize)));
      const targetIdx = row * gridSize + col;
      if (targetIdx !== dragOverIdx) {
        setDragOverIdx(targetIdx);
      }
    } else {
      setDragOverIdx(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIdx !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }

      if (dragOverIdx !== null && dragOverIdx !== draggingIdx) {
        swapPieces(draggingIdx, dragOverIdx);
      } else {
        setDraggingIdx(null);
        setDragOverIdx(null);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mobile Hint Banner */}
      <div className="text-[11px] text-slate-500 font-semibold mb-2 flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
        <span>Tap two tiles to swap positions</span>
      </div>

      <div
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: 'min(90vw, 390px)',
          height: 'min(90vw, 390px)',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
        className={`grid gap-1 p-1 bg-slate-200 rounded-2xl border border-slate-300 shadow-sm relative select-none touch-none ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {pieces.map((canonicalPieceId, slotIdx) => {
          const origCol = canonicalPieceId % gridSize;
          const origRow = Math.floor(canonicalPieceId / gridSize);

          const bgPosX = gridSize > 1 ? (origCol / (gridSize - 1)) * 100 : 0;
          const bgPosY = gridSize > 1 ? (origRow / (gridSize - 1)) * 100 : 0;

          const isSelected = selectedIdx === slotIdx;
          const isDragging = draggingIdx === slotIdx;
          const isTarget = dragOverIdx === slotIdx && draggingIdx !== slotIdx;

          return (
            <div
              key={slotIdx}
              onPointerDown={(e) => handlePointerDown(slotIdx, e)}
              onClick={() => handlePieceClick(slotIdx)}
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                backgroundPosition: `${bgPosX}% ${bgPosY}%`
              }}
              className={`w-full h-full rounded-lg relative overflow-hidden transition-all duration-150 cursor-pointer shadow-sm puzzle-piece ${
                isSelected
                  ? 'is-selected ring-3 ring-blue-600 scale-[1.04] z-30'
                  : ''
              } ${isDragging ? 'is-dragging ring-3 ring-amber-500 scale-[1.05] z-40 opacity-90' : ''} ${
                isTarget ? 'ring-3 ring-emerald-500 scale-[1.03] z-20' : ''
              } hover:brightness-105 active:scale-95`}
            >
              {/* Subtle selected indicator */}
              {isSelected && (
                <div className="absolute inset-0 bg-blue-600/15 border-2 border-blue-600 rounded-lg pointer-events-none" />
              )}
              {isTarget && (
                <div className="absolute inset-0 bg-emerald-600/20 border-2 border-emerald-600 rounded-lg pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
