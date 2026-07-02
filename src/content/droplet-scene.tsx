import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer
} from "three";

/**
 * Small local-only WebGL scene used as a calm product signal, not AI decoration.
 *
 * @returns Rendered canvas host for the animated water droplet.
 */
export function DropletScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let renderer: WebGLRenderer;
    let animationFrame = 0;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
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

    scene.add(new AmbientLight(0xffffff, 1.8));
    const key = new DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);

    const animate = (time: number) => {
      const float = Math.sin(time / 900) * 0.045;
      droplet.rotation.y = time / 2800;
      top.rotation.y = time / 2400;
      droplet.position.y = -0.12 + float;
      top.position.y = 0.82 + float;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      renderer.dispose();
      material.dispose();
      droplet.geometry.dispose();
      top.geometry.dispose();
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
