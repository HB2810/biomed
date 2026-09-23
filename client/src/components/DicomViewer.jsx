import React, { useRef, useEffect, useState } from 'react';

export function DicomViewer() {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Draw synthetic DICOM Chest Radiograph simulation
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);

    // Thoracic rib cage & lung field background
    const grad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, 180);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.6, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(width/2, height/2, 160, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spine & Ribs outline
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.lineWidth = 6;
    for (let y = 100; y <= 380; y += 30) {
      ctx.beginPath();
      ctx.arc(width/2, y, 110, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // Cardiac Silhouette
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.ellipse(width/2 + 30, height/2 + 20, 65, 85, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // DICOM Overlay Text
    ctx.fillStyle = '#00ffcc';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText('PATIENT: DOE, JOHN [M] 48Y', 16, 24);
    ctx.fillText('ID: RAD-DICOM-99201', 16, 42);
    ctx.fillText('MODALITY: CR / DX CHEST PA', 16, 60);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`ZOOM: ${(zoom * 100).toFixed(0)}%`, width - 140, 24);
    ctx.fillText(`WINDOW: ${contrast}% L:${brightness}%`, width - 180, 42);
  }, [zoom, brightness, contrast]);

  return (
    <div className="table-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🔬 Clinical DICOM Radiology Suite</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>🔍- Zoom Out</button>
          <button className="btn btn-secondary" onClick={() => setZoom(z => Math.min(3.0, z + 0.2))}>🔍+ Zoom In</button>
          <button className="btn btn-primary" onClick={() => { setZoom(1.0); setBrightness(100); setContrast(100); }}>🔄 Reset View</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border-strong)' }}>
          <canvas ref={canvasRef} width={500} height={460} />
        </div>

        <div style={{ flex: 1, minWidth: '260px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>🎛️ Diagnostic Window Controls</h4>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Brightness Level ({brightness}%)</label>
            <input type="range" min="30" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Contrast Window ({contrast}%)</label>
            <input type="range" min="30" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--blue-primary)', marginBottom: '4px' }}>📋 Radiographic Metadata:</div>
            <div>• Matrix Size: 512 x 512 (16-bit)</div>
            <div>• Slice Thickness: 2.5 mm</div>
            <div>• Acquisition Date: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
