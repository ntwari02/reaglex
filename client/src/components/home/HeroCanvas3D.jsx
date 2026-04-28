import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 140;
const DEPTH = 400;

export default function HeroCanvas3D({ theme = 'dark' }) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef([]);
  const lineSegmentsRef = useRef(null);
  const positionsRef = useRef(null);
  const colorsRef = useRef(null);
  const maxLines = PARTICLE_COUNT * (PARTICLE_COUNT - 1) / 2;

  const isDark = theme === 'dark';

  const init = useCallback(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
    camera.position.z = 500;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particles
    const accentColor = new THREE.Color('#ff8c42');
    const purpleColor = new THREE.Color('#6c63ff');
    const whiteColor = new THREE.Color(isDark ? '#ffffff' : '#0f172a');
    const particles = [];
    const sphereGeo = new THREE.SphereGeometry(1.8, 8, 8);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 5 === 0 ? accentColor : i % 7 === 0 ? purpleColor : whiteColor,
        transparent: true,
        opacity: isDark ? (0.4 + Math.random() * 0.5) : (0.2 + Math.random() * 0.4),
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * W * 1.4,
        (Math.random() - 0.5) * H * 1.4,
        (Math.random() - 0.5) * DEPTH,
      );
      mesh.userData = {
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 0.15,
        ox: mesh.position.x,
        oy: mesh.position.y,
        oz: mesh.position.z,
        phase: Math.random() * Math.PI * 2,
      };
      scene.add(mesh);
      particles.push(mesh);
    }
    particlesRef.current = particles;

    // Line segments geometry
    const linePosArr = new Float32Array(maxLines * 6);
    const lineColorArr = new Float32Array(maxLines * 6);
    const lineGeo = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(linePosArr, 3);
    const lineColorAttr = new THREE.BufferAttribute(lineColorArr, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineColorAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', linePosAttr);
    lineGeo.setAttribute('color', lineColorAttr);
    lineGeo.setDrawRange(0, 0);

    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: isDark ? 0.25 : 0.15 }),
    );
    scene.add(lines);
    lineSegmentsRef.current = lines;
    positionsRef.current = linePosArr;
    colorsRef.current = lineColorArr;

    // Ambient glow orbs
    const glowGeo = new THREE.SphereGeometry(60, 16, 16);
    const glowMat1 = new THREE.MeshBasicMaterial({
      color: isDark ? '#ff8c42' : '#fdba74',
      transparent: true,
      opacity: isDark ? 0.04 : 0.03,
    });
    const glowMat2 = new THREE.MeshBasicMaterial({
      color: isDark ? '#6c63ff' : '#a5b4fc',
      transparent: true,
      opacity: isDark ? 0.04 : 0.03,
    });
    const glow1 = new THREE.Mesh(glowGeo, glowMat1);
    const glow2 = new THREE.Mesh(glowGeo, glowMat2);
    glow1.position.set(-W * 0.3, H * 0.2, -100);
    glow2.position.set(W * 0.3, -H * 0.1, -50);
    scene.add(glow1, glow2);

    return { W, H };
  }, [isDark, maxLines]);

  const animate = useCallback(() => {
    frameRef.current = requestAnimationFrame(animate);
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const particles = particlesRef.current;
    const lineSegs = lineSegmentsRef.current;
    const positions = positionsRef.current;
    const colors = colorsRef.current;
    if (!renderer || !scene || !camera || !particles.length) return;

    const t = performance.now() * 0.001;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // Camera subtle drift following mouse
    camera.position.x += (mx * 30 - camera.position.x) * 0.03;
    camera.position.y += (-my * 20 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    // Move particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const ud = p.userData;
      p.position.x += ud.vx;
      p.position.y += ud.vy;
      p.position.z += ud.vz * Math.sin(t * 0.5 + ud.phase);

      // Boundary wrap
      const W2 = 700, H2 = 500;
      if (p.position.x > W2) p.position.x = -W2;
      if (p.position.x < -W2) p.position.x = W2;
      if (p.position.y > H2) p.position.y = -H2;
      if (p.position.y < -H2) p.position.y = H2;
      if (Math.abs(p.position.z) > DEPTH / 2) ud.vz *= -1;
    }

    // Update connections
    const accentR = 1.0, accentG = 0.549, accentB = 0.259;
    const purpleR = 0.424, purpleG = 0.388, purpleB = 1.0;
    const neutral = isDark ? 0.9 : 0.2;
    let lineIdx = 0;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pa = particles[i].position;
        const pb = particles[j].position;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dz = pa.z - pb.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < CONNECTION_DISTANCE) {
          const alpha = (1 - dist / CONNECTION_DISTANCE);
          const base = lineIdx * 6;
          positions[base] = pa.x;
          positions[base + 1] = pa.y;
          positions[base + 2] = pa.z;
          positions[base + 3] = pb.x;
          positions[base + 4] = pb.y;
          positions[base + 5] = pb.z;

          const useAccent = (i % 5 === 0 || j % 5 === 0);
          const usePurple = (i % 7 === 0 || j % 7 === 0);
          const r = useAccent ? accentR : usePurple ? purpleR : neutral;
          const g = useAccent ? accentG : usePurple ? purpleG : neutral;
          const b = useAccent ? accentB : usePurple ? purpleB : neutral;
          const a = alpha * (isDark ? 0.5 : 0.3);
          colors[base] = r * a;
          colors[base + 1] = g * a;
          colors[base + 2] = b * a;
          colors[base + 3] = r * a;
          colors[base + 4] = g * a;
          colors[base + 5] = b * a;
          lineIdx++;
        }
      }
    }

    if (lineSegs) {
      lineSegs.geometry.attributes.position.needsUpdate = true;
      lineSegs.geometry.attributes.color.needsUpdate = true;
      lineSegs.geometry.setDrawRange(0, lineIdx * 2);
    }

    renderer.render(scene, camera);
  }, [isDark]);

  useEffect(() => {
    const dims = init();
    animate();

    const handleMouse = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });

    const handleResize = () => {
      const el = mountRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!el || !renderer || !camera) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
      const renderer = rendererRef.current;
      const el = mountRef.current;
      if (renderer) {
        renderer.dispose();
        if (el && renderer.domElement.parentNode === el) {
          el.removeChild(renderer.domElement);
        }
      }
    };
  }, [init, animate]);

  // Reinit on theme change
  useEffect(() => {
    // Cleanup old renderer
    cancelAnimationFrame(frameRef.current);
    const renderer = rendererRef.current;
    const el = mountRef.current;
    if (renderer) {
      renderer.dispose();
      if (el && renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement);
      }
    }
    particlesRef.current = [];
    init();
    animate();
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
