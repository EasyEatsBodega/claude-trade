'use client';

import { useEffect, useRef } from 'react';
import { formatUsd } from '@/lib/format';

interface DataPoint {
  equity: number;
  snapshot_at: string;
}

export function EquityChart({ data }: { data: DataPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 10, bottom: 30, left: 70 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const equities = data.map((d) => d.equity);
    const minEq = Math.min(...equities) * 0.98;
    const maxEq = Math.max(...equities) * 1.02;
    const range = maxEq - minEq || 1;

    const toX = (i: number) => padding.left + (i / (data.length - 1)) * plotW;
    const toY = (eq: number) =>
      padding.top + (1 - (eq - minEq) / range) * plotH;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = maxEq - (i / gridLines) * range;
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatUsd(val), padding.left - 8, y + 4);
    }

    // Starting balance line
    const startY = toY(10000);
    if (startY >= padding.top && startY <= padding.top + plotH) {
      ctx.strokeStyle = '#374151';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, startY);
      ctx.lineTo(w - padding.right, startY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Line
    const lastEquity = equities[equities.length - 1];
    const lineColor = lastEquity >= 10000 ? '#22c55e' : '#ef4444';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = toX(i);
      const y = toY(d.equity);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h);
    gradient.addColorStop(0, lineColor + '20');
    gradient.addColorStop(1, lineColor + '00');
    ctx.fillStyle = gradient;
    ctx.lineTo(toX(data.length - 1), padding.top + plotH);
    ctx.lineTo(toX(0), padding.top + plotH);
    ctx.closePath();
    ctx.fill();

    // Date labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const labelCount = Math.min(5, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (data.length - 1));
      const d = new Date(data[idx].snapshot_at);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      ctx.fillText(label, toX(idx), h - 8);
    }
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 text-sm text-gray-500">
        Not enough data for chart
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-64 rounded-lg border border-gray-800"
      style={{ background: '#0a0a0a' }}
    />
  );
}
