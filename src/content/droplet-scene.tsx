import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer
} from "three";
import type { MascotState } from "./mascot-state";

/**
 * Small local-only WebGL scene used as a calm product signal, not AI decoration.
 *
 * @returns Rendered canvas host for the animated water droplet.
 */
export function DropletScene({ state }: { state: MascotState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let renderer: WebGLRenderer;
    let animationFrame = 0;

    try {
      renderer = new WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true });
    } catch {
      host.dataset.fallback = "true";
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(createCanvasColor(), 1);
    renderer.setSize(72, 72);
    host.append(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.z = 5;

    const material = new MeshPhysicalMaterial({
      color: createDropletColor(),
      metalness: 0,
      roughness: 0.18,
      transmission: 0.25,
      thickness: 0.8,
      clearcoat: 0.9,
      clearcoatRoughness: 0.2
    });

    const droplet = new Mesh(new SphereGeometry(1, 48, 48), material);
    droplet.scale.set(0.72, 1.05, 0.72);
    droplet.position.y = -0.12;
    scene.add(droplet);

    const top = new Mesh(new SphereGeometry(0.48, 48, 48), material);
    top.scale.set(0.5, 0.75, 0.5);
    top.position.y = 0.82;
    scene.add(top);

    const eyeMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.61, 0.45, 0.18),
      roughness: 0.42
    });

    const leftEye = new Mesh(new SphereGeometry(0.085, 24, 24), eyeMaterial);
    leftEye.position.set(-0.24, 0.22, 0.68);
    leftEye.scale.set(0.82, 1, 0.32);
    scene.add(leftEye);

    const rightEye = new Mesh(new SphereGeometry(0.085, 24, 24), eyeMaterial);
    rightEye.position.set(0.24, 0.22, 0.68);
    rightEye.scale.set(0.82, 1, 0.32);
    scene.add(rightEye);

    const mouthMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.6, 0.36, 0.24),
      roughness: 0.48
    });
    const mouth = new Mesh(new TorusGeometry(0.18, 0.018, 10, 28, Math.PI), mouthMaterial);
    mouth.position.set(0, -0.04, 0.73);
    mouth.rotation.z = Math.PI;
    scene.add(mouth);

    const rippleMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.51, 0.7, 0.62),
      opacity: 0.22,
      roughness: 0.2,
      transparent: true
    });
    const ripple = new Mesh(new RingGeometry(1.12, 1.2, 64), rippleMaterial);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.y = -0.86;
    scene.add(ripple);

    scene.add(new AmbientLight(0xffffff, 1.8));
    const key = new DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    const animate = (time: number) => {
      const mascotState = stateRef.current;
      const profile = stateProfile(mascotState, time);
      const float = Math.sin(time / 900) * profile.floatAmount;
      const wobble = Math.sin(time / 180) * profile.wobbleAmount;
      droplet.rotation.y = time / profile.turnSpeed;
      top.rotation.y = time / (profile.turnSpeed * 0.86);
      droplet.rotation.z = wobble;
      top.rotation.z = wobble * 0.7;
      droplet.scale.set(0.72 + profile.scaleBoost, 1.05 + profile.stretch, 0.72);
      top.scale.set(0.5 + profile.scaleBoost * 0.5, 0.75 + profile.stretch * 0.45, 0.5);
      droplet.position.y = -0.12 + float;
      top.position.y = 0.82 + float;
      leftEye.position.y = 0.22 + float + profile.eyeLift;
      rightEye.position.y = 0.22 + float + profile.eyeLift;
      leftEye.scale.y = profile.eyeScaleY;
      rightEye.scale.y = profile.eyeScaleY;
      mouth.position.y = -0.04 + float - profile.eyeLift * 0.4;
      mouth.scale.set(profile.mouthScale, profile.mouthScale, profile.mouthScale);
      ripple.scale.setScalar(profile.rippleScale);
      rippleMaterial.opacity = profile.rippleOpacity;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      renderer.dispose();
      material.dispose();
      eyeMaterial.dispose();
      mouthMaterial.dispose();
      rippleMaterial.dispose();
      droplet.geometry.dispose();
      top.geometry.dispose();
      leftEye.geometry.dispose();
      rightEye.geometry.dispose();
      mouth.geometry.dispose();
      ripple.geometry.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="droplet-scene" ref={hostRef} aria-hidden="true" />;
}

function createDropletColor() {
  return new Color().setHSL(0.52, 0.66, 0.64);
}

function createCanvasColor() {
  return new Color().setHSL(0.5, 0.62, 0.82);
}

function stateProfile(state: MascotState, time: number) {
  const pulse = (Math.sin(time / 220) + 1) / 2;
  const slowPulse = (Math.sin(time / 900) + 1) / 2;

  switch (state) {
    case "new_prompt":
      return {
        eyeLift: 0.06,
        eyeScaleY: 1.24,
        floatAmount: 0.07,
        mouthScale: 1.08,
        rippleOpacity: 0.28 + pulse * 0.1,
        rippleScale: 0.95 + pulse * 0.18,
        scaleBoost: 0.02,
        stretch: 0.04,
        turnSpeed: 2100,
        wobbleAmount: 0.03
      };
    case "streaming_output":
      return {
        eyeLift: 0.03,
        eyeScaleY: 1.08,
        floatAmount: 0.055,
        mouthScale: 1,
        rippleOpacity: 0.2 + slowPulse * 0.1,
        rippleScale: 1 + slowPulse * 0.16,
        scaleBoost: 0.01,
        stretch: 0.02 + slowPulse * 0.03,
        turnSpeed: 1900,
        wobbleAmount: 0.018
      };
    case "updated":
      return {
        eyeLift: 0.025,
        eyeScaleY: 0.82 + pulse * 0.16,
        floatAmount: 0.065,
        mouthScale: 1.18,
        rippleOpacity: 0.3,
        rippleScale: 1.12 + pulse * 0.12,
        scaleBoost: 0.015,
        stretch: 0.025,
        turnSpeed: 2300,
        wobbleAmount: 0.02
      };
    case "long_or_heavy":
      return {
        eyeLift: -0.01,
        eyeScaleY: 0.9,
        floatAmount: 0.04,
        mouthScale: 0.9,
        rippleOpacity: 0.18,
        rippleScale: 1.05,
        scaleBoost: 0,
        stretch: 0.09,
        turnSpeed: 3000,
        wobbleAmount: 0.04
      };
    case "uncertain":
    case "error":
      return {
        eyeLift: -0.015,
        eyeScaleY: 0.72,
        floatAmount: 0.025,
        mouthScale: 0.78,
        rippleOpacity: 0.12,
        rippleScale: 0.98,
        scaleBoost: 0,
        stretch: 0,
        turnSpeed: 3400,
        wobbleAmount: 0.015
      };
    case "reset":
      return {
        eyeLift: 0.04,
        eyeScaleY: 1,
        floatAmount: 0.08,
        mouthScale: 1.12,
        rippleOpacity: 0.34,
        rippleScale: 1.18 + pulse * 0.16,
        scaleBoost: 0.01,
        stretch: 0.02,
        turnSpeed: 1800,
        wobbleAmount: 0.05
      };
    case "baseline":
    case "idle":
    default:
      return {
        eyeLift: 0,
        eyeScaleY: 1,
        floatAmount: 0.04,
        mouthScale: 1,
        rippleOpacity: 0.14,
        rippleScale: 1 + slowPulse * 0.04,
        scaleBoost: 0,
        stretch: 0,
        turnSpeed: 2800,
        wobbleAmount: 0.006
      };
  }
}
