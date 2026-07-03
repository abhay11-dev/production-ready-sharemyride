import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../config/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import PlatformMarquee from '../../components/common/PlatformMarquee.jsx';
import LoginRequiredSpeechToast from '../../components/common/LoginRequiredSpeechToast.jsx';

const SCROLL_KEY = 'home_scroll_y';

function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString('en-IN');
}
function formatRating(r) {
  return r && r > 0 ? Number(r).toFixed(1) : '4.8';
}
function formatDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return timeStr ? `${label}, ${timeStr}` : label;
}
function greet() {
  const str = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: 'numeric', hour12: false });
  let h = parseInt(str, 10);
  if (h === 24) h = 0;
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

// ─── CSS injection helper (idempotent) ────────────────────────────────────────
function injectStyles(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

// ─── 3D Car Component ──────────────────────────────────────────────────────────
// Full Three.js sedan with:
//   • Smooth drag-to-rotate (mousedown lock, lerp easing, auto-resume)
//   • Clickable hood + doors via raycaster hit-testing on actual meshes
//   • Interior (seats, dashboard, steering wheel) revealed on door open
//   • 7-color metallic paint picker (body + dark variant update reactively)
//   • Headlights / DRL / taillights all togglable (SpotLight + emissive)
//   • Exhaust particles (dual tips, colour shifts in boost mode)
//   • Turbo boost: faster spin, teal exhaust, ambient pulsing, speed badge
//   • Floating dust particles + tyre-roll animation
//   • Red brake calipers visible inside each wheel
//   • Auto-spin resumes 2.5s after user stops dragging
function Car3D() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null); // holds all Three.js references
  const animRef = useRef(null);

  // UI state (minimal — most animation state lives in refs)
  const [loaded, setLoaded] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const [headlights, setHeadlights] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [hoodOpen, setHoodOpen] = useState(false);
  const [boostMode, setBoostMode] = useState(false);
  const [paintIdx, setPaintIdx] = useState(0);

  const COLORS = [
    { hex: 0x1a56db, css: '#1a56db', name: 'Ocean Blue' },
    { hex: 0x16a34a, css: '#16a34a', name: 'Forest Green' },
    { hex: 0xdc2626, css: '#dc2626', name: 'Racing Red' },
    { hex: 0x7c3aed, css: '#7c3aed', name: 'Cosmic Purple' },
    { hex: 0xf59e0b, css: '#f59e0b', name: 'Amber Gold' },
    { hex: 0x1a1a2e, css: '#1a1a2e', name: 'Midnight' },
    { hex: 0xe2e8f0, css: '#e2e8f0', name: 'Pearl White' },
  ];

  // Internal animation state kept in a plain object (no re-renders)
  const S = useRef({
    isDragging: false,
    lastX: 0, lastY: 0,
    rotY: -0.4, rotX: 0.12,
    targetY: -0.4, targetX: 0.12,
    autoSpin: true,
    autoSpinTimer: null,
    wheelRot: 0,
    boostMode: false,
    headlights: true,
    doorLAngle: 0, doorRAngle: 0, hoodAngle: 0,
    doorLTarget: 0, doorRTarget: 0, hoodTarget: 0,
    frame: 0,
  }).current;

  useEffect(() => {
    injectStyles('car3d-css', `
      .car3d-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 11px; border-radius: 20px; font-size: 12px; font-weight: 500;
        border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.8); cursor: pointer; transition: all 0.15s;
        user-select: none; outline: none;
      }
      .car3d-btn:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.4); color: #fff; }
      .car3d-btn.active-yellow { background: rgba(255,220,60,0.22); border-color: rgba(255,220,60,0.55); color: #ffe87a; }
      .car3d-btn.active-blue   { background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.45); color: #93c5fd; }
      .car3d-btn.active-green  { background: rgba(52,211,153,0.20); border-color: rgba(52,211,153,0.50); color: #6ee7b7; }
      .car3d-swatch {
        width: 18px; height: 18px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.25); cursor: pointer;
        transition: transform 0.15s, border-color 0.15s;
      }
      .car3d-swatch:hover, .car3d-swatch.active { transform: scale(1.35); border-color: #fff; }
      @keyframes car3d-pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes car3d-spin-ring { to { transform: rotate(360deg); } }
    `);

    let THREE;
    let renderer, scene, camera, carGroup;
    let wheelFL, wheelFR, wheelRL, wheelRR;
    let doorL, doorR, hoodPivot;
    let hoodMesh, doorLMesh, doorRMesh;
    let hlSpotL, hlSpotR;
    let hlMatL, hlMatR, drlMatL, drlMatR, tlMatL, tlMatR;
    let bodyMeshes = [];
    let ambLight;
    let particles, pPos, pCount = 80;
    let exhaustParticles = [], exhaustGroup;
    let raycaster, mouse2d;
    let bodyMat, bodyDarkMat;

    const canvas = canvasRef.current;
    const rootEl = rootRef.current;
    if (!canvas || !rootEl) return;

    const W = () => rootEl.clientWidth;
    const H = () => rootEl.clientHeight;

    async function init() {
      try {
        const mod = await import('https://esm.sh/three@0.160.0');
        THREE = mod;
      } catch {
        return;
      }

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 200);
      camera.position.set(0, 2.8, 9);
      camera.lookAt(0, 0.5, 0);

      raycaster = new THREE.Raycaster();
      mouse2d = new THREE.Vector2();

      // ── Lighting ──────────────────────────────────────────────────────────
      ambLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambLight);
      const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
      sun.position.set(5, 10, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xc0d8ff, 0.8);
      fill.position.set(-5, 3, -5);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0x2060ff, 0.55);
      rim.position.set(0, 2, -8);
      scene.add(rim);

      // ── Ground shadow disc ────────────────────────────────────────────────
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(4, 64),
        new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.01;
      ground.receiveShadow = true;
      scene.add(ground);

      // ── Materials ─────────────────────────────────────────────────────────
      bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a56db, metalness: 0.88, roughness: 0.14 });
      bodyDarkMat = new THREE.MeshStandardMaterial({ color: 0x0d3a8a, metalness: 0.9, roughness: 0.15 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x88bbff, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.42 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1.0, roughness: 0.04 });
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.8 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.0, roughness: 0.95 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 1.0, roughness: 0.08 });
      const interMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.1, roughness: 0.9 });
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.0, roughness: 0.9 });
      const underbody = new THREE.MeshStandardMaterial({ color: 0x0a2a6e, metalness: 0.7, roughness: 0.3 });
      const calipMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.6, roughness: 0.4 });
      const discMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 });
      hlMatL = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffee88, emissiveIntensity: 3.5 });
      hlMatR = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffee88, emissiveIntensity: 3.5 });
      drlMatL = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 });
      drlMatR = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 });
      tlMatL = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 1.6 });
      tlMatR = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 1.6 });
      const tlStrip = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.2 });

      // ── Helper ────────────────────────────────────────────────────────────
      function mk(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, rz);
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
      }

      // ── Car group ─────────────────────────────────────────────────────────
      carGroup = new THREE.Group();
      scene.add(carGroup);

      function addBody(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
        const m = mk(geo, bodyMat, x, y, z, rx, ry, rz);
        bodyMeshes.push(m);
        carGroup.add(m);
        return m;
      }
      function add(m) { carGroup.add(m); return m; }

      // Lower body
      addBody(new THREE.BoxGeometry(2.0, 0.55, 4.2), 0, 0.08, 0);
      // Side skirts
      [-1.02, 1.02].forEach(x => {
        const s = mk(new THREE.BoxGeometry(0.06, 0.18, 3.8), bodyDarkMat, x, -0.1, 0);
        bodyMeshes.push(s); carGroup.add(s);
      });
      // Front + rear bumpers
      addBody(new THREE.BoxGeometry(2.0, 0.28, 0.22), 0, -0.08, -2.15);
      addBody(new THREE.BoxGeometry(2.0, 0.28, 0.22), 0, -0.08, 2.15);
      // Grille
      add(mk(new THREE.BoxGeometry(1.1, 0.18, 0.06), blackMat, 0, -0.08, -2.27));
      add(mk(new THREE.BoxGeometry(1.1, 0.04, 0.04), chromeMat, 0, -0.02, -2.28));
      // Diffuser
      add(mk(new THREE.BoxGeometry(1.3, 0.12, 0.1), blackMat, 0, -0.2, 2.26));
      // Underbody
      add(mk(new THREE.BoxGeometry(1.85, 0.06, 3.8), underbody, 0, -0.2, 0));

      // Cabin (extruded)
      const cabinShape = new THREE.Shape();
      cabinShape.moveTo(-1.85, 0);
      cabinShape.lineTo(-0.9, 0.73);
      cabinShape.lineTo(0.65, 0.73);
      cabinShape.lineTo(1.55, 0);
      cabinShape.lineTo(-1.85, 0);
      const cabinMesh = mk(
        new THREE.ExtrudeGeometry(cabinShape, { steps: 1, depth: 1.82, bevelEnabled: false }),
        bodyMat, 0, 0, 0
      );
      cabinMesh.rotation.y = -Math.PI / 2;
      cabinMesh.position.set(0.91, 0.35, -0.91);
      bodyMeshes.push(cabinMesh);
      carGroup.add(cabinMesh);

      // Windshields + side windows
      add(mk(new THREE.PlaneGeometry(1.56, 0.65), glassMat, 0, 0.76, -1.0, Math.PI * 0.18));
      add(mk(new THREE.PlaneGeometry(1.56, 0.55), glassMat, 0, 0.76, 1.08, -Math.PI * 0.22));
      [-0.92, 0.92].forEach((x, i) => {
        const sw = mk(new THREE.PlaneGeometry(1.5, 0.42), glassMat, x, 0.76, 0.1);
        sw.rotation.y = i === 0 ? -Math.PI / 2 : Math.PI / 2;
        add(sw);
      });

      // Headlights
      add(mk(new THREE.BoxGeometry(0.45, 0.14, 0.08), hlMatL, -0.62, 0.08, -2.26));
      add(mk(new THREE.BoxGeometry(0.45, 0.14, 0.08), hlMatR, 0.62, 0.08, -2.26));
      add(mk(new THREE.BoxGeometry(0.42, 0.035, 0.04), drlMatL, -0.62, 0.17, -2.26));
      add(mk(new THREE.BoxGeometry(0.42, 0.035, 0.04), drlMatR, 0.62, 0.17, -2.26));
      // Taillights
      add(mk(new THREE.BoxGeometry(0.42, 0.14, 0.08), tlMatL, -0.65, 0.08, 2.26));
      add(mk(new THREE.BoxGeometry(0.42, 0.14, 0.08), tlMatR, 0.65, 0.08, 2.26));
      add(mk(new THREE.BoxGeometry(0.8, 0.025, 0.04), tlStrip, 0, 0.17, 2.26));

      // Roof rails + door handles
      [-0.78, 0.78].forEach(x => add(mk(new THREE.BoxGeometry(0.04, 0.04, 1.6), chromeMat, x, 1.09, 0.1)));
      [-0.98, 0.98].forEach(x => {
        [-0.3, 0.55].forEach(z => add(mk(new THREE.BoxGeometry(0.04, 0.04, 0.2), chromeMat, x, 0.4, z)));
      });

      // Exhaust tips
      [-0.3, 0.3].forEach(x => {
        const tip = mk(new THREE.CylinderGeometry(0.055, 0.05, 0.15, 12), chromeMat, x, -0.24, 2.32);
        tip.rotation.x = Math.PI / 2;
        add(tip);
      });

      // ── Headlight spotlights ──────────────────────────────────────────────
      hlSpotL = new THREE.SpotLight(0xfff5cc, 3.5, 9, Math.PI / 7.5, 0.28);
      hlSpotL.position.set(-0.62, 0.08, -2.3);
      hlSpotL.target.position.set(-0.9, -0.6, -6);
      scene.add(hlSpotL, hlSpotL.target);
      hlSpotR = new THREE.SpotLight(0xfff5cc, 3.5, 9, Math.PI / 7.5, 0.28);
      hlSpotR.position.set(0.62, 0.08, -2.3);
      hlSpotR.target.position.set(0.9, -0.6, -6);
      scene.add(hlSpotR, hlSpotR.target);

      // ── Interior ──────────────────────────────────────────────────────────
      add(mk(new THREE.BoxGeometry(1.7, 0.04, 3.6), interMat, 0, -0.16, 0));
      [[0.45, 0.18, -0.4], [-0.45, 0.18, -0.4], [0.4, 0.18, 0.7], [-0.4, 0.18, 0.7]].forEach(([x, y, z]) => {
        add(mk(new THREE.BoxGeometry(0.35, 0.08, 0.38), seatMat, x, y, z));
        add(mk(new THREE.BoxGeometry(0.35, 0.38, 0.06), seatMat, x, y + 0.22, z - 0.16));
      });
      add(mk(new THREE.BoxGeometry(1.82, 0.25, 0.22), blackMat, 0, 0.2, -1.8));
      const steeringWheel = mk(new THREE.TorusGeometry(0.12, 0.025, 8, 24), chromeMat, 0.45, 0.38, -1.55);
      steeringWheel.rotation.x = Math.PI * 0.35;
      add(steeringWheel);

      // ── Hood pivot ────────────────────────────────────────────────────────
      hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, 0.38, -1.0);
      carGroup.add(hoodPivot);
      hoodMesh = mk(new THREE.BoxGeometry(1.97, 0.07, 1.35), bodyMat, 0, 0, -0.68);
      bodyMeshes.push(hoodMesh);
      hoodPivot.add(hoodMesh);
      hoodPivot.add(mk(new THREE.BoxGeometry(1.4, 0.3, 0.9), blackMat, 0, -0.02, -0.62));

      // ── Door pivots ───────────────────────────────────────────────────────
      doorL = new THREE.Group();
      doorL.position.set(-1.01, 0.08, 0.1);
      carGroup.add(doorL);
      doorLMesh = mk(new THREE.BoxGeometry(0.06, 0.52, 1.5), bodyMat, 0, 0, 0);
      bodyMeshes.push(doorLMesh);
      doorL.add(doorLMesh);
      doorL.add(mk(new THREE.BoxGeometry(0.04, 0.35, 1.4), bodyDarkMat, 0, 0.42, 0));

      doorR = new THREE.Group();
      doorR.position.set(1.01, 0.08, 0.1);
      carGroup.add(doorR);
      doorRMesh = mk(new THREE.BoxGeometry(0.06, 0.52, 1.5), bodyMat, 0, 0, 0);
      bodyMeshes.push(doorRMesh);
      doorR.add(doorRMesh);
      doorR.add(mk(new THREE.BoxGeometry(0.04, 0.35, 1.4), bodyDarkMat, 0, 0.42, 0));

      // ── Wheels ────────────────────────────────────────────────────────────
      function makeWheel(x, y, z) {
        const wg = new THREE.Group();
        wg.position.set(x, y, z);
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.18, 16, 40), tireMat);
        tire.rotation.y = Math.PI / 2;
        tire.castShadow = true;
        wg.add(tire);
        const rimOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.065, 32), rimMat);
        rimOuter.rotation.z = Math.PI / 2;
        wg.add(rimOuter);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16), chromeMat);
        hub.rotation.z = Math.PI / 2;
        wg.add(hub);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.2, 0.036), rimMat);
          spoke.position.set(0, Math.sin(a) * 0.14, Math.cos(a) * 0.14);
          spoke.rotation.x = a;
          wg.add(spoke);
        }
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), discMat);
        disc.rotation.z = Math.PI / 2;
        wg.add(disc);
        const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), calipMat);
        caliper.position.set(0, -0.22, 0);
        wg.add(caliper);
        return wg;
      }
      wheelFL = makeWheel(-1.02, -0.6, -1.3); carGroup.add(wheelFL);
      wheelFR = makeWheel(1.02, -0.6, -1.3); carGroup.add(wheelFR);
      wheelRL = makeWheel(-1.02, -0.6, 1.3); carGroup.add(wheelRL);
      wheelRR = makeWheel(1.02, -0.6, 1.3); carGroup.add(wheelRR);

      // ── Ambient dust particles ────────────────────────────────────────────
      const pGeo = new THREE.BufferGeometry();
      pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 12;
        pPos[i * 3 + 1] = Math.random() * 6;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x88aaff, size: 0.045, transparent: true, opacity: 0.4 }));
      scene.add(particles);

      // ── Exhaust particles ─────────────────────────────────────────────────
      exhaustGroup = new THREE.Group();
      exhaustGroup.position.set(0, -0.24, 2.32);
      carGroup.add(exhaustGroup);
      for (let i = 0; i < 30; i++) {
        const ep = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 })
        );
        ep.userData = {
          life: 0,
          maxLife: 0.6 + Math.random() * 0.8,
          vx: (Math.random() - 0.5) * 0.04,
          vy: 0.02 + Math.random() * 0.04,
          vz: 0.03 + Math.random() * 0.06,
        };
        exhaustParticles.push(ep);
        exhaustGroup.add(ep);
      }

      carGroup.position.y = 0.3;

      // Store refs for external access
      sceneRef.current = {
        THREE, renderer, scene, camera, carGroup,
        wheelFL, wheelFR, wheelRL, wheelRR,
        doorL, doorR, hoodPivot,
        hoodMesh, doorLMesh, doorRMesh,
        hlSpotL, hlSpotR,
        hlMatL, hlMatR, drlMatL, drlMatR, tlMatL, tlMatR,
        bodyMeshes, bodyMat, bodyDarkMat,
        ambLight, particles, pPos, pCount,
        exhaustParticles, exhaustGroup,
        raycaster, mouse2d,
      };

      // ── Resize observer ───────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        if (!renderer) return;
        renderer.setSize(W(), H());
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
      });
      ro.observe(rootEl);

      // ── Animation loop ────────────────────────────────────────────────────
      function animate() {
        animRef.current = requestAnimationFrame(animate);
        S.frame++;
        const t = Date.now() * 0.001;
        const boost = S.boostMode;

        // Auto-spin
        if (S.autoSpin) S.targetY += boost ? 0.035 : 0.005;

        // Lerp rotation
        S.rotY += (S.targetY - S.rotY) * 0.07;
        S.rotX += (S.targetX - S.rotX) * 0.07;
        carGroup.rotation.y = S.rotY;
        carGroup.rotation.x = S.rotX;
        carGroup.position.y = 0.3 + Math.sin(t * 0.85) * (boost ? 0.03 : 0.06);

        // Wheel spin
        S.wheelRot += boost ? 0.18 : 0.04;
        wheelFL.rotation.x = wheelFR.rotation.x = wheelRL.rotation.x = wheelRR.rotation.x = S.wheelRot;

        // Door / hood smooth open
        S.doorLAngle += (S.doorLTarget - S.doorLAngle) * 0.1;
        S.doorRAngle += (S.doorRTarget - S.doorRAngle) * 0.1;
        S.hoodAngle += (S.hoodTarget - S.hoodAngle) * 0.1;
        doorL.rotation.z = S.doorLAngle;
        doorR.rotation.z = S.doorRAngle;
        hoodPivot.rotation.x = S.hoodAngle;

        // Ambient particles
        for (let i = 1; i < pCount * 3; i += 3) {
          pPos[i] += boost ? 0.012 : 0.003;
          if (pPos[i] > 6) pPos[i] = 0;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = t * (boost ? 0.06 : 0.018);

        // Exhaust
        if (S.frame % 2 === 0) {
          const idle = exhaustParticles.find(ep => ep.userData.life <= 0);
          if (idle) {
            idle.position.set((Math.random() - 0.5) * 0.25, 0, 0);
            idle.userData.life = idle.userData.maxLife;
            idle.material.opacity = boost ? 0.5 : 0.2;
            idle.material.color.setHex(boost ? 0x99ffdd : 0x888888);
          }
        }
        exhaustParticles.forEach(ep => {
          if (ep.userData.life > 0) {
            ep.userData.life -= 0.025;
            ep.position.x += ep.userData.vx;
            ep.position.y += ep.userData.vy;
            ep.position.z += ep.userData.vz * (boost ? 3 : 1);
            ep.scale.setScalar(1 + (1 - ep.userData.life / ep.userData.maxLife) * 2);
            ep.material.opacity = (ep.userData.life / ep.userData.maxLife) * (boost ? 0.5 : 0.18);
            ep.material.needsUpdate = true;
          } else {
            ep.material.opacity = 0;
          }
        });

        // Boost ambient pulse
        ambLight.intensity = boost ? 0.65 + Math.sin(t * 8) * 0.08 : 0.65;

        renderer.render(scene, camera);
      }
      animate();
      setLoaded(true);
    }

    init();

    return () => {
      cancelAnimationFrame(animRef.current);
      const sc = sceneRef.current;
      if (sc?.renderer) {
        sc.renderer.dispose();
      }
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pointer events ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    S.isDragging = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    S.lastX = cx; S.lastY = cy;
    clearTimeout(S.autoSpinTimer);
    S.autoSpin = false;
    setAutoSpin(false);
  }, [S]);

  const onPointerMove = useCallback((e) => {
    if (!S.isDragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    S.targetY += (cx - S.lastX) * 0.012;
    S.targetX = Math.max(-0.4, Math.min(0.4, S.targetX + (cy - S.lastY) * 0.008));
    S.lastX = cx; S.lastY = cy;
  }, [S]);

  const onPointerUp = useCallback((e) => {
    if (!S.isDragging) return;
    S.isDragging = false;
    // Click detection (minimal movement = click)
    const cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dx = Math.abs(cx - S.lastX);
    const dy = Math.abs(cy - S.lastY);
    if (dx < 4 && dy < 4) handleCarClick(e);
    // Resume auto-spin after idle
    S.autoSpinTimer = setTimeout(() => {
      S.autoSpin = true;
      setAutoSpin(true);
    }, 2500);
  }, [S]); // eslint-disable-line

  function handleCarClick(e) {
    const sc = sceneRef.current;
    if (!sc) return;
    const { THREE: T, camera: cam, raycaster: rc, mouse2d: m2, hoodMesh: hm, doorLMesh: dl, doorRMesh: dr } = sc;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    m2.x = ((cx - rect.left) / rect.width) * 2 - 1;
    m2.y = -((cy - rect.top) / rect.height) * 2 + 1;
    rc.setFromCamera(m2, cam);
    const hoodHit = rc.intersectObjects([hm], false);
    const doorHit = rc.intersectObjects([dl, dr], false);
    if (hoodHit.length) {
      toggleHood();
    } else if (doorHit.length) {
      toggleDoors();
    }
  }

  // ── Control actions ─────────────────────────────────────────────────────────
  function toggleSpin() {
    const next = !S.autoSpin;
    S.autoSpin = next;
    setAutoSpin(next);
    clearTimeout(S.autoSpinTimer);
  }

  function toggleLights() {
    const sc = sceneRef.current;
    if (!sc) return;
    const next = !S.headlights;
    S.headlights = next;
    setHeadlights(next);
    const ei_hl = next ? 3.5 : 0;
    const ei_drl = next ? 2.2 : 0;
    const ei_tl = next ? 1.6 : 0;
    [sc.hlMatL, sc.hlMatR].forEach(m => { m.emissiveIntensity = ei_hl; m.needsUpdate = true; });
    [sc.drlMatL, sc.drlMatR].forEach(m => { m.emissiveIntensity = ei_drl; m.needsUpdate = true; });
    [sc.tlMatL, sc.tlMatR].forEach(m => { m.emissiveIntensity = ei_tl; m.needsUpdate = true; });
    sc.hlSpotL.intensity = next ? 3.5 : 0;
    sc.hlSpotR.intensity = next ? 3.5 : 0;
  }

  function toggleDoors() {
    const next = !S.doorLTarget;
    S.doorLTarget = next ? -Math.PI * 0.45 : 0;
    S.doorRTarget = next ? Math.PI * 0.45 : 0;
    setDoorsOpen(!!next);
  }

  function toggleHood() {
    const next = !S.hoodTarget;
    S.hoodTarget = next ? -Math.PI * 0.55 : 0;
    setHoodOpen(!!next);
  }

  function toggleBoost() {
    const next = !S.boostMode;
    S.boostMode = next;
    setBoostMode(next);
    if (next) { S.autoSpin = true; setAutoSpin(true); }
  }

  function setPaint(idx) {
    const sc = sceneRef.current;
    if (!sc) return;
    const { hex } = COLORS[idx];
    const { THREE: T } = sc;
    sc.bodyMat.color.setHex(hex);
    const dark = new T.Color(hex).multiplyScalar(0.55);
    sc.bodyDarkMat.color.copy(dark);
    setPaintIdx(idx);
  }

  function resetAll() {
    const sc = sceneRef.current;
    if (!sc) return;
    S.targetY = -0.4; S.targetX = 0.12;
    S.autoSpin = true; setAutoSpin(true);
    S.boostMode = false; setBoostMode(false);
    S.doorLTarget = 0; S.doorRTarget = 0; setDoorsOpen(false);
    S.hoodTarget = 0; setHoodOpen(false);
    S.headlights = true; setHeadlights(true);
    [sc.hlMatL, sc.hlMatR].forEach(m => { m.emissiveIntensity = 3.5; m.needsUpdate = true; });
    [sc.drlMatL, sc.drlMatR].forEach(m => { m.emissiveIntensity = 2.2; m.needsUpdate = true; });
    [sc.tlMatL, sc.tlMatR].forEach(m => { m.emissiveIntensity = 1.6; m.needsUpdate = true; });
    sc.hlSpotL.intensity = 3.5; sc.hlSpotR.intensity = 3.5;
    setPaint(0);
    clearTimeout(S.autoSpinTimer);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{ minHeight: 380, height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: 'grab', display: 'block' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />

      {/* Loading */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            style={{
              width: 32, height: 32,
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.7)',
              borderRadius: '50%',
              animation: 'car3d-spin-ring 0.8s linear infinite',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>
            Loading 3D engine…
          </span>
        </div>
      )}

      {loaded && (
        <>
          {/* ShareMyRide badge */}
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5"
            style={{
              background: 'rgba(0,0,0,0.32)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '4px 10px',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00fe5dff', animation: 'car3d-pulse-dot 1.8s ease-out infinite' }} />
            <span style={{ fontSize: 11, color: '#00fe5dff', fontWeight: 500 }}>ShareMyRide</span>
          </div>



          {/* Boost badge */}
          {boostMode && (
            <div
              className="absolute"
              style={{
                top: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(52,211,153,0.18)',
                border: '1px solid rgba(52,211,153,0.5)',
                borderRadius: 20, padding: '3px 12px',
                fontSize: 11, fontWeight: 700, color: '#6ee7b7',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >
              ⚡ Turbo Mode
            </div>
          )}

          {/* Paint swatches */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {COLORS.map((c, i) => (
              <div
                key={i}
                className={`car3d-swatch${i === paintIdx ? ' active' : ''}`}
                style={{ background: c.css }}
                title={c.name}
                onClick={() => setPaint(i)}
              />
            ))}
          </div>

          {/* Drag hint */}
          <div style={{
            position: 'absolute',
            bottom: 52, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            drag to rotate · click to interact
          </div>

          {/* Boost glow border */}
          {boostMode && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 40px 4px rgba(52,211,153,0.22), inset 0 0 0 2px rgba(52,211,153,0.45)' }}
            />
          )}

          {/* HUD controls */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 flex-wrap"
            style={{
              padding: '10px 12px',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
            }}
          >
            <button
              className={`car3d-btn${autoSpin ? ' active-blue' : ''}`}
              onClick={toggleSpin}
            >
              <span>↺</span>
              <span>{autoSpin ? 'Spinning mode on' : 'Spinning mode off'}</span>
            </button>

            <button
              className={`car3d-btn${headlights ? ' active-yellow' : ''}`}
              onClick={toggleLights}
            >
              <span>💡</span>
              <span>{headlights ? 'Head lights on' : 'Head lights off'}</span>
            </button>

            <button
              className={`car3d-btn${doorsOpen ? ' active-yellow' : ''}`}
              onClick={toggleDoors}
            >
              <span>🚪</span>
              <span>{doorsOpen ? 'Close doors' : 'Open doors'}</span>
            </button>

            <button
              className={`car3d-btn${boostMode ? ' active-green' : ''}`}
              onClick={toggleBoost}
            >
              <span>⚡</span>
              <span>{boostMode ? 'Normal' : 'Turbo'}</span>
            </button>

            <button className="car3d-btn" onClick={resetAll}>
              <span>⟲</span>
              <span>Reset</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-14 h-8 bg-gray-200 rounded ml-3" />
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2.5 bg-gray-200 rounded w-16" />
        </div>
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

// ─── Ride Card ─────────────────────────────────────────────────────────────────
function RideCard({ ride, onAuthRequired }) {
  const { user } = useAuth();
  const cardRef = useRef(null);

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      if (cardRef.current && onAuthRequired) onAuthRequired(cardRef.current.getBoundingClientRect());
      return;
    }
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

  const driver = ride.driverId || ride.driver || {};
  const driverName = ride.driverInfo?.name || driver.name || 'Driver';
  const firstInitial = driverName.charAt(0).toUpperCase();
  const driverAvatar = ride.driverInfo?.photoURL || driver.avatar || null;
  const driverRating = driver.ratingSummary || ride.ratingSummary || 0;
  const isVerified = ride.driverInfo?.verified || driver.isDriverVerified || false;
  const availableSeats = ride.availableSeats ?? ride.seats ?? 0;
  const vehicle = ride.vehicle || {};
  const vehicleLabel = [vehicle.color, vehicle.model, vehicle.type].filter(Boolean).join(' · ') || vehicle.type || '';
  const price = ride.segmentFare || ride.fare;
  const blurredName = firstInitial + '•'.repeat(Math.min((driverName.split(' ')[0].length - 1) || 4, 5));

  const cardContent = (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer
        ${user
          ? 'border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/60'
          : 'border-gray-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/60'
        }`}
    >
      <div className="p-4 sm:p-5">
        {/* Route + price */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{ride.start}</span>
            </div>
            <div className="ml-[3px] border-l-2 border-dashed border-gray-200 h-3 my-0.5" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
              <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{ride.end}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {user ? (
              <>
                <div className="text-lg font-bold text-blue-600">₹{price}</div>
                <div className="text-xs text-gray-400">per seat</div>
              </>
            ) : (
              <div className="relative flex flex-col items-center">
                <div
                  className="text-lg font-bold text-blue-600 pointer-events-none"
                  style={{ filter: 'blur(5px)', userSelect: 'none' }}
                  aria-hidden="true"
                >
                  ₹{price || '000'}
                </div>
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
                  <svg className="w-4 h-4 text-blue-500 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-xs text-blue-400 font-medium mt-0.5">sign in</div>
              </div>
            )}
          </div>
        </div>

        {vehicleLabel && (
          <div className="text-xs text-gray-400 mb-3 ml-4 truncate">
            {vehicleLabel}{vehicle.acAvailable ? ' · AC' : ''}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            {driverAvatar && user ? (
              <img src={driverAvatar} alt={driverName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {firstInitial}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {user ? (
                  <span className="text-xs font-medium text-gray-800 truncate">{driverName.split(' ')[0]}</span>
                ) : (
                  <span
                    className="text-xs font-medium text-gray-600 pointer-events-none"
                    style={{ filter: 'blur(4px)', userSelect: 'none' }}
                    aria-hidden="true"
                  >
                    {blurredName}
                  </span>
                )}
                {isVerified && (
                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {driverRating > 0 && (
                <div className="flex items-center gap-0.5">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs text-gray-500">{Number(driverRating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${availableSeats <= 1 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'}`}>
              {availableSeats} {availableSeats === 1 ? 'seat left' : 'seats'}
            </span>
            <span className="text-xs text-gray-400">{formatDate(ride.date, ride.time)}</span>
          </div>
        </div>
      </div>

      {/* Hover overlay for logged-out */}
      {!user && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto"
          style={{ background: 'rgba(239,246,255,0.9)', backdropFilter: 'blur(1px)' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAuthRequired && onAuthRequired(cardRef.current?.getBoundingClientRect());
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            Unlock this ride
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAuthRequired && onAuthRequired(cardRef.current?.getBoundingClientRect());
            }}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            or create a free account
          </button>
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <Link to={`/ride/${ride._id}`} onClick={handleClick} className="block">
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

// ─── Empty Feed ────────────────────────────────────────────────────────────────
function EmptyRideFeed() {
  return (
    <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
      <p className="font-semibold text-gray-800 mb-1">No rides currently available</p>
      <p className="text-sm text-gray-500 mb-4">Be the first to offer a ride and help fellow travelers.</p>
      <Link
        to="/ride/post"
        onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
        className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Offer a ride
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGED-IN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function LoggedInDashboard({ user, stats, rides, ridesLoading }) {
  const firstName = user?.name?.split(' ')[0] || 'Traveller';
  const avatar = user?.avatar || null;
  const handleNavClick = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 pt-5 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={firstName} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-blue-200 text-xs font-medium">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">{greet()}, {firstName} 👋</h1>
                <p className="text-blue-200 text-xs mt-0.5">Where are you headed today?</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Upcoming Trips', to: '/upcoming-rides', icon: '📅', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
            { label: 'My Bookings', to: '/bookings/my-bookings', icon: '🎫', bg: 'bg-green-50 border-green-100', text: 'text-green-700' },
            { label: 'Ride Requests', to: '/driver/bookings', icon: '🔔', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'Profile', to: '/profile', icon: '👤', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          ].map(card => (
            <Link
              key={card.label}
              to={card.to}
              onClick={handleNavClick}
              className={`${card.bg} border rounded-2xl p-4 sm:p-5 flex flex-col items-start gap-2 hover:shadow-md transition-all duration-150`}
            >
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-xs sm:text-sm font-semibold ${card.text}`}>{card.label}</span>
            </Link>
          ))}
        </div>

        {!user?.isDriverVerified && user?.role !== 'driver' && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Want to offer rides and earn back fuel costs?</p>
              <p className="text-xs text-gray-500 mt-0.5">Complete driver verification to start posting rides.</p>
            </div>
            <Link
              to="/profile?tab=verification"
              onClick={handleNavClick}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Become a driver →
            </Link>
          </div>
        )}

        {(stats.totalUsers > 0 || stats.totalRides > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { label: 'Community members', val: formatNumber(stats.totalUsers), color: 'text-blue-600' },
              { label: 'Rides completed', val: formatNumber(stats.totalRides), color: 'text-green-600' },
              { label: 'Cities active', val: formatNumber(stats.totalCities), color: 'text-purple-600' },
              { label: 'Avg. rating', val: formatRating(stats.averageRating), color: 'text-amber-500', star: true },
            ].map(({ label, val, color, star }) => (
              <div key={label} className="text-center py-2 sm:py-0 sm:px-4 first:pt-0 last:pb-0">
                <div className={`text-xl sm:text-2xl font-bold ${color} flex items-center justify-center gap-1`}>
                  {val}
                  {star && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Rides leaving soon</h2>
              {!ridesLoading && rides.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{rides.length} available · updated just now</p>
              )}
            </div>
            <Link
              to="/ride/search"
              onClick={handleNavClick}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {ridesLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : rides.length > 0
                ? rides.slice(0, 8).map(ride => <RideCard key={ride._id} ride={ride} />)
                : <EmptyRideFeed />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function PublicLanding({ stats, rides, ridesLoading }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [toastRect, setToastRect] = useState(null);
  const offerRideRef = useRef(null);
  const browseAllRef = useRef(null);
  const createAccountRef = useRef(null);
  const rideSectionRef = useRef(null);
  const heroRef = useRef(null);

  // Scroll restoration
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      const y = parseInt(saved, 10);
      const t = setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 80);
      sessionStorage.removeItem(SCROLL_KEY);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, []);

  const handleNavClick = useCallback(() => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  }, []);

  const showToastThenNavigate = useCallback((btnEl, to, message = 'Sign in to continue') => {
    const rect = btnEl?.getBoundingClientRect?.() || null;
    setToastRect({ rect, to, message });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!user) {
      showToastThenNavigate(e.currentTarget, '/login', 'Sign in to search rides');
      return;
    }
    handleNavClick();
    const params = new URLSearchParams();
    if (searchFrom) params.set('start', searchFrom);
    if (searchTo) params.set('end', searchTo);
    navigate(`/ride/search${params.toString() ? `?${params}` : ''}#search`);
  };

  const handleOfferRideClick = (e) => {
    if (!user) {
      e.preventDefault();
      showToastThenNavigate(offerRideRef.current, '/login', 'Sign in to offer a ride');
    } else {
      handleNavClick();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleBrowseRidesScroll = (e) => {
    e.preventDefault();
    rideSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBrowseAll = (e, btnEl) => {
    e.preventDefault();
    if (!user) {
      showToastThenNavigate(btnEl || e.currentTarget, '/login', 'Sign in to browse all rides');
    } else {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      navigate('/ride/search');
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 overflow-hidden flex flex-col"
        style={{ height: 'calc(100svh - 64px)', minHeight: '550px' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-green-500/10 pointer-events-none" aria-hidden="true" />

        {/* Main content */}
        <div className="flex-1 flex items-center pt-16 sm:pt-0 pb-4 sm:pb-0 overflow-y-auto">
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center w-full">

              {/* Left: text + search */}
              <div className="lg:w-1/2 xl:w-[52%] flex flex-col justify-center min-h-[min(500px,65vh)]">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-blue-100 text-[10px] sm:text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full mb-3 sm:mb-5 backdrop-blur-sm self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Community carpooling · India
                </div>

                <h1 className="text-[26px] leading-[1.1] sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2 sm:mb-4">
                  Your next trip is{' '}
                  <span className="text-green-300">already on its way.</span>
                </h1>
                <p className="text-blue-100 text-xs sm:text-base lg:text-lg leading-relaxed mb-4 sm:mb-8 max-w-xl">
                  Connect with verified drivers going your way. Share the cost, halve the traffic.
                </p>

                <form
                  onSubmit={handleSearch}
                  className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-2xl shadow-blue-900/30 flex flex-col gap-1.5 sm:gap-2 max-w-xl"
                >
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="From…"
                          value={searchFrom}
                          onChange={e => setSearchFrom(e.target.value)}
                          className="flex-1 bg-transparent text-gray-900 text-xs sm:text-sm placeholder-gray-400 outline-none min-w-0"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-7-7m7 7l-7 7" />
                        </svg>
                        <input
                          type="text"
                          placeholder="To…"
                          value={searchTo}
                          onChange={e => setSearchTo(e.target.value)}
                          className="flex-1 bg-transparent text-gray-900 text-xs sm:text-sm placeholder-gray-400 outline-none min-w-0"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search rides
                  </button>
                </form>

                <p className="mt-2 sm:mt-4 text-blue-200 text-[10px] sm:text-sm">
                  Driving somewhere?{' '}
                  <Link
                    ref={offerRideRef}
                    to={user ? '/ride/post' : '#'}
                    onClick={handleOfferRideClick}
                    className="text-white font-semibold underline underline-offset-2 hover:text-green-300 transition-colors"
                  >
                    Offer seats and recover fuel costs →
                  </Link>
                </p>
              </div>

              {/* Right: 3D car — desktop only */}
              <div
                className="hidden lg:flex lg:w-1/2 xl:w-[48%] items-center justify-center"
                style={{ height: 'min(420px, 55vh)' }}
              >
                <Car3D />
              </div>

            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="flex-shrink-0">
          <PlatformMarquee stats={stats} />
        </div>
      </section>

      {/* ── LIVE RIDE FEED ── */}
      <section ref={rideSectionRef} id="rides-section" className="bg-gray-50 py-8 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between mb-5 sm:mb-8 gap-2">
            <div className="min-w-0">
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1">Available now</p>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Rides leaving soon</h2>
              {!ridesLoading && rides.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {rides.length} rides found
                  {!user && <span className="text-blue-500 font-medium hidden sm:inline"> · sign in to see prices &amp; book</span>}
                </p>
              )}
            </div>
            <a
              ref={browseAllRef}
              href="/ride/search"
              onClick={(e) => handleBrowseAll(e, browseAllRef.current)}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 flex-shrink-0 cursor-pointer whitespace-nowrap mt-1"
            >
              Browse all
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {ridesLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : rides.length > 0
                ? rides.slice(0, 8).map(ride => (
                  <RideCard
                    key={ride._id}
                    ride={ride}
                    onAuthRequired={(rect) => setToastRect({ rect, to: '/login', message: 'Sign in to view ride details' })}
                  />
                ))
                : <EmptyRideFeed />
            }
          </div>

          {/* Trust perks (logged-out) */}
          {!user && !ridesLoading && rides.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2 justify-center">
              {[
                { icon: '🛡️', text: 'Verified drivers only' },
                { icon: '⭐', text: 'Rated community' },
                { icon: '💸', text: 'Split fuel costs' },
                { icon: '🌍', text: stats?.totalCities ? `${stats.totalCities} cities active` : 'Cities active' },
                { icon: '⚡', text: 'Instant booking' },
              ].map(p => (
                <span key={p.text} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full">
                  {p.icon} {p.text}
                </span>
              ))}
            </div>
          )}

          {/* Unlock CTA (logged-out) */}
          {!user && !ridesLoading && rides.length > 0 && (
            <div className="mt-5 bg-white border border-blue-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Prices &amp; driver details are hidden</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Join free to unlock contact info, live prices, and instant booking</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/login" onClick={handleNavClick} className="flex-1 text-center border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Sign in
                </Link>
                <Link to="/signup" onClick={() => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))} className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  Join free →
                </Link>
              </div>
            </div>
          )}

          {/* See all (logged-in) */}
          {user && rides.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); navigate('/ride/search'); }}
                className="inline-flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                See all available rides
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Why ShareMyRide</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Built for real commuters, not tourists</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                iconBg: 'bg-blue-50',
                icon: <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                title: 'Verified drivers only',
                desc: 'Every driver submits Aadhaar, driving licence, and vehicle docs. You see their rating history before you request.',
              },
              {
                iconBg: 'bg-green-50',
                icon: <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Fair cost-sharing',
                desc: "Drivers set a per-seat price to cover fuel — not to profit. Passengers pay a fraction of what a solo trip would cost.",
              },
              {
                iconBg: 'bg-purple-50',
                icon: <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Less traffic, less carbon',
                desc: 'Every filled seat is one fewer car on the road. This community has already saved thousands of solo trips.',
              },
            ].map(v => (
              <div key={v.title} className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
                <div className={`${v.iconBg} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>{v.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mb-10 sm:mb-12">
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest mb-2">Simple by design</p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">From sign-up to departure in minutes</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up free. Verify your phone. Done in under 2 minutes.' },
              { step: '02', title: 'Search or post a ride', desc: 'Browse live rides or list your own route with available seats and your price.' },
              { step: '03', title: 'Request or accept', desc: 'Passengers send a request. Drivers approve. Both get contact details.' },
              { step: '04', title: 'Travel and rate', desc: 'Share the road. After arrival, rate the experience to build trust for the next rider.' },
            ].map((s, i) => (
              <div key={s.step} className="relative bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                <div className="text-4xl font-black text-gray-300 mb-3 leading-none select-none">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 -translate-y-1/2 w-6 h-6 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-10 sm:py-16 bg-gradient-to-r from-blue-700 via-blue-600 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Ready to share your next ride?</h2>
          <p className="text-blue-100 text-xs sm:text-base mb-6 sm:mb-8 max-w-lg mx-auto leading-relaxed">
            Join {stats.totalUsers > 0 ? `${formatNumber(stats.totalUsers)} members` : 'a growing community'} already saving money and reducing traffic together.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center max-w-sm sm:max-w-none mx-auto">
            <Link
              ref={createAccountRef}
              to="/signup"
              onClick={() => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-50 hover:shadow-lg transition-all duration-150"
            >
              Create free account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              onClick={handleBrowseRidesScroll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/40 text-white hover:bg-white/10 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse rides — no sign up
            </button>
          </div>
        </div>
      </section>

      {toastRect && (
        <LoginRequiredSpeechToast
          rect={toastRect.rect}
          message={toastRect.message}
          redirectTo={toastRect.to}
          durationMs={2400}
          onDismiss={() => setToastRect(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalRides: 0, totalCities: 0, averageRating: 0, loading: true });
  const [rides, setRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        const y = parseInt(saved, 10);
        const t = setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 80);
        sessionStorage.removeItem(SCROLL_KEY);
        return () => clearTimeout(t);
      }
      window.scrollTo(0, 0);
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/home');
        const d = res.data?.data || res.data;
        setStats({ totalUsers: d.totalUsers || 0, totalRides: d.totalRides || 0, totalCities: d.totalCities || 0, averageRating: d.averageRating || 0, loading: false });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const fetchRides = async () => {
      setRidesLoading(true);
      try {
        let res = await api.get('/rides/featured', { params: { limit: 8 } });
        let data = res.data?.data || [];
        if (!data.length) {
          res = await api.get('/rides/search', { params: { start: '', end: '', limit: 8 } });
          data = res.data?.data || [];
        }
        setRides(data);
      } catch {
        setRides([]);
      } finally {
        setRidesLoading(false);
      }
    };
    fetchRides();
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <LoggedInDashboard user={user} stats={stats} rides={rides} ridesLoading={ridesLoading} />;
  }
  return <PublicLanding stats={stats} rides={rides} ridesLoading={ridesLoading} />;
}

export default Home;