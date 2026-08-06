'use client';

import { createElement, useEffect, useRef } from 'react';
import { GhostButton, Muted, XStack, YStack } from '@gymos/ui';

type SignaturePadProps = {
  onChange: (pngBase64: string | null) => void;
};

/** Web canvas signature pad. RN can swap this later with the same onChange contract. */
export const SignaturePad = ({ onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.clientWidth || 320;
    const height = 140;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const point = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onChange(null);
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.includes(',') ? (dataUrl.split(',')[1] ?? '') : dataUrl;
    onChange(base64.length > 0 ? base64 : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth || 320, 140);
    onChange(null);
  };

  const canvas = createElement('canvas', {
    ref: canvasRef,
    style: {
      width: '100%',
      height: 140,
      borderRadius: 12,
      border: '1px solid #d4d4d8',
      touchAction: 'none',
      background: '#fff',
      display: 'block',
    },
    'aria-label': 'Signature pad',
    onPointerDown: (e: { clientX: number; clientY: number; preventDefault: () => void }) => {
      e.preventDefault();
      drawing.current = true;
      const ctx = canvasRef.current?.getContext('2d');
      const p = point(e);
      if (!ctx || !p) return;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    },
    onPointerMove: (e: { clientX: number; clientY: number; preventDefault: () => void }) => {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      const p = point(e);
      if (!ctx || !p) return;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    onPointerUp: () => {
      if (!drawing.current) return;
      drawing.current = false;
      emit();
    },
    onPointerLeave: () => {
      if (!drawing.current) return;
      drawing.current = false;
      emit();
    },
  });

  return (
    <YStack gap="$2" width="100%">
      <Muted>Sign below with finger or mouse</Muted>
      {canvas}
      <XStack justifyContent="flex-end">
        <GhostButton onPress={clear}>Clear</GhostButton>
      </XStack>
    </YStack>
  );
};
