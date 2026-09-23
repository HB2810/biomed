/**
 * BioMedPulse OS - DICOM & Medical Imaging Canvas Viewer Simulator
 * Supports Window/Level (Brightness/Contrast) adjustment, Zoom/Pan, Distance Measurement, and ROI HU Inspection
 */

class DicomViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentSeries = 'chest_ct';
        this.brightness = 100; // Window Center (0-200%)
        this.contrast = 100; // Window Width (0-200%)
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.tool = 'windowing'; // windowing, zoom, measure, roi

        this.isMouseDown = false;
        this.startMouseX = 0;
        this.startMouseY = 0;

        // Measurement line
        this.measureStart = null;
        this.measureEnd = null;

        // Sample Simulated DICOM slices (generated procedurally on canvas)
        this.imgDataCache = null;
    }

    init() {
        this.canvas = document.getElementById('dicom-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.bindEvents();
        this.renderSlice();
    }

    resizeCanvas() {
        if (!this.canvas || !this.canvas.parentElement) return;
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 420;
    }

    bindEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            const rect = this.canvas.getBoundingClientRect();
            this.startMouseX = e.clientX - rect.left;
            this.startMouseY = e.clientY - rect.top;

            if (this.tool === 'measure') {
                this.measureStart = { x: this.startMouseX, y: this.startMouseY };
                this.measureEnd = { x: this.startMouseX, y: this.startMouseY };
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;
            const rect = this.canvas.getBoundingClientRect();
            const currX = e.clientX - rect.left;
            const currY = e.clientY - rect.top;

            const deltaX = currX - this.startMouseX;
            const deltaY = currY - this.startMouseY;

            if (this.tool === 'windowing') {
                this.brightness = Math.max(20, Math.min(200, this.brightness + deltaY * 0.5));
                this.contrast = Math.max(20, Math.min(200, this.contrast + deltaX * 0.5));
                this.updateSliders();
            } else if (this.tool === 'zoom') {
                this.panX += deltaX;
                this.panY += deltaY;
            } else if (this.tool === 'measure') {
                this.measureEnd = { x: currX, y: currY };
            }

            this.startMouseX = currX;
            this.startMouseY = currY;
            this.renderSlice();
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.renderSlice();
        });
    }

    updateSliders() {
        const bSlider = document.getElementById('dicom-brightness-slider');
        const cSlider = document.getElementById('dicom-contrast-slider');
        if (bSlider) bSlider.value = this.brightness;
        if (cSlider) cSlider.value = this.contrast;
    }

    renderSlice() {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        this.ctx.fillStyle = '#020509';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.save();
        this.ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // Draw Simulated DICOM Image (Chest CT / MRI Brain slice)
        const size = Math.min(w, h) * 0.8;
        const half = size / 2;

        // Apply Windowing (filter effect)
        this.ctx.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%)`;

        // Render Chest CT Phantom
        this.ctx.fillStyle = '#111722';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, half, half * 0.75, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ribs (Bone - High HU white)
        this.ctx.strokeStyle = '#e0e6ed';
        this.ctx.lineWidth = 12;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, half * 0.9, half * 0.68, 0, 0, Math.PI * 2);
        this.ctx.stroke();

        // Spine (posterior bone)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, half * 0.55, 22, 0, Math.PI * 2);
        this.ctx.fill();

        // Lungs (Air/Parenchyma - Dark Low HU)
        this.ctx.fillStyle = '#050a12';
        // Left Lung
        this.ctx.beginPath();
        this.ctx.ellipse(-half * 0.45, -half * 0.05, half * 0.35, half * 0.45, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        // Right Lung
        this.ctx.beginPath();
        this.ctx.ellipse(half * 0.45, -half * 0.05, half * 0.35, half * 0.45, 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Heart / Mediastinum (Soft tissue - Mid Gray)
        this.ctx.fillStyle = '#3a4454';
        this.ctx.beginPath();
        this.ctx.ellipse(half * 0.08, -half * 0.08, half * 0.25, half * 0.32, 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Pulmonary Artery / Aorta
        this.ctx.fillStyle = '#5c697d';
        this.ctx.beginPath();
        this.ctx.arc(-15, -half * 0.25, 16, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        // Draw Overlays & Measurement Callipers
        this.drawOverlayText();
        this.drawMeasurement();
    }

    drawOverlayText() {
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.font = '12px "JetBrains Mono", monospace';

        this.ctx.fillText('PATIENT: DOE, JOHN [M/48]', 15, 25);
        this.ctx.fillText('STUDY: CHEST CT ANGIOGRAM W/ CONTRAST', 15, 42);
        this.ctx.fillText('ACC: #CT-8894102 | SLICE: 42/120', 15, 59);

        this.ctx.fillText(`WW/WL: W:${Math.round(this.contrast * 4)} C:${Math.round(this.brightness * 2 - 100)}`, this.canvas.width - 180, 25);
        this.ctx.fillText(`ZOOM: ${(this.zoom * 100).toFixed(0)}%`, this.canvas.width - 180, 42);
        this.ctx.fillText('FOV: 350mm | THICK: 1.25mm', this.canvas.width - 180, 59);
    }

    drawMeasurement() {
        if (!this.measureStart || !this.measureEnd) return;

        this.ctx.strokeStyle = '#ff0055';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.measureStart.x, this.measureStart.y);
        this.ctx.lineTo(this.measureEnd.x, this.measureEnd.y);
        this.ctx.stroke();

        // Calliper End Ticks
        const drawTick = (pt) => {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff0055';
            this.ctx.fill();
        };
        drawTick(this.measureStart);
        drawTick(this.measureEnd);

        // Distance Calculation (1px approx 0.8mm)
        const dx = this.measureEnd.x - this.measureStart.x;
        const dy = this.measureEnd.y - this.measureStart.y;
        const pxDist = Math.sqrt(dx * dx + dy * dy);
        const mmDist = (pxDist * 0.78).toFixed(1);

        this.ctx.fillStyle = '#ff0055';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.fillText(`${mmDist} mm`, (this.measureStart.x + this.measureEnd.x) / 2 + 10, (this.measureStart.y + this.measureEnd.y) / 2 - 10);
    }

    setTool(toolName) {
        this.tool = toolName;
    }

    resetView() {
        this.brightness = 100;
        this.contrast = 100;
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.measureStart = null;
        this.measureEnd = null;
        this.updateSliders();
        this.renderSlice();
    }
}

window.dicomViewer = new DicomViewer();
