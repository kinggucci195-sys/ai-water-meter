import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer
} from "three";

export function WaterMascot3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let renderer: WebGLRenderer;
    let frame = 0;

    try {
      renderer = new WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
    } catch {
      host.dataset.fallback = "true";
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new Color().setHSL(0.53, 0.58, 0.82), 1);
    host.append(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0.12, 7);

    const mascot = new Group();
    scene.add(mascot);

    const water = new MeshPhysicalMaterial({
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      color: new Color().setHSL(0.52, 0.72, 0.58),
      metalness: 0,
      roughness: 0.14,
      thickness: 1,
      transmission: 0.18
    });

    const shadowWater = new MeshPhysicalMaterial({
      clearcoat: 0.8,
      color: new Color().setHSL(0.58, 0.82, 0.46),
      metalness: 0,
      opacity: 0.78,
      roughness: 0.24,
      transparent: true
    });

    const body = new Mesh(createDropletGeometry(88, 44), water);
    body.scale.set(1.05, 1.1, 0.78);
    body.position.y = -0.08;
    mascot.add(body);

    const leftArm = new Mesh(new SphereGeometry(0.23, 32, 32), shadowWater);
    leftArm.scale.set(1.55, 0.42, 0.48);
    leftArm.position.set(-1.08, -0.18, 0.02);
    leftArm.rotation.z = -0.5;
    mascot.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.95;
    rightArm.rotation.z = 0.55;
    mascot.add(rightArm);

    const leftFoot = new Mesh(new SphereGeometry(0.24, 32, 32), shadowWater);
    leftFoot.scale.set(0.72, 1.2, 0.52);
    leftFoot.position.set(-0.34, -1.58, 0.03);
    leftFoot.rotation.z = 0.22;
    mascot.add(leftFoot);

    const rightFoot = leftFoot.clone();
    rightFoot.position.x = 0.34;
    rightFoot.rotation.z = -0.22;
    mascot.add(rightFoot);

    const eyeMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.62, 0.48, 0.16),
      roughness: 0.42
    });
    const shineMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0, 0, 1),
      roughness: 0.2
    });

    const leftEye = new Mesh(new SphereGeometry(0.135, 32, 32), eyeMaterial);
    leftEye.position.set(-0.34, 0.02, 1.06);
    leftEye.scale.set(0.95, 1.2, 0.34);
    mascot.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.x = 0.34;
    mascot.add(rightEye);

    const leftShine = new Mesh(new SphereGeometry(0.035, 16, 16), shineMaterial);
    leftShine.position.set(-0.38, 0.12, 1.19);
    mascot.add(leftShine);

    const rightShine = leftShine.clone();
    rightShine.position.x = 0.3;
    mascot.add(rightShine);

    const mouthMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.62, 0.38, 0.2),
      roughness: 0.46
    });
    const mouth = new Mesh(new TorusGeometry(0.24, 0.026, 12, 36, Math.PI), mouthMaterial);
    mouth.position.set(0, -0.32, 1.12);
    mouth.rotation.z = Math.PI;
    mascot.add(mouth);

    const highlightMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0, 0, 1),
      opacity: 0.78,
      roughness: 0.16,
      transparent: true
    });
    const topHighlight = new Mesh(new SphereGeometry(0.1, 24, 24), highlightMaterial);
    topHighlight.scale.set(2.7, 0.42, 0.16);
    topHighlight.position.set(-0.2, 0.88, 1.05);
    topHighlight.rotation.z = -0.22;
    mascot.add(topHighlight);

    const cheekMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.53, 0.9, 0.72),
      opacity: 0.72,
      roughness: 0.2,
      transparent: true
    });
    const leftCheek = new Mesh(new SphereGeometry(0.09, 20, 20), cheekMaterial);
    leftCheek.position.set(-0.58, -0.24, 1.08);
    leftCheek.scale.set(1.6, 0.78, 0.24);
    mascot.add(leftCheek);

    const rightCheek = leftCheek.clone();
    rightCheek.position.x = 0.58;
    mascot.add(rightCheek);

    const rippleMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.5, 0.78, 0.6),
      opacity: 0.25,
      roughness: 0.2,
      transparent: true
    });
    const ripple = new Mesh(new RingGeometry(1.45, 1.55, 80), rippleMaterial);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.y = -1.58;
    scene.add(ripple);

    scene.add(new AmbientLight(0xffffff, 1.7));
    const key = new DirectionalLight(0xffffff, 2.9);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new DirectionalLight(new Color().setHSL(0.56, 0.8, 0.7), 1.6);
    rim.position.set(-4, 2, 3);
    scene.add(rim);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const size = Math.max(180, Math.floor(Math.min(rect.width, rect.height || rect.width)));
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const animate = (time: number) => {
      const bounce = Math.sin(time / 720) * 0.1;
      const wave = Math.sin(time / 240);
      const blink = Math.sin(time / 1800) > 0.97 ? 0.18 : 1;
      const ripplePhase = (time / 1300) % 1;

      mascot.position.y = bounce;
      mascot.rotation.y = Math.sin(time / 1400) * 0.24;
      mascot.rotation.z = Math.sin(time / 1200) * 0.035;
      leftArm.rotation.z = -0.55 + wave * 0.22;
      rightArm.rotation.z = 0.55 - wave * 0.22;
      leftFoot.position.y = -1.46 + Math.sin(time / 360) * 0.025;
      rightFoot.position.y = -1.46 - Math.sin(time / 360) * 0.025;
      leftEye.scale.y = blink;
      rightEye.scale.y = blink;
      mouth.scale.setScalar(1 + Math.sin(time / 900) * 0.05);
      ripple.scale.setScalar(1 + ripplePhase * 0.18);
      rippleMaterial.opacity = 0.18 + (1 - ripplePhase) * 0.16;

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.dispose();
      water.dispose();
      shadowWater.dispose();
      eyeMaterial.dispose();
      shineMaterial.dispose();
      mouthMaterial.dispose();
      rippleMaterial.dispose();
      for (const item of [
        body,
        leftArm,
        rightArm,
        leftFoot,
        rightFoot,
        leftEye,
        rightEye,
        leftShine,
        rightShine,
        mouth,
        topHighlight,
        leftCheek,
        rightCheek,
        ripple
      ]) {
        item.geometry.dispose();
      }
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      className="mascot-stage"
      aria-label="Animated AI Water Meter droplet mascot"
      ref={hostRef}
    />
  );
}

function createDropletGeometry(radialSegments: number, heightSegments: number) {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let yIndex = 0; yIndex <= heightSegments; yIndex += 1) {
    const v = yIndex / heightSegments;
    const y = -1.62 + v * 3.22;
    const radius = dropletRadius(v);

    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const u = radialIndex / radialSegments;
      const theta = u * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      vertices.push(x, y, z);

      const normalY = v > 0.72 ? 0.42 : -0.08;
      normals.push(x, normalY, z);
    }
  }

  for (let yIndex = 0; yIndex < heightSegments; yIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const a = yIndex * (radialSegments + 1) + radialIndex;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function dropletRadius(v: number) {
  const body = Math.sin(Math.PI * Math.min(v / 0.86, 1)) ** 0.34;
  const taper = 1 - Math.max(0, v - 0.48) * 1.28;
  const baseRound = Math.sin(Math.PI * v) ** 0.2;
  const point = 1 - smoothstep(0.84, 1, v);
  return Math.max(0.012, 0.92 * body * taper * baseRound * point);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}
