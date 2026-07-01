"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { AddOn, MenuDish } from "@/types/restaurant";

type DishStageProps = {
  dish: MenuDish;
  /** Add-ons currently toggled on (shown on the tray). */
  selectedAddOns: AddOn[];
  /** Rotation in degrees, driven by the parent's drag gesture. */
  rotation: { azimuth: number; polar: number };
  /** Registers a capture fn that returns a transparent PNG of the canvas. */
  registerCapture?: (fn: () => string | null) => void;
  /** Fires once the base dish model has loaded (or failed). */
  onLoadedChange?: (loaded: boolean) => void;
};

const PREVIEW_DISH_SIZE = 0.34;
const PREVIEW_ADDON_SIZE = 0.12;

export default function DishStage({
  dish,
  selectedAddOns,
  rotation,
  registerCapture,
  onLoadedChange,
}: DishStageProps) {
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
      dpr={[1, 2]}
      camera={{ position: [0, 0.38, 0.75], fov: 34 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <CaptureBridge registerCapture={registerCapture} />
      <CameraRig />

      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#ffffff", "#4a4034", 0.6]} />
      <directionalLight position={[1.4, 2.4, 1.2]} intensity={1.5} castShadow />
      <directionalLight position={[-1.6, 1.2, -1]} intensity={0.4} />

      <group rotation={[0, THREE.MathUtils.degToRad(rotation.azimuth), 0]}>
        <group rotation={[THREE.MathUtils.degToRad(rotation.polar - 66), 0, 0]}>
          <Suspense fallback={null}>
            <DishContent
              dish={dish}
              selectedAddOns={selectedAddOns}
              onLoadedChange={onLoadedChange}
            />
          </Suspense>
          <ContactShadows
            position={[0, -0.001, 0]}
            opacity={0.45}
            scale={1.1}
            blur={2.4}
            far={0.5}
            resolution={512}
            color="#000000"
          />
        </group>
      </group>
    </Canvas>
  );
}

/** Aims the camera at the dish's mid-height (not the ground) so the model sits
 *  vertically centred in the viewer and never clips the top edge. */
function CameraRig() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.lookAt(0, 0.12, 0);
  }, [camera]);

  return null;
}

function CaptureBridge({
  registerCapture,
}: {
  registerCapture?: (fn: () => string | null) => void;
}) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (!registerCapture) {
      return;
    }

    registerCapture(() => {
      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    });

    return () => registerCapture(() => null);
  }, [gl, registerCapture]);

  return null;
}

function DishContent({
  dish,
  selectedAddOns,
  onLoadedChange,
}: {
  dish: MenuDish;
  selectedAddOns: AddOn[];
  onLoadedChange?: (loaded: boolean) => void;
}) {
  useEffect(() => {
    onLoadedChange?.(true);
    return () => onLoadedChange?.(false);
  }, [dish.id, onLoadedChange]);

  return (
    <group>
      {dish.modelUrl ? (
        <NormalizedModel url={dish.modelUrl} target={PREVIEW_DISH_SIZE} />
      ) : (
        <mesh position={[0, PREVIEW_DISH_SIZE / 2, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.2]} />
          <meshStandardMaterial color={dish.modelColors.primary} />
        </mesh>
      )}

      {selectedAddOns.map((addOn, index) => (
        <group
          key={addOn.id}
          position={addOnPosition(index, selectedAddOns.length)}
        >
          {addOn.modelUrl ? (
            <NormalizedModel url={addOn.modelUrl} target={PREVIEW_ADDON_SIZE} />
          ) : (
            <AddOnPlaceholder addOn={addOn} />
          )}
        </group>
      ))}
    </group>
  );
}

/** Loads a Draco GLB, centers it on the ground, and scales it to `target`. */
function NormalizedModel({ url, target }: { url: string; target: number }) {
  const { scene } = useGLTF(url, true);

  const object = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = target / maxDim;

    // Center on X/Z, rest the bottom on the ground plane (y = 0).
    clone.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    );
    clone.scale.setScalar(scale);

    clone.traverse((node) => {
      node.castShadow = true;
      node.receiveShadow = true;
    });

    return clone;
  }, [scene, target]);

  return <primitive object={object} />;
}

function AddOnPlaceholder({ addOn }: { addOn: AddOn }): ReactNode {
  const color = addOn.placeholderColor ?? "#d9a441";

  if (addOn.kind === "drink") {
    return (
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.026, 0.12, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    );
  }

  if (addOn.kind === "side") {
    return (
      <mesh position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[0.07, 0.09, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    );
  }

  // extra / wrap — a small rounded puck.
  return (
    <mesh position={[0, 0.022, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.045, 0.04, 24]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/** Lays selected add-ons in a gentle arc in front of the dish. */
function addOnPosition(index: number, count: number): [number, number, number] {
  if (count <= 0) {
    return [0, 0, 0];
  }

  const spread = 0.15;
  const offset = (index - (count - 1) / 2) * spread;
  const depth = 0.2 - Math.abs(offset) * 0.25;

  return [offset, 0, depth];
}
