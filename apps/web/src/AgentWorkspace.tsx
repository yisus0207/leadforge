import { useRef, useEffect } from 'react';

/* ════════════════════════════════════════════════════════
   🏢  ISOMETRIC VIRTUAL OFFICE — Agent Workspace
   ════════════════════════════════════════════════════════
   A cute 2.5D isometric office where robot agents walk
   around between desks, with animated legs, glowing
   antennas, and distinct body shapes per role.
   ════════════════════════════════════════════════════════ */

// ─── Types ───
interface WorkspaceAgent {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Robot {
  id: string;
  name: string;
  type: string;
  active: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  legPhase: number;
  pauseMs: number;
  facingDir: 1 | -1;
  bobPhase: number;
}

// ─── Isometric Grid Config ───
const TILE_W = 52;
const TILE_H = 26;
const COLS = 11;
const ROWS = 8;
const WALL_H = 70;

// ─── Color Palettes Per Agent Type ───
const PALETTE: Record<string, { main: string; dark: string; glowBase: string }> = {
  SALES:    { main: '#06B6D4', dark: '#0E7490', glowBase: 'rgba(6,182,212,' },
  SUPPORT:  { main: '#10B981', dark: '#047857', glowBase: 'rgba(16,185,129,' },
  BOOKING:  { main: '#F59E0B', dark: '#B45309', glowBase: 'rgba(245,158,11,' },
  LEAD_GEN: { main: '#8B5CF6', dark: '#6D28D9', glowBase: 'rgba(139,92,246,' },
};

function hexToRgbaPrefix(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 6;
  const g = parseInt(clean.substring(2, 4), 16) || 182;
  const b = parseInt(clean.substring(4, 6), 16) || 212;
  return `rgba(${r},${g},${b},`;
}

const FLOOR_A = '#111827';
const FLOOR_B = '#0F172A';

// ─── Desk Positions (grid coords) ───
const DESKS = [
  { gx: 2, gy: 1 }, { gx: 6, gy: 1 }, { gx: 9, gy: 2 },
  { gx: 4, gy: 3 }, { gx: 7, gy: 4 }, { gx: 2, gy: 5 },
  { gx: 5, gy: 6 }, { gx: 8, gy: 6 },
];

// ─── Plant Positions ───
const PLANTS = [
  { gx: 0.3, gy: 0.3 }, { gx: 10, gy: 0.5 },
  { gx: 0.5, gy: 7 }, { gx: 9.5, gy: 7 },
];

// ═══ Helper: world grid → isometric screen coordinates ═══
function toIso(wx: number, wy: number, cx: number, cy: number): [number, number] {
  return [
    cx + (wx - wy) * (TILE_W / 2),
    cy + (wx + wy) * (TILE_H / 2),
  ];
}

// ═══ Helper: draw isometric diamond tile ═══
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  fill: string, stroke?: string
) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

// ═══ Helper: draw a rounded rectangle (compat fallback) ═══
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════
export function AgentWorkspace({ agents }: { agents: WorkspaceAgent[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const robotsRef = useRef<Robot[]>([]);
  const rafRef    = useRef(0);
  const prevTsRef = useRef(0);

  // ── Initialize / sync robots from agents prop ──
  useEffect(() => {
    // Build new array preserving positions of existing robots
    const existing = robotsRef.current;
    robotsRef.current = agents.map((a, i) => {
      const prev = existing.find(r => r.id === a.id);
      if (prev) {
        // Sync mutable fields
        prev.active = a.status === 'ACTIVE';
        prev.name = a.name;
        prev.type = a.type;
        return prev;
      }
      // New robot — place near a desk
      const desk = DESKS[i % DESKS.length];
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        active: a.status === 'ACTIVE',
        x: desk.gx + 0.5 + Math.random() * 0.5,
        y: desk.gy + 0.8 + Math.random() * 0.5,
        targetX: desk.gx + 0.5,
        targetY: desk.gy + 1,
        speed: 0.011 + Math.random() * 0.009,
        legPhase: Math.random() * Math.PI * 2,
        pauseMs: Math.random() * 2000,
        facingDir: 1 as const,
        bobPhase: Math.random() * Math.PI * 2,
      };
    });
  }, [agents]);

  // ── Canvas animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let alive = true;

    function handleResize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width  = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    handleResize();
    window.addEventListener('resize', handleResize);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  RENDER FRAME
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function tick(ts: number) {
      if (!alive) return;
      const dt = prevTsRef.current ? Math.min(ts - prevTsRef.current, 50) : 16;
      prevTsRef.current = ts;

      const W = canvas!.getBoundingClientRect().width;
      const H = canvas!.getBoundingClientRect().height;
      const cx = W / 2;
      const cy = H * 0.15;

      ctx!.clearRect(0, 0, W, H);

      // ── BACKGROUND ──
      const bg = ctx!.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#060B14');
      bg.addColorStop(1, '#0B1220');
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // ── WALLS ──
      const [topX, topY]     = toIso(0, 0, cx, cy);
      const [leftX, leftY]   = toIso(0, ROWS, cx, cy);
      const [rightX, rightY] = toIso(COLS, 0, cx, cy);

      // Left wall
      ctx!.beginPath();
      ctx!.moveTo(topX, topY);
      ctx!.lineTo(topX, topY - WALL_H);
      ctx!.lineTo(leftX, leftY - WALL_H);
      ctx!.lineTo(leftX, leftY);
      ctx!.closePath();
      const leftWallGrad = ctx!.createLinearGradient(topX, topY - WALL_H, leftX, leftY);
      leftWallGrad.addColorStop(0, '#0D1B2A');
      leftWallGrad.addColorStop(1, '#0A1628');
      ctx!.fillStyle = leftWallGrad;
      ctx!.fill();
      ctx!.strokeStyle = '#1E293B';
      ctx!.lineWidth = 0.8;
      ctx!.stroke();

      // Right wall
      ctx!.beginPath();
      ctx!.moveTo(topX, topY);
      ctx!.lineTo(topX, topY - WALL_H);
      ctx!.lineTo(rightX, rightY - WALL_H);
      ctx!.lineTo(rightX, rightY);
      ctx!.closePath();
      const rightWallGrad = ctx!.createLinearGradient(topX, topY - WALL_H, rightX, rightY);
      rightWallGrad.addColorStop(0, '#0F1D30');
      rightWallGrad.addColorStop(1, '#0C1726');
      ctx!.fillStyle = rightWallGrad;
      ctx!.fill();
      ctx!.strokeStyle = '#1E293B';
      ctx!.lineWidth = 0.8;
      ctx!.stroke();

      // Window on left wall (decorative)
      const winLx1 = topX + (leftX - topX) * 0.25;
      const winLy1 = topY + (leftY - topY) * 0.25 - WALL_H + 15;
      const winLx2 = topX + (leftX - topX) * 0.55;
      const winLy2 = topY + (leftY - topY) * 0.55 - WALL_H + 15;
      ctx!.beginPath();
      ctx!.moveTo(winLx1, winLy1);
      ctx!.lineTo(winLx2, winLy2);
      ctx!.lineTo(winLx2, winLy2 + 25);
      ctx!.lineTo(winLx1, winLy1 + 25);
      ctx!.closePath();
      const winGrad = ctx!.createLinearGradient(winLx1, winLy1, winLx1, winLy1 + 25);
      winGrad.addColorStop(0, 'rgba(6,182,212,0.08)');
      winGrad.addColorStop(0.5, 'rgba(6,182,212,0.15)');
      winGrad.addColorStop(1, 'rgba(6,182,212,0.05)');
      ctx!.fillStyle = winGrad;
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(6,182,212,0.2)';
      ctx!.lineWidth = 0.8;
      ctx!.stroke();
      // Window cross
      const winMidX = (winLx1 + winLx2) / 2;
      const winMidY1 = (winLy1 + winLy2) / 2;
      const winMidY2 = winMidY1 + 25;
      ctx!.beginPath();
      ctx!.moveTo(winMidX, winMidY1);
      ctx!.lineTo(winMidX, winMidY2);
      ctx!.moveTo(winLx1, winLy1 + 12.5);
      ctx!.lineTo(winLx2, winLy2 + 12.5);
      ctx!.strokeStyle = 'rgba(6,182,212,0.12)';
      ctx!.lineWidth = 0.5;
      ctx!.stroke();

      // Window on right wall
      const winRx1 = topX + (rightX - topX) * 0.3;
      const winRy1 = topY + (rightY - topY) * 0.3 - WALL_H + 15;
      const winRx2 = topX + (rightX - topX) * 0.65;
      const winRy2 = topY + (rightY - topY) * 0.65 - WALL_H + 15;
      ctx!.beginPath();
      ctx!.moveTo(winRx1, winRy1);
      ctx!.lineTo(winRx2, winRy2);
      ctx!.lineTo(winRx2, winRy2 + 25);
      ctx!.lineTo(winRx1, winRy1 + 25);
      ctx!.closePath();
      ctx!.fillStyle = winGrad;
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(6,182,212,0.2)';
      ctx!.lineWidth = 0.8;
      ctx!.stroke();

      // Wall-floor edge glow
      ctx!.beginPath();
      ctx!.moveTo(topX, topY);
      ctx!.lineTo(leftX, leftY);
      ctx!.strokeStyle = 'rgba(6,182,212,0.06)';
      ctx!.lineWidth = 2;
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(topX, topY);
      ctx!.lineTo(rightX, rightY);
      ctx!.stroke();

      // ── FLOOR TILES ──
      for (let gy = 0; gy < ROWS; gy++) {
        for (let gx = 0; gx < COLS; gx++) {
          const [sx, sy] = toIso(gx, gy, cx, cy);
          const shade = (gx + gy) % 2 === 0 ? FLOOR_A : FLOOR_B;
          drawDiamond(ctx!, sx, sy, TILE_W, TILE_H, shade, 'rgba(255,255,255,0.018)');
        }
      }

      // ── PLANTS (decorative) ──
      PLANTS.forEach(({ gx, gy }) => {
        const [px, py] = toIso(gx, gy, cx, cy);
        // Pot
        ctx!.fillStyle = '#78350F';
        ctx!.beginPath();
        ctx!.moveTo(px - 4, py - 4);
        ctx!.lineTo(px + 4, py - 4);
        ctx!.lineTo(px + 3, py + 2);
        ctx!.lineTo(px - 3, py + 2);
        ctx!.closePath();
        ctx!.fill();
        // Leaves
        ctx!.fillStyle = '#059669';
        ctx!.globalAlpha = 0.7;
        ctx!.beginPath();
        ctx!.arc(px, py - 9, 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px - 3, py - 6, 3.5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px + 3, py - 7, 3, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      });

      // ── DESKS ──
      DESKS.forEach(({ gx, gy }) => {
        const [sx, sy] = toIso(gx, gy, cx, cy);

        // Desk surface (raised diamond)
        drawDiamond(ctx!, sx, sy - 4, TILE_W * 0.6, TILE_H * 0.6, '#1E293B', 'rgba(255,255,255,0.04)');

        // Front edge (3D depth)
        ctx!.beginPath();
        ctx!.moveTo(sx, sy + TILE_H * 0.3 - 4);
        ctx!.lineTo(sx + TILE_W * 0.3, sy - 4);
        ctx!.lineTo(sx + TILE_W * 0.3, sy - 1);
        ctx!.lineTo(sx, sy + TILE_H * 0.3 - 1);
        ctx!.closePath();
        ctx!.fillStyle = '#172033';
        ctx!.fill();

        ctx!.beginPath();
        ctx!.moveTo(sx, sy + TILE_H * 0.3 - 4);
        ctx!.lineTo(sx - TILE_W * 0.3, sy - 4);
        ctx!.lineTo(sx - TILE_W * 0.3, sy - 1);
        ctx!.lineTo(sx, sy + TILE_H * 0.3 - 1);
        ctx!.closePath();
        ctx!.fillStyle = '#131C2E';
        ctx!.fill();

        // Monitor stand
        ctx!.fillStyle = '#334155';
        ctx!.fillRect(sx - 1, sy - 14, 2, 7);

        // Monitor screen
        ctx!.fillStyle = '#0F172A';
        ctx!.fillRect(sx - 6, sy - 22, 12, 9);
        ctx!.strokeStyle = '#334155';
        ctx!.lineWidth = 0.6;
        ctx!.strokeRect(sx - 6, sy - 22, 12, 9);

        // Screen glow (animated)
        const flicker = 0.12 + Math.sin(ts * 0.003 + gx * 2 + gy) * 0.06;
        ctx!.fillStyle = `rgba(6,182,212,${flicker})`;
        ctx!.fillRect(sx - 5, sy - 21, 10, 7);

        // Code lines on screen
        ctx!.fillStyle = 'rgba(6,182,212,0.25)';
        for (let ln = 0; ln < 3; ln++) {
          const lw = 3 + Math.sin(gx + gy + ln) * 2;
          ctx!.fillRect(sx - 4, sy - 20 + ln * 2.2, lw, 0.8);
        }

        // Chair (small arc in front)
        const [chairX, chairY] = toIso(gx + 0.1, gy + 0.8, cx, cy);
        ctx!.beginPath();
        ctx!.arc(chairX, chairY - 2, 4, 0, Math.PI * 2);
        ctx!.fillStyle = '#1E293B';
        ctx!.fill();
        ctx!.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      });

      // ── ROBOTS (depth-sorted) ──
      const sorted = [...robotsRef.current].sort((a, b) => (a.x + a.y) - (b.x + b.y));

      sorted.forEach(robot => {
        const agObj = agents.find(a => a.id === robot.id);
        const customColor = (agObj as any)?.color;
        const basePal = PALETTE[robot.type] || PALETTE.SALES;
        const pal = customColor ? {
          main: customColor,
          dark: customColor,
          glowBase: hexToRgbaPrefix(customColor)
        } : basePal;
        const [sx, sy] = toIso(robot.x, robot.y, cx, cy);
        const isWalking = robot.active && robot.pauseMs <= 0;
        const bob = isWalking ? Math.sin(robot.bobPhase) * 1.5 : 0;

        // ── Shadow ──
        ctx!.beginPath();
        ctx!.ellipse(sx, sy + 2, 7, 3, 0, 0, Math.PI * 2);
        ctx!.fillStyle = robot.active ? pal.glowBase + '0.12)' : 'rgba(0,0,0,0.15)';
        ctx!.fill();

        // ── Legs ──
        const legSwing = isWalking ? Math.sin(robot.legPhase) * 3.5 : 0;
        ctx!.fillStyle = robot.active ? pal.dark : '#374151';
        // Left leg
        ctx!.beginPath();
        drawRoundedRect(ctx!, sx - 4, sy - 5 + legSwing + bob, 2.5, 7, 1);
        ctx!.fill();
        // Right leg
        ctx!.beginPath();
        drawRoundedRect(ctx!, sx + 1.5, sy - 5 - legSwing + bob, 2.5, 7, 1);
        ctx!.fill();

        // ── Shoes ──
        ctx!.fillStyle = robot.active ? pal.dark : '#374151';
        ctx!.beginPath();
        ctx!.ellipse(sx - 2.75, sy + 3 + legSwing + bob, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.ellipse(sx + 2.75, sy + 3 - legSwing + bob, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx!.fill();

        // ── Body ──
        ctx!.save();
        if (robot.active) {
          ctx!.shadowColor = pal.glowBase + '0.2)';
          ctx!.shadowBlur = 10;
        }
        ctx!.fillStyle = robot.active ? pal.main : '#4B5563';

        ctx!.beginPath();
        if (robot.type === 'SALES') {
          // Round body — friendly seller
          ctx!.ellipse(sx, sy - 10 + bob, 8, 9, 0, 0, Math.PI * 2);
        } else if (robot.type === 'SUPPORT') {
          // Square body — sturdy support
          drawRoundedRect(ctx!, sx - 7.5, sy - 18 + bob, 15, 14, 3);
        } else if (robot.type === 'BOOKING') {
          // Hexagon body — organized scheduler
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const hx = sx + 8 * Math.cos(angle);
            const hy = sy - 11 + bob + 8 * Math.sin(angle);
            i === 0 ? ctx!.moveTo(hx, hy) : ctx!.lineTo(hx, hy);
          }
          ctx!.closePath();
        } else {
          // Diamond/star body — energetic captador
          const pts = 5;
          for (let i = 0; i < pts * 2; i++) {
            const angle = (Math.PI / pts) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 9 : 4.5;
            const starX = sx + r * Math.cos(angle);
            const starY = sy - 11 + bob + r * Math.sin(angle);
            i === 0 ? ctx!.moveTo(starX, starY) : ctx!.lineTo(starX, starY);
          }
          ctx!.closePath();
        }
        ctx!.fill();
        ctx!.restore();

        // ── Arms ── (small rectangles on sides)
        const armSwing = isWalking ? Math.sin(robot.legPhase + 1) * 2 : 0;
        ctx!.fillStyle = robot.active ? pal.dark : '#374151';
        // Left arm
        ctx!.save();
        ctx!.translate(sx - 8, sy - 12 + bob);
        ctx!.rotate(-0.3 + armSwing * 0.08);
        ctx!.fillRect(-1, 0, 2, 6);
        ctx!.beginPath();
        ctx!.arc(0, 6, 1.5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
        // Right arm
        ctx!.save();
        ctx!.translate(sx + 8, sy - 12 + bob);
        ctx!.rotate(0.3 - armSwing * 0.08);
        ctx!.fillRect(-1, 0, 2, 6);
        ctx!.beginPath();
        ctx!.arc(0, 6, 1.5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

        // ── Head ──
        ctx!.beginPath();
        ctx!.arc(sx, sy - 22 + bob, 6, 0, Math.PI * 2);
        ctx!.fillStyle = robot.active ? pal.main : '#4B5563';
        ctx!.fill();
        // Head highlight
        ctx!.beginPath();
        ctx!.arc(sx - 1.5, sy - 24 + bob, 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(255,255,255,0.08)';
        ctx!.fill();

        // ── Visor / eyes ──
        // Eye background (visor band)
        ctx!.beginPath();
        drawRoundedRect(ctx!, sx - 5, sy - 24 + bob, 10, 3.5, 1.5);
        ctx!.fillStyle = robot.active ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)';
        ctx!.fill();
        // Eye dots
        const ed = robot.facingDir;
        ctx!.fillStyle = robot.active ? '#FFFFFF' : '#6B7280';
        ctx!.beginPath();
        ctx!.arc(sx - 2 + ed * 0.5, sy - 22.5 + bob, 1.2, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(sx + 2 + ed * 0.5, sy - 22.5 + bob, 1.2, 0, Math.PI * 2);
        ctx!.fill();

        // ── Antenna ──
        ctx!.beginPath();
        ctx!.moveTo(sx, sy - 28 + bob);
        ctx!.lineTo(sx, sy - 34 + bob);
        ctx!.strokeStyle = robot.active ? pal.main : '#4B5563';
        ctx!.lineWidth = 1.2;
        ctx!.stroke();
        // Antenna tip with glow
        ctx!.beginPath();
        ctx!.arc(sx, sy - 35 + bob, 2, 0, Math.PI * 2);
        ctx!.fillStyle = robot.active ? pal.main : '#4B5563';
        ctx!.fill();
        if (robot.active) {
          ctx!.save();
          ctx!.shadowColor = pal.glowBase + '0.6)';
          ctx!.shadowBlur = 6;
          ctx!.fill();
          ctx!.restore();
          // Blink antenna
          if (Math.sin(ts * 0.005 + parseInt(robot.id, 36)) > 0.7) {
            ctx!.beginPath();
            ctx!.arc(sx, sy - 35 + bob, 3.5, 0, Math.PI * 2);
            ctx!.fillStyle = pal.glowBase + '0.15)';
            ctx!.fill();
          }
        }

        // ── Mouth (small smile) ──
        if (robot.active) {
          ctx!.beginPath();
          ctx!.arc(sx + ed * 0.3, sy - 20 + bob, 2, 0.1, Math.PI - 0.1);
          ctx!.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx!.lineWidth = 0.6;
          ctx!.stroke();
        }

        // ── Name label ──
        ctx!.font = '600 8px Inter, system-ui, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillStyle = robot.active ? '#CBD5E1' : '#475569';
        const displayName = robot.name.length > 12 ? robot.name.slice(0, 11) + '…' : robot.name;
        // Text background
        const textW = ctx!.measureText(displayName).width;
        ctx!.fillStyle = 'rgba(0,0,0,0.4)';
        ctx!.beginPath();
        drawRoundedRect(ctx!, sx - textW / 2 - 3, sy - 44 + bob, textW + 6, 11, 3);
        ctx!.fill();
        // Text
        ctx!.fillStyle = robot.active ? '#E2E8F0' : '#64748B';
        ctx!.fillText(displayName, sx, sy - 36 + bob);

        // ── Status indicators ──
        if (!robot.active) {
          // ZZZ floating
          const zzBob = Math.sin(ts * 0.0015) * 3;
          ctx!.font = '10px sans-serif';
          ctx!.globalAlpha = 0.5 + Math.sin(ts * 0.002) * 0.2;
          ctx!.fillText('💤', sx + 10, sy - 26 + zzBob);
          ctx!.globalAlpha = 1;
        } else {
          // Bouncing activity dots above name
          for (let d = 0; d < 3; d++) {
            const dotBounce = Math.abs(Math.sin(ts * 0.005 + d * 1.0));
            ctx!.beginPath();
            ctx!.arc(sx - 3 + d * 3, sy - 48 + bob - dotBounce * 3, 1, 0, Math.PI * 2);
            ctx!.fillStyle = pal.main;
            ctx!.globalAlpha = 0.4 + dotBounce * 0.6;
            ctx!.fill();
            ctx!.globalAlpha = 1;
          }

          // Action tooltip while paused
          if (robot.pauseMs > 0 && robot.pauseMs < 1500) {
            const actionText = robot.type === 'SALES' ? '💬 Vendiendo...' :
                               robot.type === 'SUPPORT' ? '🔧 Reparando...' :
                               robot.type === 'BOOKING' ? '📋 Agendando...' :
                               '🔍 Buscando...';
            ctx!.font = '600 7px Inter, system-ui, sans-serif';
            const tw = ctx!.measureText(actionText).width;
            // Bubble
            ctx!.fillStyle = 'rgba(6,182,212,0.12)';
            ctx!.beginPath();
            drawRoundedRect(ctx!, sx - tw / 2 - 4, sy - 56 + bob, tw + 8, 12, 4);
            ctx!.fill();
            ctx!.strokeStyle = 'rgba(6,182,212,0.2)';
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
            // Bubble tail
            ctx!.beginPath();
            ctx!.moveTo(sx - 2, sy - 44 + bob);
            ctx!.lineTo(sx, sy - 41 + bob);
            ctx!.lineTo(sx + 2, sy - 44 + bob);
            ctx!.fillStyle = 'rgba(6,182,212,0.12)';
            ctx!.fill();
            // Text
            ctx!.fillStyle = '#CBD5E1';
            ctx!.fillText(actionText, sx, sy - 48 + bob);
          }
        }
      });

      // ── Ambient particles ──
      for (let p = 0; p < 8; p++) {
        const px = (W * 0.2) + Math.sin(ts * 0.0003 + p * 1.7) * (W * 0.3);
        const py = (H * 0.3) + Math.cos(ts * 0.0004 + p * 2.1) * (H * 0.25);
        const pAlpha = 0.04 + Math.sin(ts * 0.002 + p) * 0.03;
        ctx!.beginPath();
        ctx!.arc(px, py, 1, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(6,182,212,${pAlpha})`;
        ctx!.fill();
      }

      // ══ UPDATE ROBOT POSITIONS ══
      robotsRef.current.forEach(robot => {
        if (!robot.active) return;

        // Paused — just bob gently
        if (robot.pauseMs > 0) {
          robot.pauseMs -= dt;
          robot.bobPhase += 0.02;
          return;
        }

        const dx = robot.targetX - robot.x;
        const dy = robot.targetY - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.15) {
          // Arrived — pick new random target on the floor
          robot.targetX = 0.8 + Math.random() * (COLS - 2);
          robot.targetY = 0.8 + Math.random() * (ROWS - 2);
          robot.pauseMs = 1200 + Math.random() * 3000;
          return;
        }

        // Walk toward target
        const step = robot.speed * dt;
        robot.x += (dx / dist) * step;
        robot.y += (dy / dist) * step;
        robot.facingDir = dx > 0 ? 1 : -1;
        robot.legPhase += 0.18;
        robot.bobPhase += 0.1;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const activeCount = agents.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-leadforge-border bg-[#060B14]" style={{ minHeight: '420px' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ minHeight: '420px' }}
      />

      {/* Overlay: Title */}
      <div className="absolute top-3 left-4 flex items-center gap-2.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          🏢 Oficina Virtual
        </span>
        <span className="bg-leadforge-primary/15 text-leadforge-primary text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-leadforge-primary/20">
          {activeCount} agente{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Overlay: Live indicator */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-leadforge-secondary opacity-50"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-leadforge-secondary"></span>
        </span>
        <span className="text-[9px] text-leadforge-secondary font-bold uppercase tracking-wider">En vivo</span>
      </div>

      {/* Overlay: Legend */}
      <div className="absolute bottom-3 left-4 flex gap-4">
        {[
          { type: 'SALES', label: '● Vendedor', shape: 'Círculo' },
          { type: 'SUPPORT', label: '■ Soporte', shape: 'Cuadrado' },
          { type: 'BOOKING', label: '⬡ Reservas', shape: 'Hexágono' },
          { type: 'LEAD_GEN', label: '★ Captador', shape: 'Estrella' },
        ].map(item => {
          const pal = PALETTE[item.type];
          return (
            <div key={item.type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: pal.main, opacity: 0.8 }} />
              <span className="text-[8px] text-slate-500 font-semibold">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Overlay: Hint */}
      <div className="absolute bottom-3 right-4">
        <span className="text-[8px] text-slate-600 italic">Cada forma representa un tipo de agente diferente</span>
      </div>
    </div>
  );
}
