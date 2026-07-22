import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cyberAudio } from './CyberAudio';

/* ════════════════════════════════════════════════════════
   🏢 3D AGENT BUILDING — LEADFORGE AI
   ════════════════════════════════════════════════════════
   A full 3D multi-floor headquarters with elevator,
   autonomous walking robots, door sliding mechanics,
   interactive camera controls, and live activity logs.
   ════════════════════════════════════════════════════════ */

export interface BuildingAgentProps {
  id: string;
  name: string;
  type: string; // 'SALES' | 'SUPPORT' | 'BOOKING' | 'LEAD_GEN'
  color?: string; // Custom neon color override
  status: string; // 'ACTIVE' | 'WAITING' | 'ERROR' | 'INACTIVE'
  objective?: string;
  prompt?: string;
  schedule?: string | null;
}

interface LogLine {
  id: number;
  agentId: string;
  tag: string;
  color: string;
  text: string;
  time: string;
}

// Color palettes
const PAL: Record<string, { main: string; dark: string; hex: number; rgb: string }> = {
  SALES: { main: '#06B6D4', dark: '#0E7490', hex: 0x06B6D4, rgb: '6,182,212' },
  SUPPORT: { main: '#10B981', dark: '#047857', hex: 0x10B981, rgb: '16,185,129' },
  BOOKING: { main: '#F59E0B', dark: '#B45309', hex: 0xF59E0B, rgb: '245,158,11' },
  LEAD_GEN: { main: '#8B5CF6', dark: '#6D28D9', hex: 0x8B5CF6, rgb: '139,92,246' },
  IT_DEVOPS: { main: '#3B82F6', dark: '#1D4ED8', hex: 0x3B82F6, rgb: '59,130,246' },
};

const STATUS_CFG: Record<string, { label: string; color: string; hex: number }> = {
  ACTIVE: { label: 'Trabajando', color: '#34D399', hex: 0x34D399 },
  WAITING: { label: 'En espera', color: '#FBBF24', hex: 0xFBBF24 },
  ERROR: { label: 'Error', color: '#F87171', hex: 0xF87171 },
  INACTIVE: { label: 'Inactivo', color: '#64748B', hex: 0x64748B },
};

const GLYPHS: Record<string, string> = {
  SALES: '💼',
  SUPPORT: '🎧',
  BOOKING: '📅',
  LEAD_GEN: '🎯',
  IT_DEVOPS: '💻',
};

const FLOORS_CONFIG = [
  { area: 'Reservas & Clientes', type: 'BOOKING' },
  { area: 'Prospección & Leads', type: 'LEAD_GEN' },
  { area: 'Atención & Soporte', type: 'SUPPORT' },
  { area: 'Ventas & Deals', type: 'SALES' },
  { area: 'TI & Servidores / Datacenter', type: 'IT_DEVOPS' },
];

// Layout constants
const FH = 7.5;      // Floor height
const HW = 16;       // Building half-width
const HD = 9;        // Building half-depth
const STAND = 0.35;  // Floor stand offset
const CZ = 1.2;      // Corridor half-depth
const SHX = 2.2;     // Shaft half-width
const SHZ = -5.2;    // Shaft doors z plane
const WALL_H = 2.1;  // Low walls height

const ROOMS_CONFIG: Record<string, { cx: number; cz: number; dx: number; doorIn: [number, number]; out: [number, number] }> = {
  bl: { cx: -9, cz: -5.2, dx: -9, doorIn: [-9, -2.2], out: [-9, 0] },
  br: { cx: 9, cz: -5.2, dx: 9, doorIn: [9, -2.2], out: [9, 0] },
  fl: { cx: -9, cz: 5.2, dx: -9, doorIn: [-9, 2.2], out: [-9, 0] },
  fr: { cx: 9, cz: 5.2, dx: 9, doorIn: [9, 2.2], out: [9, 0] },
};

const LOBBY_CONFIG = { doorIn: [0, -2.2] as [number, number], out: [0, 0] as [number, number], wait: [0, -3.6] as [number, number], board: [0, -7.0] as [number, number] };

export function AgentBuilding3D({
  agents: propAgents,
  activities: propActivities,
  onAgentClick
}: {
  agents?: BuildingAgentProps[];
  activities?: any[];
  onAgentClick?: (agentId: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const lastProcessedActIdRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<{ id: string; x: number; y: number; name: string; role: string; color: string; status: string; statusColor: string } | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  // Three.js internal references
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    robots: any[];
    robotMeshes: THREE.Mesh[];
    tickers: Array<(t: number, dt: number) => void>;
    elev: any;
    elevDoors: any[];
    exteriorWalls: {
      back: THREE.Mesh[];
      front: THREE.Mesh[];
      left: THREE.Mesh[];
      right: THREE.Mesh[];
    };
    tgtGoal: THREE.Vector3;
    zoomGoal: number | null;
    followId: string | null;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
  } | null>(null);

  // Map workspace agents to building floors by type
  const agentsList = React.useMemo(() => {
    const typeToFloor: Record<string, number> = {
      BOOKING: 0,
      LEAD_GEN: 1,
      SUPPORT: 2,
      SALES: 3,
      IT_DEVOPS: 4,
    };

    if (propAgents !== undefined) {
      return propAgents.map((a, idx) => ({
        id: a.id,
        name: a.name,
        task: a.objective || 'Automatización n8n',
        type: a.type || 'SALES',
        color: a.color,
        status: (a.status === 'ACTIVE' ? 'ACTIVE' : a.status === 'WAITING' ? 'WAITING' : 'INACTIVE') as string,
        floor: typeToFloor[a.type] ?? (idx % 4),
      }));
    }
    return [];
  }, [propAgents]);

  // Fetch live activities from API
  useEffect(() => {
    let isMounted = true;
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activities');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setLogs(data);
          }
        }
      } catch (e) {
        // Silently catch fetch errors
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  THREE.JS SCENE SETUP & ANIMATION LOOP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0035);

    // Helpers
    const mat = (hex: number, opts: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.72, metalness: 0.08 }, opts));

    const box = (w: number, h: number, depth: number, hex: number, opts?: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat(hex, opts));
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };

    const cyl = (rt: number, rb: number, h: number, hex: number, seg = 18, opts?: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(hex, opts));
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };

    const sphere = (r: number, hex: number, opts?: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat(hex, opts));
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };

    const tickers: Array<(t: number, dt: number) => void> = [];
    const robotMeshes: THREE.Mesh[] = [];

    // Skybox Dome (Radius 750m)
    const skyGeo = new THREE.SphereGeometry(750, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Volumetric Moving Clouds Layer
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const rad = 220 + (i % 5) * 60;
      const cloud = sphere(22 + (i % 3) * 14, 0xffffff, { transparent: true, opacity: 0.82, roughness: 1 });
      cloud.position.set(Math.cos(ang) * rad, 115 + (i % 5) * 15, Math.sin(ang) * rad);
      cloudGroup.add(cloud);
    }
    scene.add(cloudGroup);

    const aspect = W / H;
    const d = 36;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -300, 1200);
    camera.position.set(54, 46, 54);
    camera.lookAt(0, 13, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minZoom = 0.4;
    controls.maxZoom = 3.8;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 13, 0);

    // Dynamic Sunlight & Daylight Lighting
    scene.add(new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.95));
    const sun = new THREE.DirectionalLight(0xfff7ed, 1.25);
    sun.position.set(80, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 140;
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 450;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    fillLight.position.set(-60, 40, -40);
    scene.add(fillLight);
    // ── Build Huge Ground Terrain, SalasCo Central Plaza & Water Fountain ──
    const terrainGeo = new THREE.CircleGeometry(1000, 64);
    const terrainMat = mat(0x1e293b, { roughness: 0.95, metalness: 0.05 });
    const ground = new THREE.Mesh(terrainGeo, terrainMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const plaza = box(HW * 2 + 18, 0.3, HD * 2 + 18, 0xe2e8f0);
    plaza.position.y = -0.35;
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Central Water Fountain & Reflection Pool
    const poolRing = cyl(4.2, 4.5, 0.5, 0x3b82f6, 24, { metalness: 0.3, roughness: 0.2 });
    poolRing.position.set(-14, -0.1, 0); scene.add(poolRing);

    const poolWater = cyl(4.0, 4.0, 0.45, 0x38bdf8, 24, { emissive: 0x0284c7, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
    poolWater.position.set(-14, -0.08, 0); scene.add(poolWater);

    const fountainJet = cyl(0.12, 0.4, 2.2, 0x60a5fa, 16, { emissive: 0x38bdf8, emissiveIntensity: 1.2 });
    fountainJet.position.set(-14, 1.0, 0); scene.add(fountainJet);

    tickers.push((t) => {
      fountainJet.rotation.y = t * 2;
      (poolWater.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.abs(Math.sin(t * 3)) * 0.4;
    });

    // Parked Cars in SalasCo Parking Lot
    [-6, -2, 2, 6].forEach((px, idx) => {
      const pCar = box(1.7, 1.2, 3.2, [0xf8fafc, 0x3b82f6, 0x64748b, 0xef4444][idx], { metalness: 0.6, roughness: 0.2 });
      pCar.position.set(px, 0.25, 14.5); scene.add(pCar);
    });

    // ── 2. Real Multi-Lane Road Grid Network ──
    const roadMat = mat(0x334155, { roughness: 0.85, metalness: 0.1 });
    const laneYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8 });
    const laneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const sidewalkMat = mat(0xe2e8f0, { roughness: 0.9 });

    // Major Avenues (North-South & East-West)
    [-38, 38, -100, 100].forEach(rx => {
      const roadNS = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 800), roadMat);
      roadNS.position.set(rx, -0.42, 0); scene.add(roadNS);

      const swLeft = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 800), sidewalkMat);
      swLeft.position.set(rx - 6.25, -0.38, 0); scene.add(swLeft);
      const swRight = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 800), sidewalkMat);
      swRight.position.set(rx + 6.25, -0.38, 0); scene.add(swRight);

      for (let z = -380; z <= 380; z += 16) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 6), laneYellowMat);
        stripe.position.set(rx, -0.37, z); scene.add(stripe);
      }
    });

    [-38, 38, -100, 100].forEach(rz => {
      const roadEW = new THREE.Mesh(new THREE.BoxGeometry(800, 0.08, 10), roadMat);
      roadEW.position.set(0, -0.42, rz); scene.add(roadEW);

      const swTop = new THREE.Mesh(new THREE.BoxGeometry(800, 0.1, 2.5), sidewalkMat);
      swTop.position.set(0, -0.38, rz - 6.25); scene.add(swTop);
      const swBot = new THREE.Mesh(new THREE.BoxGeometry(800, 0.1, 2.5), sidewalkMat);
      swBot.position.set(0, -0.38, rz + 6.25); scene.add(swBot);

      for (let x = -380; x <= 380; x += 16) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(6, 0.09, 0.4), laneYellowMat);
        stripe.position.set(x, -0.37, rz); scene.add(stripe);
      }
    });

    // Crosswalks & Intersections with Functional Traffic Lights
    const crosswalkPoints = [[-38, -38], [38, -38], [-38, 38], [38, 38], [-100, -38], [100, -38], [-100, 38], [100, 38]];
    crosswalkPoints.forEach(([cx, cz]) => {
      for (let i = -4; i <= 4; i += 1.4) {
        const lineN = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.5), laneWhiteMat);
        lineN.position.set(cx, -0.36, cz + i); scene.add(lineN);
        const lineE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 7), laneWhiteMat);
        lineE.position.set(cx + i, -0.36, cz); scene.add(lineE);
      }

      // Traffic Light Pole
      const lightPole = cyl(0.1, 0.1, 4.5, 0x1e293b);
      lightPole.position.set(cx + 5.5, 2.0, cz + 5.5); scene.add(lightPole);

      const lightBox = box(0.4, 1.2, 0.4, 0x0f172a);
      lightBox.position.set(cx + 5.5, 4.0, cz + 5.5); scene.add(lightBox);

      const greenLED = sphere(0.14, 0x10b981, { emissive: 0x10b981, emissiveIntensity: 2.0 });
      greenLED.position.set(cx + 5.5, 3.7, cz + 5.75); scene.add(greenLED);

      const redLED = sphere(0.14, 0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.4 });
      redLED.position.set(cx + 5.5, 4.3, cz + 5.75); scene.add(redLED);

      tickers.push((t) => {
        const isGreen = Math.floor(t * 0.4) % 2 === 0;
        (greenLED.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 2.5 : 0.2;
        (redLED.material as THREE.MeshStandardMaterial).emissiveIntensity = isGreen ? 0.2 : 2.5;
      });
    });

    // ── 3. Real PBR Urban Zoning (60% Suburbs/Houses, 20% Mid-Rise, 10% High-Rise) ──
    const unitCubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const bldMatWhite = mat(0xf8fafc, { roughness: 0.4, metalness: 0.1 });
    const bldMatGrey = mat(0xe2e8f0, { roughness: 0.5, metalness: 0.2 });
    const bldMatBeige = mat(0xf5f5dc, { roughness: 0.6, metalness: 0.1 });
    const bldMatGlass = mat(0x38bdf8, { roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 });
    const bldMatRoof = mat(0x9a3412, { roughness: 0.8 });

    const instHouse = new THREE.InstancedMesh(unitCubeGeo, bldMatWhite, 120);
    const instRoof = new THREE.InstancedMesh(unitCubeGeo, bldMatRoof, 120);
    const instMid = new THREE.InstancedMesh(unitCubeGeo, bldMatGrey, 60);
    const instHigh = new THREE.InstancedMesh(unitCubeGeo, bldMatGlass, 30);

    const dummy = new THREE.Object3D();
    let idxH = 0, idxM = 0, idxHi = 0;

    // Generate Suburban Neighborhoods & City Districts
    const cityGrid: Array<{ x: number; z: number; type: 'house' | 'mid' | 'high' }> = [];
    for (let gx = -380; gx <= 380; gx += 32) {
      for (let gz = -380; gz <= 380; gz += 32) {
        if (Math.abs(gx) < 48 && Math.abs(gz) < 48) continue; // Keep SalasCo Plaza clear

        const dist = Math.sqrt(gx * gx + gz * gz);
        if (dist < 160) {
          // 60% Suburbs / Houses near center
          cityGrid.push({ x: gx, z: gz, type: (gx + gz) % 3 === 0 ? 'mid' : 'house' });
        } else if (dist < 280) {
          // Mid-Rise apartments & Commercial
          cityGrid.push({ x: gx, z: gz, type: (gx + gz) % 2 === 0 ? 'mid' : 'house' });
        } else {
          // High-Rise towers in background skyline
          cityGrid.push({ x: gx, z: gz, type: (gx + gz) % 4 === 0 ? 'high' : 'mid' });
        }
      }
    }

    cityGrid.forEach((item, i) => {
      if (item.type === 'house' && idxH < 120) {
        const hw = 9 + (i % 3) * 2;
        const hd = 9 + ((i + 1) % 3) * 2;
        const hh = 4 + (i % 2) * 1.5;

        // House Body
        dummy.position.set(item.x, hh / 2 - 0.4, item.z);
        dummy.scale.set(hw, hh, hd);
        dummy.updateMatrix();
        instHouse.setMatrixAt(idxH, dummy.matrix);

        // Pitched Roof
        dummy.position.set(item.x, hh + 1.2 - 0.4, item.z);
        dummy.scale.set(hw + 0.6, 1.8, hd + 0.6);
        dummy.updateMatrix();
        instRoof.setMatrixAt(idxH++, dummy.matrix);

        // Backyard Swimming Pool on 20% of houses
        if (i % 5 === 0) {
          const pool = box(3.5, 0.15, 2.5, 0x38bdf8, { emissive: 0x0284c7, emissiveIntensity: 0.6 });
          pool.position.set(item.x + 6, -0.38, item.z); scene.add(pool);
        }
      } else if (item.type === 'mid' && idxM < 60) {
        const mw = 14 + (i % 4) * 3;
        const md = 14 + ((i + 2) % 4) * 3;
        const mh = 14 + (i % 5) * 4;

        dummy.position.set(item.x, mh / 2 - 0.4, item.z);
        dummy.scale.set(mw, mh, md);
        dummy.updateMatrix();
        instMid.setMatrixAt(idxM++, dummy.matrix);
      } else if (idxHi < 30) {
        const tw = 16 + (i % 3) * 4;
        const td = 16 + ((i + 1) % 3) * 4;
        const th = 32 + (i % 6) * 8;

        dummy.position.set(item.x, th / 2 - 0.4, item.z);
        dummy.scale.set(tw, th, td);
        dummy.updateMatrix();
        instHigh.setMatrixAt(idxHi++, dummy.matrix);
      }
    });

    [instHouse, instRoof, instMid, instHigh].forEach(inst => {
      inst.castShadow = true; inst.receiveShadow = true;
      scene.add(inst);
    });

    // ── 4. Animated City Traffic (32 Real Vehicles) ──
    const vehicleGroup = new THREE.Group();
    const vehicleData: Array<{ mesh: THREE.Group; speed: number; axis: 'x' | 'z'; fixedPos: number; dir: number; limit: number }> = [];

    const carColors = [0xf8fafc, 0x0284c7, 0x10b981, 0xf59e0b, 0x64748b, 0xef4444];
    for (let i = 0; i < 32; i++) {
      const v = new THREE.Group();
      const isBus = i % 6 === 0;
      const isTaxi = i % 4 === 0 && !isBus;

      const vWidth = isBus ? 2.4 : 1.6;
      const vLength = isBus ? 5.4 : 3.4;
      const vHeight = isBus ? 2.0 : 1.2;
      const vColor = isTaxi ? 0xf59e0b : isBus ? 0x0284c7 : carColors[i % carColors.length];

      const body = box(vWidth, vHeight, vLength, vColor, { metalness: 0.6, roughness: 0.2 });
      body.position.y = vHeight / 2 + 0.2; v.add(body);

      const cabin = box(vWidth * 0.9, vHeight * 0.7, vLength * 0.5, 0x38bdf8, { transparent: true, opacity: 0.85 });
      cabin.position.set(0, vHeight * 1.1, 0); v.add(cabin);

      // Headlights & Taillights
      const hl1 = sphere(0.12, 0xfffeb3, { emissive: 0xfffeb3, emissiveIntensity: 2.0 });
      hl1.position.set(-vWidth * 0.35, vHeight * 0.5, vLength * 0.5 + 0.05); v.add(hl1);
      const hl2 = sphere(0.12, 0xfffeb3, { emissive: 0xfffeb3, emissiveIntensity: 2.0 });
      hl2.position.set(vWidth * 0.35, vHeight * 0.5, vLength * 0.5 + 0.05); v.add(hl2);

      const tl1 = sphere(0.1, 0xef4444, { emissive: 0xef4444, emissiveIntensity: 2.0 });
      tl1.position.set(-vWidth * 0.35, vHeight * 0.5, -vLength * 0.5 - 0.05); v.add(tl1);
      const tl2 = sphere(0.1, 0xef4444, { emissive: 0xef4444, emissiveIntensity: 2.0 });
      tl2.position.set(vWidth * 0.35, vHeight * 0.5, -vLength * 0.5 - 0.05); v.add(tl2);

      const axis = i % 2 === 0 ? 'x' : 'z';
      const lanes = [-40.2, -35.8, 35.8, 40.2, -102.2, 97.8];
      const fixedPos = lanes[i % lanes.length];
      const speed = 14 + (i % 4) * 6;
      const dir = i % 3 === 0 ? -1 : 1;

      vehicleGroup.add(v);
      vehicleData.push({ mesh: v, speed, axis, fixedPos, dir, limit: 380 });
    }
    scene.add(vehicleGroup);

    tickers.push((_, dt) => {
      vehicleData.forEach(vd => {
        if (vd.axis === 'x') {
          vd.mesh.position.x += vd.speed * vd.dir * dt;
          vd.mesh.position.z = vd.fixedPos;
          vd.mesh.rotation.y = vd.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (vd.mesh.position.x > vd.limit) vd.mesh.position.x = -vd.limit;
          if (vd.mesh.position.x < -vd.limit) vd.mesh.position.x = vd.limit;
        } else {
          vd.mesh.position.z += vd.speed * vd.dir * dt;
          vd.mesh.position.x = vd.fixedPos;
          vd.mesh.rotation.y = vd.dir > 0 ? 0 : Math.PI;
          if (vd.mesh.position.z > vd.limit) vd.mesh.position.z = -vd.limit;
          if (vd.mesh.position.z < -vd.limit) vd.mesh.position.z = vd.limit;
        }
      });
    });

    // ── 5. Instanced Vegetation (250+ Trees & Palms) ──
    const treeGeoPot = new THREE.CylinderGeometry(0.2, 0.28, 3.2, 8);
    const treeMatPot = mat(0x451a03, { roughness: 0.9 });
    const treeGeoLeaf = new THREE.SphereGeometry(1.6, 8, 8);
    const treeMatLeaf = mat(0x15803d, { roughness: 0.8 });

    const instTrunk = new THREE.InstancedMesh(treeGeoPot, treeMatPot, 160);
    const instLeaf = new THREE.InstancedMesh(treeGeoLeaf, treeMatLeaf, 160);
    let idxTree = 0;

    for (let x = -220; x <= 220; x += 25) {
      for (let z = -220; z <= 220; z += 25) {
        if (Math.abs(x) < 42 && Math.abs(z) < 42) continue;
        if (idxTree >= 160) break;

        dummy.position.set(x + (idxTree % 5) * 2, 1.6 - 0.4, z + (idxTree % 3) * 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instTrunk.setMatrixAt(idxTree, dummy.matrix);

        dummy.position.set(x + (idxTree % 5) * 2, 3.6 - 0.4, z + (idxTree % 3) * 2);
        dummy.scale.set(1, 1.2, 1);
        dummy.updateMatrix();
        instLeaf.setMatrixAt(idxTree++, dummy.matrix);
      }
    }
    scene.add(instTrunk); scene.add(instLeaf);

    // ── 6. Aerial Helicopters & Commercial High-Altitude Jetliners ──
    const copterGroup = new THREE.Group();
    const copterBody = box(1.8, 1.4, 3.6, 0x0284c7, { metalness: 0.8, roughness: 0.2 });
    copterGroup.add(copterBody);

    const copterGlass = box(1.7, 1.0, 1.4, 0x38bdf8, { transparent: true, opacity: 0.85 });
    copterGlass.position.set(0, 0.1, 1.1); copterGroup.add(copterGlass);

    const mainRotor = box(7.0, 0.06, 0.3, 0x0f172a);
    mainRotor.position.set(0, 1.0, 0); copterGroup.add(mainRotor);

    const tailFin = box(0.12, 1.2, 1.2, 0x0284c7);
    tailFin.position.set(0, 0.4, -2.2); copterGroup.add(tailFin);

    scene.add(copterGroup);

    // High Altitude Airplane
    const planeGroup = new THREE.Group();
    const planeFuse = cyl(0.35, 0.35, 9, 0xf8fafc);
    planeFuse.rotation.x = Math.PI / 2; planeGroup.add(planeFuse);

    const planeWing = box(13, 0.08, 2.0, 0xe2e8f0);
    planeGroup.add(planeWing);
    planeGroup.position.set(-380, 170, -280);
    scene.add(planeGroup);

    tickers.push((t) => {
      // Helicopter Orbit
      const copterAng = t * 0.25;
      copterGroup.position.set(Math.cos(copterAng) * 95, 54 + Math.sin(t * 1.5) * 3, Math.sin(copterAng) * 95);
      copterGroup.rotation.y = -copterAng + Math.PI / 2;
      mainRotor.rotation.y = t * 30;

      // Cloud Drifting
      cloudGroup.rotation.y = t * 0.015;

      // High Jetliner Movement
      planeGroup.position.x += 20 * 0.016;
      if (planeGroup.position.x > 480) planeGroup.position.x = -480;
    });

    // Helper plant function
    const buildPlant = (x: number, y: number, z: number) => {
      const g = new THREE.Group();
      const pot = cyl(0.35, 0.45, 0.6, 0xb45a3a);
      pot.position.y = 0.3; g.add(pot);

      const leaf = sphere(0.6, 0x2f9e63);
      leaf.position.y = 1.15; leaf.scale.y = 1.25; g.add(leaf);

      const leaf2 = sphere(0.34, 0x37b573);
      leaf2.position.set(0.3, 1.5, 0.1); g.add(leaf2);

      g.position.set(x, y, z);
      scene.add(g);
    };

    // ── 4. Cyber Plazas & Park Districts ──
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([px, pz]) => {
      buildPlant(px, -0.2, pz);
      const bench = box(2.2, 0.4, 0.6, 0x1e293b);
      bench.position.set(px + 1.2, -0.15, pz + 1.2);
      scene.add(bench);
    });

    // Helper functions for walls & frames
    const wallSeg = (x1: number, x2: number, z: number, y: number, hex = 0xdfe6f0) => {
      const w = box(Math.abs(x2 - x1), WALL_H, 0.22, hex);
      w.position.set((x1 + x2) / 2, y + WALL_H / 2, z);
      scene.add(w);
    };
    const wallSegZ = (z1: number, z2: number, x: number, y: number, hex = 0xdfe6f0) => {
      const w = box(0.22, WALL_H, Math.abs(z2 - z1), hex);
      w.position.set(x, y + WALL_H / 2, (z1 + z2) / 2);
      scene.add(w);
    };
    const doorFrame = (x: number, z: number, y: number, hexColor: number) => {
      [[-1.32], [1.32]].forEach(([o]) => {
        const p = box(0.26, WALL_H + 0.25, 0.3, hexColor, { emissive: hexColor, emissiveIntensity: 0.25 });
        p.position.set(x + o, y + (WALL_H + 0.25) / 2, z);
        scene.add(p);
      });
      const l = box(2.9, 0.22, 0.3, hexColor, { emissive: hexColor, emissiveIntensity: 0.25 });
      l.position.set(x, y + WALL_H + 0.12, z);
      scene.add(l);
    };

    const addLabel = (text: string, colorStr: string, x: number, y: number, z: number, scaleW = 5.4) => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 128;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const pad = 10, w = 492, h = 108, r = 26;
      ctx.beginPath();
      ctx.moveTo(pad + r, pad);
      ctx.arcTo(pad + w, pad, pad + w, pad + h, r);
      ctx.arcTo(pad + w, pad + h, pad, pad + h, r);
      ctx.arcTo(pad, pad + h, pad, pad, r);
      ctx.arcTo(pad, pad, pad + w, pad, r);
      ctx.closePath();

      ctx.fillStyle = 'rgba(9,14,24,0.85)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = colorStr;
      ctx.stroke();

      ctx.fillStyle = colorStr;
      ctx.font = '700 52px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 66);

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      spr.renderOrder = 999;
      spr.scale.set(scaleW, scaleW * 0.25, 1);
      spr.position.set(x, y, z);
      scene.add(spr);
    };

    const buildDesk = (x: number, y: number, z: number, hexColor: number, facingBack: boolean) => {
      const rotZ = facingBack ? -1 : 1;
      const desk = box(2.8, 0.18, 1.25, 0x1c2a40);
      desk.position.set(x, y + 1.05, z);
      scene.add(desk);

      [[-1.2, -0.45], [1.2, -0.45], [-1.2, 0.45], [1.2, 0.45]].forEach(([lx, lz]) => {
        const lg = box(0.12, 1.0, 0.12, 0x141f30);
        lg.position.set(x + lx, y + 0.55, z + lz);
        scene.add(lg);
      });

      const stand = box(0.12, 0.42, 0.12, 0x334155);
      stand.position.set(x, y + 1.36, z - 0.4 * rotZ);
      scene.add(stand);

      const screen = box(1.5, 0.9, 0.08, 0x0b1220, { emissive: hexColor, emissiveIntensity: 0.55 });
      screen.position.set(x, y + 1.9, z - 0.45 * rotZ);
      scene.add(screen);

      const kb = box(1.05, 0.05, 0.36, 0x1a2942);
      kb.position.set(x, y + 1.16, z + 0.15 * rotZ);
      scene.add(kb);

      const chair = cyl(0.36, 0.42, 0.22, 0x1e293b);
      chair.position.set(x, y + 0.6, z + 0.85 * rotZ);
      scene.add(chair);

      tickers.push((t) => {
        (screen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.abs(Math.sin(t * 2.5 + x + z)) * 0.35;
      });
    };


    // ── Build 3D SalasCo Cyber Neon Signboard for Rooftop (Cyan Valla Panel + Solid Black Letters) ──
    const buildSalasCoSign = (x: number, y: number, z: number) => {
      const g = new THREE.Group();

      // 1. Dual Metallic Support Pillars (No middle pole!)
      [-4.5, 4.5].forEach(px => {
        const p = cyl(0.14, 0.14, 3.8, 0x1e293b, 18, { metalness: 0.9, roughness: 0.2 });
        p.position.set(px, 1.9, 0); g.add(p);
      });

      // 2. Bright Sky Blue Cyan Valla Panel (Width: 11.2m, Height: 3.2m)
      const backPanel = box(11.2, 3.2, 0.18, 0x00f0ff, { emissive: 0x06b6d4, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.3 });
      backPanel.position.set(0, 2.6, 0); g.add(backPanel);

      const rim = box(11.4, 3.4, 0.1, 0x040814, { metalness: 0.9 });
      rim.position.set(0, 2.6, -0.05); g.add(rim);

      // 3. Ultra-HD 1600x480 Canvas Texture (Cyan Valla Background + Solid Black Letters)
      const cv = document.createElement('canvas');
      cv.width = 1600; cv.height = 480;
      const ctx = cv.getContext('2d');
      if (ctx) {
        // Valla background: Bright Sky Blue Cyan
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(0, 0, 1600, 480);

        // Dark Border Frame
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#040814';
        ctx.strokeRect(14, 14, 1572, 452);

        // Main Title "SalasCo" in SOLID PURE BLACK
        ctx.font = '900 185px "Outfit", "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText('SalasCo', 800, 180);

        // Subtitle "AI & AUTOMATION HEADQUARTERS" in SOLID PURE BLACK
        ctx.font = '900 52px "Inter", sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText('AI & AUTOMATION HEADQUARTERS', 800, 355);
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 16;
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(11.0, 3.0),
        new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          emissive: 0x000000,
          roughness: 0.2,
          metalness: 0.1,
          side: THREE.DoubleSide
        })
      );
      signMesh.position.set(0, 2.6, 0.1);
      g.add(signMesh);

      // Status Indicator LED on top right
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.5 })
      );
      led.position.set(5.2, 4.0, 0.12);
      g.add(led);

      // Dynamic Pulsing Neon Ticker
      tickers.push((t) => {
        (signMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 + Math.abs(Math.sin(t * 2.5)) * 0.7;
        (led.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.abs(Math.sin(t * 5)) * 1.4;
      });

      g.position.set(x, y, z);
      scene.add(g);
    };

    // ── Build 3D Server Rack Enclosure for IT Floor ──
    const buildServerRack = (x: number, y: number, z: number, palHex: number) => {
      const rack = box(1.2, 3.4, 1.2, 0x0a101d, { metalness: 0.8, roughness: 0.2 });
      rack.position.set(x, y + 1.7, z);
      scene.add(rack);

      const frame = box(1.26, 0.12, 1.26, palHex, { emissive: palHex, emissiveIntensity: 0.6 });
      frame.position.set(x, y + 3.35, z);
      scene.add(frame);

      for (let b = 0; b < 6; b++) {
        const blade = box(1.08, 0.38, 0.08, 0x111c2e, { metalness: 0.6 });
        blade.position.set(x, y + 0.6 + b * 0.48, z + 0.58);
        scene.add(blade);

        const ledColor = b % 3 === 0 ? 0x10b981 : b % 3 === 1 ? 0x06b6d4 : 0xec4899;
        const ledMat = new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 0.9 });
        const led1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), ledMat);
        led1.position.set(x - 0.4, y + 0.6 + b * 0.48, z + 0.63);
        scene.add(led1);

        const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), ledMat);
        led2.position.set(x - 0.28, y + 0.6 + b * 0.48, z + 0.63);
        scene.add(led2);

        tickers.push((t) => {
          ledMat.emissiveIntensity = 0.4 + Math.abs(Math.sin(t * (4 + b))) * 0.8;
        });
      }

      const cableMat = new THREE.MeshStandardMaterial({ color: palHex, emissive: palHex, emissiveIntensity: 0.4 });
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), cableMat);
      cable.rotation.z = Math.PI / 2;
      cable.position.set(x + 1.2, y + 0.08, z);
      scene.add(cable);
    };

    // ── Build Building Floors ──
    const nF = FLOORS_CONFIG.length;
    const totH = nF * FH;

    const exteriorWalls = {
      back: [] as THREE.Mesh[],
      front: [] as THREE.Mesh[],
      left: [] as THREE.Mesh[],
      right: [] as THREE.Mesh[],
    };

    // Corner columns
    [[-HW, -HD], [HW, -HD], [-HW, HD], [HW, HD]].forEach(([x, z]) => {
      const col = box(0.6, totH, 0.6, 0x141f30);
      col.position.set(x, totH / 2 - 0.5, z);
      scene.add(col);
    });

    FLOORS_CONFIG.forEach((f, i) => {
      const y = i * FH;
      const pal = PAL[f.type] || PAL.SALES;

      // Slab & Trim
      const slab = box(HW * 2 + 0.8, 0.45, HD * 2 + 0.8, 0xe9edf4);
      slab.position.set(0, y - 0.22, 0);
      scene.add(slab);

      const trim = box(HW * 2 + 0.9, 0.14, HD * 2 + 0.9, pal.hex, { emissive: pal.hex, emissiveIntensity: 0.3 });
      trim.position.set(0, y - 0.02, 0);
      scene.add(trim);

      // Exterior walls
      const back = box(HW * 2, FH - 0.7, 0.28, 0x101a2b);
      back.position.set(0, y + FH / 2 - 0.55, -HD);
      scene.add(back);
      exteriorWalls.back.push(back);

      const wl = box(0.28, FH - 0.7, HD * 2, 0x0e1826);
      wl.position.set(-HW, y + FH / 2 - 0.55, 0);
      scene.add(wl);
      exteriorWalls.left.push(wl);

      const wr = box(0.28, FH - 0.7, HD * 2, 0x0e1826);
      wr.position.set(HW, y + FH / 2 - 0.55, 0);
      scene.add(wr);
      exteriorWalls.right.push(wr);

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(HW * 2, 1.0, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.18, roughness: 0.15, metalness: 0.4 })
      );
      rail.position.set(0, y + 0.5, HD);
      scene.add(rail);
      exteriorWalls.front.push(rail);

      // Back windows
      for (let k = 0; k < 7; k++) {
        const win = box(2.6, 1.7, 0.07, 0x0a1430, { emissive: 0x2a5a90, emissiveIntensity: 0.5 + ((k * i) % 3) * 0.15 });
        win.position.set(-HW + 3 + k * 4.4, y + FH / 2 + 0.4, -HD + 0.18);
        scene.add(win);
        exteriorWalls.back.push(win);
      }

      // Interior walls
      const wc = 0xdfe6f0;
      wallSeg(-HW, -10.3, -CZ, y, wc); wallSeg(-7.7, -1.3, -CZ, y, wc);
      wallSeg(1.3, 7.7, -CZ, y, wc); wallSeg(10.3, HW, -CZ, y, wc);
      wallSeg(-HW, -10.3, CZ, y, wc); wallSeg(-7.7, 7.7, CZ, y, wc);
      wallSeg(10.3, HW, CZ, y, wc);
      wallSegZ(CZ, HD, 0, y, wc);
      wallSegZ(-HD, -CZ, -SHX, y, wc);
      wallSegZ(-HD, -CZ, SHX, y, wc);

      doorFrame(-9, -CZ, y, pal.hex); doorFrame(9, -CZ, y, pal.hex);
      doorFrame(-9, CZ, y, pal.hex); doorFrame(9, CZ, y, pal.hex);
      doorFrame(0, -CZ, y, pal.hex);

      const strip = box(HW * 2 - 2, 0.05, 0.35, pal.hex, { emissive: pal.hex, emissiveIntensity: 0.55 });
      strip.position.set(0, y + 0.05, 0);
      scene.add(strip);

      [[-9, -5.2], [9, -5.2], [-9, 5.2], [9, 5.2]].forEach(([rx, rz]) => {
        const rug = box(7.5, 0.06, 5.4, pal.hex, { transparent: true, opacity: 0.13 });
        rug.position.set(rx, y + 0.06, rz);
        rug.receiveShadow = true;
        scene.add(rug);
      });

      if (f.type === 'IT_DEVOPS') {
        // ── 1. SERVER BUNKER ROOM (Left Side - Dedicated Datacenter) ──
        // 6 Heavy Server Racks in a row with blinking LEDs
        [-11.5, -9.5, -7.5].forEach(rx => {
          buildServerRack(rx, y, -4.5, pal.hex);
          buildServerRack(rx, y, 4.5, pal.hex);
        });

        // Fiber optic trunk cable running across floor in Server Room
        const fiberOptic = box(7.5, 0.08, 0.18, 0x06b6d4, { emissive: 0x06b6d4, emissiveIntensity: 0.8 });
        fiberOptic.position.set(-9.5, y + 0.05, 0);
        scene.add(fiberOptic);

        // Glass security door divider for Server Bunker
        const secDoor = box(0.12, 2.2, 2.2, 0x3b82f6, { transparent: true, opacity: 0.35, emissive: 0x3b82f6, emissiveIntensity: 0.5 });
        secDoor.position.set(-5.5, y + 1.1, -CZ);
        scene.add(secDoor);

        // ── 2. NOC MONITORING CENTER (Top Right Room) ──
        buildDesk(7.5, y, -4.8, pal.hex, true);
        buildDesk(11.2, y, -4.8, pal.hex, true);

        // Large Cyber Wall Screens in Control Center
        const screen1 = box(3.2, 1.8, 0.1, 0x030712, { emissive: 0x3b82f6, emissiveIntensity: 0.7 });
        screen1.position.set(9.2, y + 2.2, -HD + 0.2);
        scene.add(screen1);

        // ── 3. HARDWARE & NETWORKING LAB (Bottom Right Room) ──
        buildDesk(7.5, y, 4.8, pal.hex, false);
        buildServerRack(12.2, y, 4.2, pal.hex);

        // Router with antennas
        const router = box(0.8, 0.2, 0.5, 0x1e293b);
        router.position.set(7.5, y + 0.85, 4.5);
        scene.add(router);

        const ant1 = cyl(0.02, 0.02, 0.5, 0x3b82f6);
        ant1.position.set(7.2, y + 1.1, 4.3);
        scene.add(ant1);
        const ant2 = cyl(0.02, 0.02, 0.5, 0x3b82f6);
        ant2.position.set(7.8, y + 1.1, 4.3);
        scene.add(ant2);
      } else {
        Object.values(ROOMS_CONFIG).forEach(rm => {
          const facingB = rm.cz < 0;
          const dzq = facingB ? -1.6 : 1.9;
          buildDesk(rm.cx - 2.6, y, rm.cz + dzq * 0.9, pal.hex, facingB);
          buildDesk(rm.cx + 2.6, y, rm.cz + dzq * 0.9, pal.hex, facingB);
          buildPlant(rm.cx + (facingB ? 5.4 : -5.6), y, rm.cz + (facingB ? -2.4 : 3.4));
        });
      }

      addLabel(f.area.toUpperCase(), pal.main, -HW + 4.2, y + 3.0, HD + 1.6);
    });

    // Rooftop
    const topY = (nF - 1) * FH + FH;
    const roof = box(HW * 2 + 1, 0.45, HD * 2 + 1, 0xdfe6f0);
    roof.position.set(0, topY - 0.2, 0);
    scene.add(roof);

    const hvac1 = box(3.6, 1.4, 3.6, 0x1a2740); hvac1.position.set(-8, topY + 0.7, -3); scene.add(hvac1);
    const hvac2 = box(2.4, 1.0, 2.4, 0x1a2740); hvac2.position.set(8, topY + 0.5, 3); scene.add(hvac2);

    const ant = cyl(0.06, 0.06, 4, 0x9fb0c8); ant.position.set(11, topY + 2, -5); scene.add(ant);
    const beacon = sphere(0.2, 0xF87171, { emissive: 0xF87171, emissiveIntensity: 1 });
    beacon.position.set(11, topY + 4.1, -5);
    scene.add(beacon);

    tickers.push((t) => {
      (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.abs(Math.sin(t * 2));
    });

    // Add 3D SalasCo Rooftop Cyber Neon Signboard
    buildSalasCoSign(0, topY, HD - 0.2);

    // ── Build Glass Elevator & Doors ──
    const shaftDepth = Math.abs(-HD - SHZ);
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(SHX * 2, totH + 1, shaftDepth),
      new THREE.MeshStandardMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.10, roughness: 0.2, metalness: 0.3, emissive: 0x1a5a80, emissiveIntensity: 0.22 })
    );
    shaft.position.set(0, (totH + 1) / 2 - 0.5, (-HD + SHZ) / 2);
    scene.add(shaft);

    const cab = new THREE.Group();
    const cabBox = box(SHX * 2 - 0.5, 3.2, shaftDepth - 0.5, 0x22334d, { metalness: 0.3, roughness: 0.4 });
    cabBox.position.y = 1.6; cab.add(cabBox);

    const cabGlow = box(SHX * 2 - 0.45, 0.1, shaftDepth - 0.45, 0x6fd3ff, { emissive: 0x6fd3ff, emissiveIntensity: 0.8 });
    cabGlow.position.y = 0.05; cab.add(cabGlow);

    cab.position.set(0, STAND, (-HD + SHZ) / 2);
    scene.add(cab);

    const elevDoors = FLOORS_CONFIG.map((f, i) => {
      const y = i * FH;
      const pal = PAL[f.type] || PAL.SALES;

      const mkPanel = (sx: number) => {
        const p = box(SHX - 0.1, 3.1, 0.16, 0x22334d, { metalness: 0.4, roughness: 0.3, emissive: pal.hex, emissiveIntensity: 0.18 });
        p.position.set(sx * (SHX / 2), y + 1.55, SHZ);
        scene.add(p);
        return p;
      };

      const L = mkPanel(-1);
      const R = mkPanel(1);

      const lintel = box(SHX * 2 + 0.4, 0.3, 0.3, pal.hex, { emissive: pal.hex, emissiveIntensity: 0.4 });
      lintel.position.set(0, y + 3.25, SHZ);
      scene.add(lintel);

      const ind = sphere(0.12, pal.hex, { emissive: pal.hex, emissiveIntensity: 0.8 });
      ind.position.set(SHX + 0.4, y + 2.4, SHZ + 0.1);
      scene.add(ind);

      return { L, R, ind, open: 0, want: 0, baseLx: -SHX / 2, baseRx: SHX / 2 };
    });

    const elev = { cab, y: STAND, state: 'idle', queue: [] as any[], cur: null as any, speed: 3.4 };

    // ── Build 3D Robots ──
    const keys = ['bl', 'br', 'fl', 'fr'];
    const robots = agentsList.map((a, i) => {
      const customHex = a.color ? parseInt(a.color.replace('#', ''), 16) : null;
      const basePal = PAL[a.type] || PAL.SALES;
      const pal = {
        main: a.color || basePal.main,
        dark: basePal.dark,
        hex: (customHex !== null && !isNaN(customHex)) ? customHex : basePal.hex,
        rgb: basePal.rgb
      };
      const st = STATUS_CFG[a.status] || STATUS_CFG.ACTIVE;

      const G = new THREE.Group();
      G.scale.set(1.35, 1.35, 1.35);

      const base = cyl(0.34, 0.42, 0.24, 0xdfe4ee); base.position.y = 0.12; G.add(base);
      const body = box(0.62, 0.66, 0.44, pal.hex); body.position.y = 0.62; G.add(body);
      const belt = box(0.66, 0.16, 0.48, pal.hex, { emissive: pal.hex, emissiveIntensity: 0.3 }); belt.position.y = 0.78; G.add(belt);
      const chest = sphere(0.08, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }); chest.position.set(0, 0.72, 0.23); G.add(chest);

      const head = box(0.56, 0.48, 0.46, 0xeef2f8); head.position.y = 1.2; G.add(head);
      const visor = box(0.44, 0.26, 0.05, 0x0b1220); visor.position.set(0, 1.22, 0.24); G.add(visor);

      const eyeMat = { emissive: new THREE.Color(st.hex), emissiveIntensity: 1.1 };
      const eyeL = sphere(0.055, st.hex, eyeMat); eyeL.position.set(-0.11, 1.24, 0.27); G.add(eyeL);
      const eyeR = sphere(0.055, st.hex, eyeMat); eyeR.position.set(0.11, 1.24, 0.27); G.add(eyeR);

      const antenna = cyl(0.02, 0.02, 0.22, 0xbfc6d4); antenna.position.set(0, 1.55, 0); G.add(antenna);
      const bulb = sphere(0.07, pal.hex, { emissive: pal.hex, emissiveIntensity: 1 }); bulb.position.set(0, 1.68, 0); G.add(bulb);

      // Arms
      const armL = new THREE.Group(); armL.position.set(-0.36, 0.9, 0.08);
      const uL = cyl(0.06, 0.06, 0.42, 0xe6e9f0); uL.position.y = -0.21; armL.add(uL);
      const hL = sphere(0.11, pal.hex); hL.position.y = -0.44; armL.add(hL); G.add(armL);

      const armR = new THREE.Group(); armR.position.set(0.36, 0.9, 0.08);
      const uR = cyl(0.06, 0.06, 0.42, 0xe6e9f0); uR.position.y = -0.21; armR.add(uR);
      const hR = sphere(0.11, pal.hex); hR.position.y = -0.44; armR.add(hR); G.add(armR);

      // Status ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.05, 10, 28),
        new THREE.MeshStandardMaterial({ color: st.hex, emissive: new THREE.Color(st.hex), emissiveIntensity: 0.9 })
      );
      ring.position.y = 0.03; ring.rotation.x = Math.PI / 2; G.add(ring);

      // Role accessory
      let dishMesh: THREE.Mesh | null = null;
      if (a.type === 'SALES') {
        const hs = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 20, Math.PI), mat(pal.hex, { emissive: pal.hex, emissiveIntensity: 0.4 }));
        hs.position.set(0, 1.38, 0); hs.rotation.z = Math.PI; G.add(hs);
        const mic = sphere(0.05, pal.hex); mic.position.set(-0.24, 1.18, 0.15); G.add(mic);
      } else if (a.type === 'SUPPORT') {
        const bub = box(0.34, 0.22, 0.05, 0xffffff, { emissive: pal.hex, emissiveIntensity: 0.3 });
        bub.position.set(0.35, 1.7, 0); G.add(bub);
      } else if (a.type === 'BOOKING') {
        const cal = box(0.22, 0.26, 0.04, 0xffffff); cal.position.set(0, 0.66, 0.24); G.add(cal);
        const calTop = box(0.22, 0.06, 0.05, pal.hex); calTop.position.set(0, 0.77, 0.25); G.add(calTop);
      } else if (a.type === 'LEAD_GEN') {
        dishMesh = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.06, 14, 1, true), mat(pal.hex, { emissive: pal.hex, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
        dishMesh.position.set(0, 1.72, 0); G.add(dishMesh);
      }

      // Invisible raycast pick volume
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.95, 0.95), new THREE.MeshBasicMaterial({ visible: false }));
      pick.position.y = 0.95;
      pick.userData.agentId = a.id;
      G.add(pick);
      robotMeshes.push(pick);

      const rm = ROOMS_CONFIG[keys[i % 4]];
      const fy = a.floor * FH + STAND;
      const robotObj = {
        id: a.id,
        group: G,
        floor: a.floor,
        room: keys[i % 4],
        x: rm.cx + (-2 + Math.random() * 4),
        z: rm.cz + (-1.5 + Math.random() * 3),
        state: 'pause',
        timer: 600 + Math.random() * 2000,
        speed: 2.6 + Math.random() * 0.8,
        path: [] as Array<[number, number]>,
        pi: 0,
        purpose: 'wander',
        isWalking: false,
        isResponding: false,
        _board: false, _inCab: false, _exit: false, _outDone: false, _dest: 0, _destRoom: '',
        tick: (t: number, dt: number) => {
          if (robotObj.isResponding) {
            armL.rotation.x = Math.sin(t * 12) * 0.4 - 0.2;
            armR.rotation.x = Math.sin(t * 12 + 1.6) * 0.4 - 0.2;
            (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.2;
          } else if (robotObj.isWalking) {
            G.position.y = fy;
            armL.rotation.x = Math.sin(t * 8) * 0.7;
            armR.rotation.x = Math.sin(t * 8 + 3.14) * 0.7;
            base.position.y = 0.12 + Math.abs(Math.sin(t * 8)) * 0.04;
          } else if (a.status === 'ACTIVE') {
            G.position.y = fy;
            armL.rotation.x = Math.sin(t * 10) * 0.5 - 0.2;
            armR.rotation.x = Math.sin(t * 10 + 1.6) * 0.5 - 0.2;
          } else if (a.status === 'WAITING') {
            G.position.y = fy;
            armL.rotation.x = -0.1; armR.rotation.x = -0.1;
          } else {
            G.position.y = fy;
            G.rotation.z = Math.sin(t * 20) * 0.02;
          }
          head.rotation.y = Math.sin(t * 0.6 + a.floor) * 0.2;
          ring.rotation.z = t * 1.2;
          if (!robotObj.isResponding) {
            (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = a.status === 'ACTIVE' ? (0.6 + Math.abs(Math.sin(t * 3)) * 0.5) : 0.4;
          }
          if (dishMesh) dishMesh.rotation.y = t * 2;
        }
      };

      G.position.set(robotObj.x, fy, robotObj.z);
      scene.add(G);
      tickers.push(robotObj.tick);

      return robotObj;
    });

    // Save references
    const tgtGoal = new THREE.Vector3(0, 13, 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    threeRef.current = {
      scene, camera, renderer, controls,
      robots, robotMeshes, tickers, elev, elevDoors, exteriorWalls,
      tgtGoal, zoomGoal: null, followId: null,
      raycaster, pointer,
    };

    // Interaction event listeners
    const dom = renderer.domElement;
    let downPos: [number, number] | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      downPos = [e.clientX, e.clientY];
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!threeRef.current) return;
      const rect = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(robotMeshes, false);

      if (hits.length > 0) {
        dom.style.cursor = 'pointer';
        const hitId = hits[0].object.userData.agentId;
        const targetAgent = agentsList.find(a => a.id === hitId);
        if (targetAgent) {
          const pal = PAL[targetAgent.type] || PAL.SALES;
          const st = STATUS_CFG[targetAgent.status] || STATUS_CFG.ACTIVE;
          setHoverData({
            id: hitId,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            name: targetAgent.name,
            role: `${FLOORS_CONFIG[targetAgent.floor].area} · ${targetAgent.task}`,
            color: pal.main,
            status: st.label,
            statusColor: st.color,
          });
        }
      } else {
        dom.style.cursor = 'default';
        setHoverData(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (downPos && Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) < 5) {
        if (!threeRef.current) return;
        const rect = dom.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(robotMeshes, false);
        if (hits.length > 0) {
          const hitId = hits[0].object.userData.agentId;
          setSelectedId(prev => (prev === hitId ? null : hitId));
        }
      }
      downPos = null;
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!el || !threeRef.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const a = w / h;
      camera.left = -d * a; camera.right = d * a;
      camera.top = d; camera.bottom = -d;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  MAIN RENDER & STATE ANIMATION LOOP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const clock = new THREE.Clock();
    let animId = 0;

    const animateLoop = () => {
      animId = requestAnimationFrame(animateLoop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      if (!threeRef.current) return;
      const { robots: rList, elev: E, elevDoors: eDoors, exteriorWalls: extWalls, tickers: tickFns, followId, tgtGoal, zoomGoal } = threeRef.current;

      // 1. Update Elevator Doors & Movement
      eDoors.forEach((door, i) => {
        door.open += (door.want - door.open) * Math.min(1, dt * 3.5);
        const off = door.open * (SHX - 0.15);
        door.L.position.x = door.baseLx - off;
        door.R.position.x = door.baseRx + off;
        door.ind.material.emissiveIntensity = (E.cur && (E.cur.from === i || E.cur.to === i)) ? 0.9 + Math.sin(Date.now() * 0.008) * 0.4 : 0.35;
      });

      const atY = (ty: number) => {
        const dy = ty - E.y;
        const step = Math.sign(dy) * Math.min(Math.abs(dy), E.speed * dt);
        E.y += step;
        E.cab.position.y = E.y;
        return Math.abs(ty - E.y) < 0.04;
      };

      switch (E.state) {
        case 'idle':
          if (E.queue.length > 0) { E.cur = E.queue.shift(); E.state = 'toPickup'; }
          break;
        case 'toPickup':
          if (atY(E.cur.from * FH + STAND)) { eDoors[E.cur.from].want = 1; E.state = 'openPickup'; }
          break;
        case 'openPickup':
          if (eDoors[E.cur.from].open > 0.92) { E.cur.robot._board = true; E.state = 'waitBoard'; }
          break;
        case 'waitBoard':
          if (E.cur.robot._inCab) { eDoors[E.cur.from].want = 0; E.state = 'closePickup'; }
          break;
        case 'closePickup':
          if (eDoors[E.cur.from].open < 0.06) { E.state = 'travel'; }
          break;
        case 'travel':
          if (atY(E.cur.to * FH + STAND)) { eDoors[E.cur.to].want = 1; E.state = 'openDrop'; }
          break;
        case 'openDrop':
          if (eDoors[E.cur.to].open > 0.92) { E.cur.robot._exit = true; E.state = 'waitExit'; }
          break;
        case 'waitExit':
          if (E.cur.robot._outDone) { eDoors[E.cur.to].want = 0; E.cur.robot._outDone = false; E.cur = null; E.state = 'idle'; }
          break;
      }

      // 2. Update Robots AI Walking Paths
      const roomKeys = ['bl', 'br', 'fl', 'fr'];
      rList.forEach(r => {
        const agentMeta = agentsList.find(x => x.id === r.id);
        const fy = r.floor * FH + STAND;
        if (!agentMeta || agentMeta.status !== 'ACTIVE') {
          r.isWalking = false;
          return;
        }

        const stepTo = (tx: number, tz: number) => {
          const dx = tx - r.x;
          const dz = tz - r.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.09) return true;
          const step = Math.min(r.speed * dt, dist);
          r.x += (dx / dist) * step;
          r.z += (dz / dist) * step;
          r.group.position.x = r.x;
          r.group.position.z = r.z;
          r.group.rotation.y = Math.atan2(dx, dz);
          return false;
        };

        const buildPath = (destKey: string, tx: number, tz: number) => {
          const pts: Array<[number, number]> = [];
          if (r.room && ROOMS_CONFIG[r.room]) {
            const rm = ROOMS_CONFIG[r.room];
            pts.push(rm.doorIn, rm.out);
          } else if (r.room === 'lobby') {
            pts.push(LOBBY_CONFIG.doorIn, LOBBY_CONFIG.out);
          }
          if (destKey === 'lobby') {
            pts.push(LOBBY_CONFIG.out, LOBBY_CONFIG.doorIn, LOBBY_CONFIG.wait);
          } else {
            const dm = ROOMS_CONFIG[destKey];
            pts.push(dm.out, dm.doorIn, [tx, tz]);
          }
          return pts;
        };

        switch (r.state) {
          case 'pause':
            r.timer -= dt * 1000;
            if (r.timer <= 0) {
              if (Math.random() < 0.08 && E.state === 'idle' && E.queue.length === 0) {
                r.path = buildPath('lobby', 0, -3.6);
                r.pi = 0; r.purpose = 'elevator'; r.state = 'walk'; r.room = 'transit';
              } else {
                const dk = roomKeys[Math.floor(Math.random() * 4)];
                const dm = ROOMS_CONFIG[dk];
                const tx = dm.cx + (-2.4 + Math.random() * 4.8);
                const tz = dm.cz + (-1.6 + Math.random() * 3.2);
                r.path = buildPath(dk, tx, tz);
                r.pi = 0; r.purpose = 'wander'; r._destRoom = dk; r.state = 'walk'; r.room = 'transit';
              }
            }
            break;
          case 'walk':
            r.isWalking = true;
            if (r.pi < r.path.length) {
              if (stepTo(r.path[r.pi][0], r.path[r.pi][1])) r.pi++;
            }
            if (r.pi >= r.path.length) {
              if (r.purpose === 'elevator') {
                r.room = 'lobby'; r.state = 'waitElev';
                let nf = r.floor;
                do { nf = Math.floor(Math.random() * nF); } while (nf === r.floor);
                r._dest = nf; r._board = false; r._inCab = false; r._exit = false;
                E.queue.push({ robot: r, from: r.floor, to: nf });
              } else {
                r.room = r._destRoom; r.state = 'pause'; r.timer = 900 + Math.random() * 2400;
              }
            }
            break;
          case 'waitElev':
            r.isWalking = false;
            if (r._board) r.state = 'board';
            break;
          case 'board':
            r.isWalking = true;
            if (stepTo(LOBBY_CONFIG.board[0], LOBBY_CONFIG.board[1])) {
              r._inCab = true; r.state = 'ride';
            }
            break;
          case 'ride':
            r.isWalking = false;
            r.group.position.y = E.y;
            if (r._exit) {
              r.floor = r._dest;
              r.state = 'exitElev';
            }
            break;
          case 'exitElev':
            r.isWalking = true;
            r.group.position.y = fy;
            if (stepTo(LOBBY_CONFIG.wait[0], LOBBY_CONFIG.wait[1])) {
              r._outDone = true; r.room = 'lobby'; r.state = 'pause'; r.timer = 400 + Math.random() * 900;
            }
            break;
        }

        if (r.state !== 'ride') r.group.position.y = fy;
      });

      // 3. Update Tickers & Camera Interpolation
      tickFns.forEach(fn => fn(t, dt));

      if (followId) {
        const targetRobot = rList.find(x => x.id === followId);
        if (targetRobot) tgtGoal.copy(targetRobot.group.position);
      }
      controls.target.lerp(tgtGoal, 0.09);

      if (zoomGoal !== null) {
        camera.zoom += (zoomGoal - camera.zoom) * 0.09;
        camera.updateProjectionMatrix();
        if (Math.abs(zoomGoal - camera.zoom) < 0.02) {
          threeRef.current.zoomGoal = null;
        }
      }

      // 4. Dynamic Wall Culling (Smart Hiding):
      // Automatically hides exterior walls facing the camera viewpoint so you can see inside from ANY 360° angle!
      const camDx = camera.position.x - controls.target.x;
      const camDz = camera.position.z - controls.target.z;

      if (extWalls) {
        extWalls.front.forEach((m: THREE.Mesh) => { m.visible = camDz < 2; });
        extWalls.back.forEach((m: THREE.Mesh) => { m.visible = camDz > -2; });
        extWalls.left.forEach((m: THREE.Mesh) => { m.visible = camDx > -2; });
        extWalls.right.forEach((m: THREE.Mesh) => { m.visible = camDx < 2; });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animateLoop);
    setLoading(false);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [agentsList]);

  // Sync selected agent camera focus
  useEffect(() => {
    if (!threeRef.current) return;
    if (selectedId) {
      threeRef.current.followId = selectedId;
      threeRef.current.zoomGoal = 2.1;
    } else {
      threeRef.current.followId = null;
      threeRef.current.tgtGoal.set(0, 13, 0);
      threeRef.current.zoomGoal = 1;
    }
  }, [selectedId]);

  // Sync live activities prop to 3D building logs feed & trigger 3D Robot Reaction
  useEffect(() => {
    if (propActivities && propActivities.length > 0) {
      const formatted = propActivities.map((a: any, idx: number) => ({
        id: idx + 1,
        agentId: a.agentId || 'ag-2sxjls',
        tag: a.tag || a.type || 'WHATSAPP',
        color: a.color || (a.type === 'WHATSAPP' ? '#06B6D4' : '#10B981'),
        text: a.text || a.description || 'Actividad registrada',
        time: a.time || new Date(a.createdAt || Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      setLogs(formatted);

      // Trigger 3D Antenna Laser Signal Pulse Beam EXACTLY ONCE per new activity ID
      if (threeRef.current) {
        const latest = propActivities[0];
        const latestId = latest.id || (latest.createdAt + '_' + (latest.description || ''));

        if (latestId && latestId !== lastProcessedActIdRef.current) {
          lastProcessedActIdRef.current = latestId;

          const targetRobot = threeRef.current.robots.find(r => r.id === latest.agentId || r.id === 'ag-2sxjls') || threeRef.current.robots.find(r => r.floor === 2);
          if (targetRobot) {
            targetRobot.isResponding = true;
            cyberAudio.playHotLeadAlert();

            // Spawn Antenna Laser Signal Beam
            const startPos = new THREE.Vector3();
            targetRobot.group.getWorldPosition(startPos);
            startPos.y += 1.68; // Antenna tip height

            const itFloorY = 4 * FH + 1.7;
            const targetPos = new THREE.Vector3(-9.5, itFloorY, 0);

            const signalGroup = new THREE.Group();
            const ringGeo = new THREE.TorusGeometry(0.12, 0.025, 12, 24);
            const ringMat = new THREE.MeshStandardMaterial({
              color: 0x06b6d4,
              emissive: 0x06b6d4,
              emissiveIntensity: 2.2,
              transparent: true,
              opacity: 0.95
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.copy(startPos);
            signalGroup.add(ringMesh);

            const curve = new THREE.CatmullRomCurve3([
              startPos,
              new THREE.Vector3(startPos.x, (startPos.y + itFloorY) / 2, startPos.z + 1.5),
              targetPos
            ]);
            const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.06, 8, false);
            const tubeMat = new THREE.MeshStandardMaterial({
              color: 0x06b6d4,
              emissive: 0x06b6d4,
              emissiveIntensity: 1.5,
              transparent: true,
              opacity: 0.65
            });
            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
            signalGroup.add(tubeMesh);

            const pulseSphere = new THREE.Mesh(
              new THREE.SphereGeometry(0.22, 12, 12),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x06b6d4, emissiveIntensity: 3.0 })
            );
            signalGroup.add(pulseSphere);

            threeRef.current.scene.add(signalGroup);

            let progress = 0;
            const pulseTicker = (t: number, dt: number) => {
              progress += dt * 1.2;
              if (progress <= 1) {
                const p = curve.getPoint(progress);
                pulseSphere.position.copy(p);
                ringMesh.scale.setScalar(1 + progress * 3.5);
                ringMat.opacity = 0.95 * (1 - progress);
              } else {
                threeRef.current?.scene.remove(signalGroup);
                const idx = threeRef.current?.tickers.indexOf(pulseTicker) ?? -1;
                if (idx !== -1 && threeRef.current) threeRef.current.tickers.splice(idx, 1);
              }
            };
            threeRef.current.tickers.push(pulseTicker);

            setTimeout(() => {
              targetRobot.isResponding = false;
            }, 4500);
          }
        }
      }
    }
  }, [propActivities]);

  const activeCount = agentsList.filter(a => a.status === 'ACTIVE').length;
  const selectedAgent = agentsList.find(a => a.id === selectedId);
  const selectedAgentObj = propAgents?.find(a => a.id === selectedId);

  return (
    <div className="relative w-full h-[85vh] min-h-[640px] rounded-2xl overflow-hidden border border-leadforge-border bg-gradient-to-b from-[#0b1426] via-[#070c17] to-[#04070f] font-sans">

      {/* 3D Canvas Stage */}
      <div ref={stageRef} className="absolute inset-0 w-full h-full" />

      {/* Top Left Title Banner */}
      <div className="absolute top-5 left-6 z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-xl">
          🏢
        </div>
        <div>
          <h2 className="font-extrabold text-lg tracking-tight text-[#EAF2FF] leading-none">Edificio 3D de Agentes IA</h2>
          <p className="text-xs text-[#7c8ba3] font-semibold mt-1">5 Áreas Compositivas · Servidores TI · Ascensor n8n</p>
        </div>
      </div>

      {/* Cyber HUD Agent Telemetry Modal */}
      {selectedAgent && (
        <div className="absolute top-20 left-6 z-30 w-80 glass-panel p-4 rounded-2xl border border-leadforge-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] space-y-3 backdrop-blur-2xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-leadforge-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedAgent.color || '#3B82F6' }} />
              <h3 className="font-extrabold text-sm text-white truncate">{selectedAgent.name}</h3>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-white text-xs font-mono">✕</button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Piso / Área:</span>
              <span className="text-leadforge-primary font-bold">{FLOORS_CONFIG[selectedAgent.floor]?.area || 'TI'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Estado n8n:</span>
              <span className="text-emerald-400 font-bold">● Live Sync</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Carga CPU / RAM:</span>
              <span className="text-cyan-400">14% / 256MB</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-leadforge-border/40 text-[10px] text-slate-400 font-sans">
              <strong className="text-white block mb-0.5">Objetivo Activo:</strong>
              {selectedAgentObj?.objective || selectedAgent?.task || 'Prospección autónoma y atención comercial 24/7.'}
            </div>
          </div>

          <button
            onClick={() => {
              cyberAudio.playHotLeadAlert();
              if (onAgentClick) onAgentClick(selectedAgent.id);
            }}
            className="w-full py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-extrabold text-xs rounded-xl hover:shadow-glow-primary transition-all flex items-center justify-center gap-1.5"
          >
            ⚡ Ejecutar Flujo n8n en Vivo
          </button>
        </div>
      )}

      {/* Top Center Controls */}
      <div className="absolute top-5 right-[340px] z-10 flex gap-2">
        <button
          onClick={() => setSelectedId(null)}
          className="px-3.5 py-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/60 text-xs font-bold text-slate-200 hover:text-white hover:border-leadforge-primary transition-all flex items-center gap-1.5"
        >
          ↺ Vista General
        </button>
        <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/60 text-xs font-bold text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-success animate-pulse" />
          <span>{activeCount}/{agentsList.length} Activos</span>
        </div>
      </div>

      {/* Bottom Left Navigation Hint */}
      <div className="absolute bottom-16 left-6 z-10 text-[11px] font-semibold text-slate-400 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
        Arrastra para rotar · Scroll para Zoom · Clic en un robot para enfocar
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-5 left-6 z-10 flex gap-3 bg-slate-900/70 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Trabajando</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />En espera</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />Error</div>
      </div>

      {/* Hover Tooltip */}
      {hoverData && (
        <div
          ref={tipRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${hoverData.x + 16}px, ${hoverData.y + 14}px)`,
            zIndex: 30,
            pointerEvents: 'none',
          }}
          className="bg-[#090e18]/90 backdrop-blur-md p-3 rounded-xl border border-leadforge-border shadow-2xl min-w-[150px] animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: hoverData.color }} />
            <span className="font-bold text-xs text-[#EAF2FF]">{hoverData.name}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{hoverData.role}</p>
          <p className="text-[10px] font-bold mt-1.5" style={{ color: hoverData.statusColor }}>
            ● {hoverData.status}
          </p>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 bg-[#070c17]/90 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-400">Construyendo Edificio 3D de Agentes...</span>
        </div>
      )}

      {/* Right Sidebar: Agent Directory & Live Logs Feed */}
      <aside className="absolute top-0 right-0 z-20 w-80 h-full bg-[#090e18]/80 backdrop-blur-xl border-l border-white/10 flex flex-col">

        {/* Directory Header */}
        <div className="p-4 border-b border-white/10">
          <span className="text-[10px] tracking-widest uppercase text-slate-400 font-bold block">
            Directorio del Edificio
          </span>
        </div>

        {/* Directory Agent Cards */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-[46%] flex-shrink-0">
          {agentsList.map(agent => {
            const pal = PAL[agent.type] || PAL.SALES;
            const st = STATUS_CFG[agent.status] || STATUS_CFG.ACTIVE;
            const isSel = selectedId === agent.id;
            const areaName = FLOORS_CONFIG[agent.floor].area;

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedId(isSel ? null : agent.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isSel
                    ? 'bg-cyan-500/10 border-cyan-500 shadow-glow-primary'
                    : 'bg-white/[0.025] border-white/5 hover:bg-white/5'
                  }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 border"
                  style={{ backgroundColor: `rgba(${pal.rgb}, 0.16)`, borderColor: `rgba(${pal.rgb}, 0.3)` }}
                >
                  {GLYPHS[agent.type] || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-[#e7eefb] truncate">{agent.name}</div>
                  <div className="text-[10px] text-slate-400 font-semibold truncate">{areaName} · {agent.task}</div>
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color, boxShadow: `0 0 8px ${st.color}` }}
                />
              </div>
            );
          })}
        </div>

        {/* Logs Feed Header */}
        <div className="flex-1 min-h-0 mt-2 border-t border-white/10 flex flex-col">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-bold">
              {selectedAgent ? `Actividad · ${selectedAgent.name}` : 'Actividad Global (n8n)'}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              en vivo
            </div>
          </div>

          {/* Logs Lines */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 font-mono text-[10.5px] space-y-1.5 flex flex-col items-center justify-center text-center">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic text-[11px] p-4">
                Sin actividad en vivo reportada.<br />
                <span className="text-[9.5px] text-slate-600">Los eventos se registrarán automáticamente al ejecutarse en n8n.</span>
              </div>
            ) : (
              (selectedId ? logs.filter(l => l.agentId === selectedId) : logs).map(log => (
                <div key={log.id} className="flex gap-2 py-1 border-b border-white/[0.04] leading-snug animate-fadeIn w-full text-left">
                  <span className="text-slate-500 flex-shrink-0">{log.time}</span>
                  <span className="font-bold flex-shrink-0" style={{ color: log.color }}>
                    [{log.tag}]
                  </span>
                  <span className="text-slate-300 flex-1">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/10 text-[10px] text-slate-500 leading-normal">
          Cada piso es un área · cada agente mapea a un <b className="text-slate-300">workflow de n8n</b>.
        </div>
      </aside>

    </div>
  );
}
