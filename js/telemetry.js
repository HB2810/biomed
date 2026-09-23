/**
 * BioMedPulse OS - Real-Time Medical Device Telemetry & Patient Monitor Simulator
 * Renders high-frequency ECG Lead II, SpO2 Plethysmograph, and Respiration signals
 */

class TelemetryEngine {
    constructor() {
        this.ecgCanvas = null;
        this.ecgCtx = null;
        this.spo2Canvas = null;
        this.spo2Ctx = null;
        this.respCanvas = null;
        this.respCtx = null;

        this.animId = null;
        this.xPos = 0;
        this.speed = 2.5;

        // Vitals values
        this.hr = 75; // BPM
        this.spo2 = 98; // %
        this.nibpSystolic = 120;
        this.nibpDiastolic = 80;
        this.respRate = 16; // rpm
        this.temp = 36.8; // °C
        this.arrhythmia = false;
        this.alarmSilenced = false;
        this.audioBeepEnabled = false;

        // Web Audio API Synth
        this.audioCtx = null;

        // Waveform buffers
        this.ecgBuffer = [];
        this.spo2Buffer = [];
        this.respBuffer = [];

        this.lastBeatTime = 0;
    }

    init() {
        this.ecgCanvas = document.getElementById('telemetry-ecg-canvas');
        this.spo2Canvas = document.getElementById('telemetry-spo2-canvas');
        this.respCanvas = document.getElementById('telemetry-resp-canvas');

        if (!this.ecgCanvas || !this.spo2Canvas || !this.respCanvas) return;

        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());

        this.ecgCtx = this.ecgCanvas.getContext('2d');
        this.spo2Ctx = this.spo2Canvas.getContext('2d');
        this.respCtx = this.respCanvas.getContext('2d');

        this.clearCanvas(this.ecgCtx, this.ecgCanvas);
        this.clearCanvas(this.spo2Ctx, this.spo2Canvas);
        this.clearCanvas(this.respCtx, this.respCanvas);

        this.startLoop();
    }

    resizeCanvases() {
        [this.ecgCanvas, this.spo2Canvas, this.respCanvas].forEach(canvas => {
            if (canvas && canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = 120;
            }
        });
    }

    clearCanvas(ctx, canvas) {
        if (!ctx || !canvas) return;
        ctx.fillStyle = '#060b13';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.drawGrid(ctx, canvas);
    }

    drawGrid(ctx, canvas) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;

        const gridSize = 15;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    startLoop() {
        if (this.animId) cancelAnimationFrame(this.animId);

        let lastTime = performance.now();
        const render = (now) => {
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            this.updateSignals(now);
            this.animId = requestAnimationFrame(render);
        };
        this.animId = requestAnimationFrame(render);
    }

    updateSignals(now) {
        if (!this.ecgCanvas || !this.ecgCtx) return;

        const width = this.ecgCanvas.width;
        const ecgHeight = this.ecgCanvas.height;
        const spo2Height = this.spo2Canvas.height;
        const respHeight = this.respCanvas.height;

        const sweepWidth = 12;

        // Clear ahead of sweep bar
        this.ecgCtx.fillStyle = '#060b13';
        this.ecgCtx.fillRect(this.xPos, 0, sweepWidth, ecgHeight);
        this.drawGridSegment(this.ecgCtx, this.xPos, sweepWidth, ecgHeight);

        this.spo2Ctx.fillStyle = '#060b13';
        this.spo2Ctx.fillRect(this.xPos, 0, sweepWidth, spo2Height);
        this.drawGridSegment(this.spo2Ctx, this.xPos, sweepWidth, spo2Height);

        this.respCtx.fillStyle = '#060b13';
        this.respCtx.fillRect(this.xPos, 0, sweepWidth, respHeight);
        this.drawGridSegment(this.respCtx, this.xPos, sweepWidth, respHeight);

        // Generate waveform points
        const beatIntervalMs = (60 / this.hr) * 1000;
        const phase = ((now % beatIntervalMs) / beatIntervalMs);

        // ECG P-QRS-T synthesis
        let ecgY = ecgHeight / 2;
        if (phase < 0.1) {
            // P wave
            ecgY -= Math.sin(phase * Math.PI / 0.1) * 8;
        } else if (phase > 0.15 && phase < 0.18) {
            // Q wave
            ecgY += 6;
        } else if (phase >= 0.18 && phase < 0.24) {
            // R wave spike!
            const rPhase = (phase - 0.18) / 0.06;
            ecgY -= Math.sin(rPhase * Math.PI) * 48;

            if (rPhase > 0.4 && rPhase < 0.6 && (now - this.lastBeatTime > 400)) {
                this.lastBeatTime = now;
                this.playBeep();
                this.flashQRSIndicator();
            }
        } else if (phase >= 0.24 && phase < 0.28) {
            // S wave
            ecgY += 12;
        } else if (phase > 0.35 && phase < 0.55) {
            // T wave
            const tPhase = (phase - 0.35) / 0.20;
            ecgY -= Math.sin(tPhase * Math.PI) * 14;
        }

        // Noise & Arrhythmia simulation
        if (this.arrhythmia && Math.random() < 0.05) {
            ecgY += (Math.random() - 0.5) * 30; // PVC artifact
        } else {
            ecgY += (Math.random() - 0.5) * 2;
        }

        // SpO2 Pleth wave
        let spo2Y = spo2Height / 2;
        if (phase > 0.2 && phase < 0.7) {
            const plethPhase = (phase - 0.2) / 0.5;
            spo2Y -= Math.sin(plethPhase * Math.PI) * 32 * (this.spo2 / 100);
            if (plethPhase > 0.6 && plethPhase < 0.75) {
                // Dicrotic notch
                spo2Y += 6;
            }
        }

        // Respiration wave (slower period)
        const respPeriodMs = (60 / this.respRate) * 1000;
        const respPhase = ((now % respPeriodMs) / respPeriodMs);
        let respY = respHeight / 2 - Math.sin(respPhase * 2 * Math.PI) * 25;

        // Draw Line Segments
        const prevX = (this.xPos - this.speed + width) % width;

        // ECG Line
        this.ecgCtx.strokeStyle = '#00ff88';
        this.ecgCtx.lineWidth = 2.2;
        this.ecgCtx.shadowColor = '#00ff88';
        this.ecgCtx.shadowBlur = 6;
        this.ecgCtx.beginPath();
        this.ecgCtx.moveTo(prevX, this.lastEcgY || ecgHeight / 2);
        this.ecgCtx.lineTo(this.xPos, ecgY);
        this.ecgCtx.stroke();
        this.ecgCtx.shadowBlur = 0;
        this.lastEcgY = ecgY;

        // SpO2 Line
        this.spo2Ctx.strokeStyle = '#00f0ff';
        this.spo2Ctx.lineWidth = 2.0;
        this.spo2Ctx.shadowColor = '#00f0ff';
        this.spo2Ctx.shadowBlur = 5;
        this.spo2Ctx.beginPath();
        this.spo2Ctx.moveTo(prevX, this.lastSpo2Y || spo2Height / 2);
        this.spo2Ctx.lineTo(this.xPos, spo2Y);
        this.spo2Ctx.stroke();
        this.spo2Ctx.shadowBlur = 0;
        this.lastSpo2Y = spo2Y;

        // Resp Line
        this.respCtx.strokeStyle = '#ffb700';
        this.respCtx.lineWidth = 2.0;
        this.respCtx.shadowColor = '#ffb700';
        this.respCtx.shadowBlur = 5;
        this.respCtx.beginPath();
        this.respCtx.moveTo(prevX, this.lastRespY || respHeight / 2);
        this.respCtx.lineTo(this.xPos, respY);
        this.respCtx.stroke();
        this.respCtx.shadowBlur = 0;
        this.lastRespY = respY;

        // Advance X
        this.xPos = (this.xPos + this.speed) % width;
    }

    drawGridSegment(ctx, x, w, h) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 15;

        ctx.beginPath();
        for (let gx = Math.floor(x / gridSize) * gridSize; gx < x + w; gx += gridSize) {
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
        }
        for (let gy = 0; gy < h; gy += gridSize) {
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
        }
        ctx.stroke();
    }

    flashQRSIndicator() {
        const heartElem = document.getElementById('qrs-heart-icon');
        if (heartElem) {
            heartElem.classList.add('pulse-beat');
            setTimeout(() => heartElem.classList.remove('pulse-beat'), 150);
        }
    }

    playBeep() {
        if (!this.audioBeepEnabled) return;
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // Pitch A5
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.08);
        } catch (e) {
            // Audio policy fallback
        }
    }

    setVitals(hr, spo2, sys, dia, resp) {
        if (hr) this.hr = parseInt(hr);
        if (spo2) this.spo2 = parseInt(spo2);
        if (sys) this.nibpSystolic = parseInt(sys);
        if (dia) this.nibpDiastolic = parseInt(dia);
        if (resp) this.respRate = parseInt(resp);
        this.updateVitalsDisplay();
    }

    updateVitalsDisplay() {
        const hrEl = document.getElementById('vitals-hr');
        const spo2El = document.getElementById('vitals-spo2');
        const nibpEl = document.getElementById('vitals-nibp');
        const respEl = document.getElementById('vitals-resp');
        const tempEl = document.getElementById('vitals-temp');

        if (hrEl) hrEl.textContent = this.hr;
        if (spo2El) spo2El.textContent = this.spo2 + '%';
        if (nibpEl) nibpEl.textContent = `${this.nibpSystolic}/${this.nibpDiastolic}`;
        if (respEl) respEl.textContent = this.respRate;
        if (tempEl) tempEl.textContent = this.temp.toFixed(1) + '°C';
    }
}

window.telemetryEngine = new TelemetryEngine();
