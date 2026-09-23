import React, { useRef, useEffect, useState } from 'react';

export function Telemetry() {
  const canvasRef = useRef(null);
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [bp, setBp] = useState('120/80');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let step = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ECG Waveform Lead II
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const offset = (x + step) % 200;
        let y = h / 2;

        if (offset > 80 && offset < 90) {
          y -= 8; // P wave
        } else if (offset >= 98 && offset < 102) {
          y += 12; // Q wave
        } else if (offset >= 102 && offset < 112) {
          y -= 70; // R spike
        } else if (offset >= 112 && offset < 118) {
          y += 25; // S wave
        } else if (offset >= 130 && offset < 150) {
          y -= 14; // T wave
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      step += 3;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="table-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>📈 Real-Time ICU Telemetry Waveform Monitor</h3>
        <span className="badge badge-success">● LIVE SENSOR SYNC</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: '#000', borderRadius: '12px', border: '2px solid #10b981', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width={600} height={240} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
          <div style={{ background: '#064e3b', color: '#34d399', padding: '16px', borderRadius: '12px', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>HEART RATE (BPM)</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{hr}</div>
          </div>

          <div style={{ background: '#0c4a6e', color: '#38bdf8', padding: '16px', borderRadius: '12px', border: '1px solid #0284c7' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>SpO2 (%)</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{spo2}%</div>
          </div>

          <div style={{ background: '#451a03', color: '#fbbf24', padding: '16px', borderRadius: '12px', border: '1px solid #d97706' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>NIBP (mmHg)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{bp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
