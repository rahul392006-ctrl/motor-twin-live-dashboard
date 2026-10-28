import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Eye, RotateCcw, Activity, Thermometer, Zap, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { MotorState } from '../types/telemetry';
import '../styles/motor3d.css';

interface Motor3DViewerProps {
  motorState: MotorState;
  curVib: number;
  curTemp: number;
  alarmT: boolean;
  alarmV: boolean;
}

export const Motor3DViewer: React.FC<Motor3DViewerProps> = ({
  motorState,
  curVib,
  curTemp,
  alarmT,
  alarmV,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // References for dynamic animated objects in the render loop
  const shaftGroupRef = useRef<THREE.Group | null>(null);
  const motorGroupRef = useRef<THREE.Group | null>(null);
  const statorMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const energyRingRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  // Target camera interpolation for presets
  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetCamLook = useRef<THREE.Vector3 | null>(null);

  // Screen positions of 3D sensor pins
  const [vibPinPos, setVibPinPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [tempPinPos, setTempPinPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  // 3D sensor anchor points in local coordinates
  const vibAnchor = useRef(new THREE.Vector3(0, 0.45, 1.85));
  const tempAnchor = useRef(new THREE.Vector3(0.9, 0.6, 0.0));

  // Current rotation velocity for smooth spooling
  const shaftVelocityRef = useRef<number>(0);
  const activeViewPreset = useRef<string>('iso');
  const [currentPreset, setCurrentPreset] = useState<string>('iso');
  const [showExploded, setShowExploded] = useState<boolean>(false);
  const explodedFactorRef = useRef<number>(0);

  // Keep state accessible inside animation loop
  const motorStateRef = useRef<MotorState>(motorState);
  const curVibRef = useRef<number>(curVib);
  const curTempRef = useRef<number>(curTemp);
  const alarmTRef = useRef<boolean>(alarmT);
  const alarmVRef = useRef<boolean>(alarmV);

  motorStateRef.current = motorState;
  curVibRef.current = curVib;
  curTempRef.current = curTemp;
  alarmTRef.current = alarmT;
  alarmVRef.current = alarmV;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL safely
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070e24, 0.045);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.8, 3.2, 5.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Procedural Studio Environment for realistic metallic PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. OrbitControls (Wheel zoom disabled so mouse wheel scrolls webpage down smoothly)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Prevents trapping user mouse wheel; page scrolls freely!
    controls.minDistance = 2.5;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip below floor
    controlsRef.current = controls;

    // 4. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.4);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 8, 7);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d2d3, 2.0);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 1.0);
    warmFill.position.set(4, -3, -4);
    scene.add(warmFill);

    // 5. Contact Shadow Plane Grounding
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.99;
    scene.add(shadowPlane);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x00d2d3, 0x1e294b);
    gridHelper.position.y = -1.0;
    scene.add(gridHelper);

    // 6. BUILD PROCEDURAL 3D INDUSTRIAL MOTOR
    const motorMasterGroup = new THREE.Group();
    motorGroupRef.current = motorMasterGroup;
    scene.add(motorMasterGroup);

    // Stator Body (Cast Iron / Teal Finished PBR)
    const statorGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.4, 32);
    statorGeo.rotateX(Math.PI / 2);
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0x132742,
      metalness: 0.82,
      roughness: 0.35,
      emissive: 0x002b40,
      emissiveIntensity: 0.2,
    });
    statorMaterialRef.current = statorMat;
    const statorMesh = new THREE.Mesh(statorGeo, statorMat);
    statorMesh.castShadow = true;
    statorMesh.receiveShadow = true;
    motorMasterGroup.add(statorMesh);

    // Cooling Fins (16 Longitudinal Ribs along stator)
    const finCount = 16;
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x1e3658,
      metalness: 0.85,
      roughness: 0.3,
    });
    const finGroup = new THREE.Group();
    for (let i = 0; i < finCount; i++) {
      const angle = (i / finCount) * Math.PI * 2;
      const finGeo = new THREE.BoxGeometry(0.06, 0.28, 2.2);
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(Math.cos(angle) * 0.98, Math.sin(angle) * 0.98, 0);
      fin.rotation.z = angle + Math.PI / 2;
      fin.castShadow = true;
      finGroup.add(fin);
    }
    motorMasterGroup.add(finGroup);

    // Front Drive-End Bell (Tapered Bearing Housing)
    const frontBellGeo = new THREE.CylinderGeometry(0.9, 0.75, 0.45, 32);
    frontBellGeo.rotateX(Math.PI / 2);
    const bellMat = new THREE.MeshStandardMaterial({
      color: 0x243b5e,
      metalness: 0.9,
      roughness: 0.25,
    });
    const frontBell = new THREE.Mesh(frontBellGeo, bellMat);
    frontBell.position.z = 1.35;
    frontBell.castShadow = true;
    motorMasterGroup.add(frontBell);

    // Drive-End Bearing Hub Collar
    const hubGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.35, 32);
    hubGeo.rotateX(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, bellMat);
    hubMesh.position.z = 1.65;
    hubMesh.castShadow = true;
    motorMasterGroup.add(hubMesh);

    // Rear Non-Drive End Bell & Fan Cowl
    const rearBellGeo = new THREE.CylinderGeometry(0.72, 0.9, 0.45, 32);
    rearBellGeo.rotateX(Math.PI / 2);
    const rearBell = new THREE.Mesh(rearBellGeo, bellMat);
    rearBell.position.z = -1.35;
    rearBell.castShadow = true;
    motorMasterGroup.add(rearBell);

    // Rear Ventilated Fan Shroud
    const shroudGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.65, 32);
    shroudGeo.rotateX(Math.PI / 2);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x0f1c30,
      metalness: 0.7,
      roughness: 0.45,
    });
    const shroudMesh = new THREE.Mesh(shroudGeo, shroudMat);
    shroudMesh.position.z = -1.8;
    shroudMesh.castShadow = true;
    motorMasterGroup.add(shroudMesh);

    // Mounting Base Plate & Cast Heavy Feet
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x162038,
      metalness: 0.8,
      roughness: 0.4,
    });
    const baseGeo = new THREE.BoxGeometry(2.1, 0.16, 2.5);
    const basePlate = new THREE.Mesh(baseGeo, baseMat);
    basePlate.position.set(0, -0.92, 0);
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    motorMasterGroup.add(basePlate);

    // Mounting Feet Gussets (4 heavy brackets)
    const footPositions = [
      [-0.95, -0.82, 0.8],
      [0.95, -0.82, 0.8],
      [-0.95, -0.82, -0.8],
      [0.95, -0.82, -0.8],
    ];
    footPositions.forEach(([x, y, z]) => {
      const footGeo = new THREE.BoxGeometry(0.28, 0.28, 0.45);
      const foot = new THREE.Mesh(footGeo, baseMat);
      foot.position.set(x, y, z);
      foot.castShadow = true;
      motorMasterGroup.add(foot);

      // Bolt Hole Accent
      const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12);
      const boltMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, metalness: 0.95, roughness: 0.1 });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(x, y + 0.16, z);
      motorMasterGroup.add(bolt);
    });

    // Top Terminal Junction Box
    const termGeo = new THREE.BoxGeometry(0.72, 0.48, 0.8);
    const termMat = new THREE.MeshStandardMaterial({
      color: 0x192e4d,
      metalness: 0.85,
      roughness: 0.35,
    });
    const termBox = new THREE.Mesh(termGeo, termMat);
    termBox.position.set(0, 1.15, 0.1);
    termBox.castShadow = true;
    motorMasterGroup.add(termBox);

    // Cable Gland on Terminal Box
    const glandGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16);
    const glandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.95, roughness: 0.2 });
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.set(0.42, 1.15, 0.1);
    gland.rotation.z = Math.PI / 2;
    motorMasterGroup.add(gland);

    // 7. ROTATING MOTOR SHAFT & OUTPUT COUPLING
    const shaftGroup = new THREE.Group();
    shaftGroupRef.current = shaftGroup;
    motorMasterGroup.add(shaftGroup);

    // Polished Output Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.6, 32);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xdde6ed,
      metalness: 0.96,
      roughness: 0.12,
    });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.position.z = 2.3;
    shaftMesh.castShadow = true;
    shaftGroup.add(shaftMesh);

    // Keyway Machined Strip on Shaft
    const keywayGeo = new THREE.BoxGeometry(0.06, 0.08, 0.9);
    const keywayMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.6,
    });
    const keyway = new THREE.Mesh(keywayGeo, keywayMat);
    keyway.position.set(0, 0.21, 2.35);
    shaftGroup.add(keyway);

    // Industrial Toothed Pulley / Flange Coupling
    const pulleyGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
    pulleyGeo.rotateX(Math.PI / 2);
    const pulleyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.92,
      roughness: 0.2,
    });
    const pulley = new THREE.Mesh(pulleyGeo, pulleyMat);
    pulley.position.z = 2.8;
    pulley.castShadow = true;
    shaftGroup.add(pulley);

    // Radial teeth marks on coupling
    for (let t = 0; t < 8; t++) {
      const toothAngle = (t / 8) * Math.PI * 2;
      const toothGeo = new THREE.BoxGeometry(0.08, 0.12, 0.42);
      const toothMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 });
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(Math.cos(toothAngle) * 0.48, Math.sin(toothAngle) * 0.48, 2.8);
      tooth.rotation.z = toothAngle;
      shaftGroup.add(tooth);
    }

    // 8. PHYSICAL SENSORS MOUNTED ON THE MOTOR
    // A. Vibration Sensor (Accelerometer Stud) on Drive-End Bearing
    const vibStudGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.16, 16);
    const vibStudMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    const vibStud = new THREE.Mesh(vibStudGeo, vibStudMat);
    vibStud.position.copy(vibAnchor.current);
    motorMasterGroup.add(vibStud);

    // B. Temperature Sensor (DHT11 Probe Stud) on Stator Wall
    const tempStudGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.18, 16);
    tempStudGeo.rotateZ(Math.PI / 2);
    const tempStudMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });
    const tempStud = new THREE.Mesh(tempStudGeo, tempStudMat);
    tempStud.position.copy(tempAnchor.current);
    motorMasterGroup.add(tempStud);

    // 9. DYNAMIC ENERGY RING (Flux Effect during operation)
    const ringGeo = new THREE.TorusGeometry(1.2, 0.035, 16, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2d3,
      transparent: true,
      opacity: 0.65,
    });
    const energyRing = new THREE.Mesh(ringGeo, ringMat);
    energyRingRef.current = energyRing;
    motorMasterGroup.add(energyRing);

    // 10. ELECTROMAGNETIC FIELD PARTICLES (Sparkles / Flux field)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      const radius = 1.1 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      posArray[p] = Math.cos(theta) * radius;
      posArray[p + 1] = Math.sin(theta) * radius;
      posArray[p + 2] = (Math.random() - 0.5) * 3.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particlesRef.current = particles;
    motorMasterGroup.add(particles);

    // 11. ANIMATION & RENDER LOOP
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const _projVec = new THREE.Vector3();

    const renderTick = () => {
      const delta = clock.getDelta();
      const isMotorOn = motorStateRef.current === 'ON';

      // 1. Shaft Smooth Kinematics & Spool-Down
      if (isMotorOn) {
        // Accelerate up to target rotation speed (proportional to vibration)
        const targetSpeed = 16.0 + Math.min(10.0, curVibRef.current * 0.015);
        shaftVelocityRef.current = THREE.MathUtils.damp(shaftVelocityRef.current, targetSpeed, 2.5, delta);
      } else {
        // Exponential mechanical coasting down to zero
        shaftVelocityRef.current = THREE.MathUtils.damp(shaftVelocityRef.current, 0, 1.8, delta);
      }

      if (shaftGroupRef.current) {
        shaftGroupRef.current.rotation.z += shaftVelocityRef.current * delta;
      }

      // 2. Physical Vibration Waves (Subtle procedural displacement)
      if (motorGroupRef.current) {
        if (isMotorOn && curVibRef.current > 10) {
          const vibAmp = Math.min(0.018, curVibRef.current * 0.000035);
          motorGroupRef.current.position.x = (Math.random() - 0.5) * vibAmp;
          motorGroupRef.current.position.y = (Math.random() - 0.5) * vibAmp;
          motorGroupRef.current.position.z = (Math.random() - 0.5) * vibAmp;
        } else {
          motorGroupRef.current.position.set(0, 0, 0);
        }
      }

      // 3. Temperature-based Visual Heat Glow on Stator Casing
      if (statorMaterialRef.current) {
        const temp = curTempRef.current;
        const isAlarm = alarmTRef.current || alarmVRef.current;

        if (isAlarm || temp > 36) {
          // Critical alarm thermal state: pulsing red glow
          const pulse = (Math.sin(clock.getElapsedTime() * 8) + 1) * 0.5;
          statorMaterialRef.current.emissive.setHex(0xef4444);
          statorMaterialRef.current.emissiveIntensity = 0.5 + pulse * 0.5;
        } else if (temp > 28) {
          // Elevated thermal state: warm orange-amber glow
          const ratio = Math.min(1.0, (temp - 28) / 8);
          statorMaterialRef.current.emissive.setHex(0xf59e0b);
          statorMaterialRef.current.emissiveIntensity = 0.2 + ratio * 0.4;
        } else {
          // Normal thermal state: subtle deep cyan
          statorMaterialRef.current.emissive.setHex(0x00d2d3);
          statorMaterialRef.current.emissiveIntensity = isMotorOn ? 0.25 : 0.08;
        }
      }

      // 4. Flux Energy Ring & Particles
      if (energyRingRef.current) {
        const ringMat = energyRingRef.current.material as THREE.MeshBasicMaterial;
        if (isMotorOn) {
          energyRingRef.current.rotation.z += delta * 3;
          ringMat.opacity = 0.4 + 0.3 * Math.sin(clock.getElapsedTime() * 4);
          energyRingRef.current.visible = true;
        } else {
          ringMat.opacity = Math.max(0, ringMat.opacity - delta * 2);
          if (ringMat.opacity <= 0.01) energyRingRef.current.visible = false;
        }
      }

      if (particlesRef.current) {
        if (isMotorOn) {
          particlesRef.current.rotation.z += delta * 1.2;
          particlesRef.current.visible = true;
        } else {
          particlesRef.current.visible = false;
        }
      }

      // 5. Exploded View Transition (smooth damping)
      const targetExp = showExploded ? 1.0 : 0.0;
      explodedFactorRef.current = THREE.MathUtils.damp(explodedFactorRef.current, targetExp, 4.0, delta);
      if (motorGroupRef.current) {
        frontBell.position.z = 1.35 + explodedFactorRef.current * 0.8;
        rearBell.position.z = -1.35 - explodedFactorRef.current * 0.7;
        shroudMesh.position.z = -1.8 - explodedFactorRef.current * 1.3;
        termBox.position.y = 1.15 + explodedFactorRef.current * 0.6;
        if (shaftGroupRef.current) {
          shaftGroupRef.current.position.z = explodedFactorRef.current * 0.9;
        }
      }

      // 6. Camera Preset Transition (smooth damping)
      if (targetCamPos.current && targetCamLook.current) {
        camera.position.lerp(targetCamPos.current, 0.08);
        controls.target.lerp(targetCamLook.current, 0.08);
        if (camera.position.distanceTo(targetCamPos.current) < 0.05) {
          targetCamPos.current = null;
          targetCamLook.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      // 7. Project 3D Sensor Markers to 2D Screen Coordinates
      if (container) {
        // Project Vibration Sensor
        _projVec.copy(vibAnchor.current);
        if (motorGroupRef.current) _projVec.applyMatrix4(motorGroupRef.current.matrixWorld);
        _projVec.project(camera);
        const vibX = ((_projVec.x + 1) * width) / 2;
        const vibY = ((-_projVec.y + 1) * height) / 2;
        const vibVisible = _projVec.z < 1.0 && vibX >= 0 && vibX <= width && vibY >= 0 && vibY <= height;
        setVibPinPos({ x: vibX, y: vibY, visible: vibVisible });

        // Project Temperature Sensor
        _projVec.copy(tempAnchor.current);
        if (motorGroupRef.current) _projVec.applyMatrix4(motorGroupRef.current.matrixWorld);
        _projVec.project(camera);
        const tempX = ((_projVec.x + 1) * width) / 2;
        const tempY = ((-_projVec.y + 1) * height) / 2;
        const tempVisible = _projVec.z < 1.0 && tempX >= 0 && tempX <= width && tempY >= 0 && tempY <= height;
        setTempPinPos({ x: tempX, y: tempY, visible: tempVisible });
      }

      animationFrameId = requestAnimationFrame(renderTick);
    };

    renderTick();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [showExploded]);

  // Camera Presets Dispatcher
  const setCameraPreset = (preset: 'iso' | 'front' | 'fins' | 'top') => {
    activeViewPreset.current = preset;
    setCurrentPreset(preset);

    switch (preset) {
      case 'iso':
        targetCamPos.current = new THREE.Vector3(4.8, 3.2, 5.2);
        targetCamLook.current = new THREE.Vector3(0, 0, 0);
        break;
      case 'front':
        targetCamPos.current = new THREE.Vector3(0, 0.4, 6.2);
        targetCamLook.current = new THREE.Vector3(0, 0.2, 1.5);
        break;
      case 'fins':
        targetCamPos.current = new THREE.Vector3(5.5, 0.8, 0);
        targetCamLook.current = new THREE.Vector3(0, 0, 0);
        break;
      case 'top':
        targetCamPos.current = new THREE.Vector3(0, 7.5, 0.1);
        targetCamLook.current = new THREE.Vector3(0, 0, 0);
        break;
    }
  };

  const resetCamera = () => {
    setCameraPreset('iso');
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, 0.9);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, -0.9);
      controlsRef.current.update();
    }
  };

  return (
    <div className="motor3d-container">
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="motor3d-canvas-wrap" />

      {/* Prominent Digital Twin Watermark */}
      <div className="digital-twin-watermark">
        <div className="watermark-badge">
          <Zap className="h-3.5 w-3.5 text-teal-400" />
          SIMULATED DIGITAL TWIN
        </div>
        <div className="watermark-sub">
          Interactive Physics-Linked 3D CAD Twin | STM32 Serial Telemetry Link
        </div>
      </div>

      {/* Live Telemetry Floating Indicators */}
      <div className="motor-live-telemetry-pill">
        <div className="flex items-center gap-2 bg-[#091226]/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${motorState === 'ON' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-slate-300 font-semibold">{motorState === 'ON' ? 'RUNNING' : 'STOPPED'}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#091226]/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-mono text-cyan-300">
          <Activity className="h-3 w-3 text-cyan-400" />
          <span>{curVib.toFixed(0)} <span className="text-[10px] text-slate-400">units</span></span>
        </div>
        <div className="flex items-center gap-2 bg-[#091226]/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-mono text-amber-300">
          <Thermometer className="h-3 w-3 text-amber-400" />
          <span>{curTemp.toFixed(1)} <span className="text-[10px] text-slate-400">°C</span></span>
        </div>
      </div>

      {/* 3D Sensor Annotation: Vibration Stud */}
      {vibPinPos.visible && (
        <div
          className="sensor-annotation sensor-point-vib"
          style={{
            left: `${vibPinPos.x}px`,
            top: `${vibPinPos.y}px`,
            transform: 'translate(-50%, -130%)',
          }}
          title="Drive-End Bearing Accelerometer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>VIB SENSOR: {curVib.toFixed(0)}</span>
        </div>
      )}

      {/* 3D Sensor Annotation: Temperature Stud */}
      {tempPinPos.visible && (
        <div
          className="sensor-annotation sensor-point-temp"
          style={{
            left: `${tempPinPos.x}px`,
            top: `${tempPinPos.y}px`,
            transform: 'translate(-50%, -130%)',
          }}
          title="Stator Core DHT11 Temperature Probe"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>TEMP SENSOR: {curTemp.toFixed(1)}°C</span>
        </div>
      )}

      {/* Ergonomic Bottom Controls Dock */}
      <div className="motor3d-controls-dock">
        <button
          onClick={() => setCameraPreset('iso')}
          className={`dock-btn ${currentPreset === 'iso' ? 'active' : ''}`}
          title="Default Isometric View"
        >
          <Eye className="h-3 w-3" /> ISO
        </button>

        <button
          onClick={() => setCameraPreset('front')}
          className={`dock-btn ${currentPreset === 'front' ? 'active' : ''}`}
          title="Drive-End Shaft View"
        >
          Shaft
        </button>

        <button
          onClick={() => setCameraPreset('fins')}
          className={`dock-btn ${currentPreset === 'fins' ? 'active' : ''}`}
          title="Cooling Fins Profile"
        >
          Fins
        </button>

        <button
          onClick={() => setCameraPreset('top')}
          className={`dock-btn ${currentPreset === 'top' ? 'active' : ''}`}
          title="Top Terminal Junction"
        >
          Top
        </button>

        <div className="w-[1px] h-4 bg-slate-700/60 mx-1" />

        <button
          onClick={() => setShowExploded((prev) => !prev)}
          className={`dock-btn ${showExploded ? 'active' : ''}`}
          title="Toggle Exploded CAD Assembly View"
        >
          <Layers className="h-3 w-3" />
          {showExploded ? 'Assembled' : 'Exploded'}
        </button>

        <div className="w-[1px] h-4 bg-slate-700/60 mx-1" />

        <button
          onClick={handleZoomIn}
          className="dock-btn hover:text-white"
          title="Zoom In 3D Motor"
        >
          <ZoomIn className="h-3 w-3" /> +
        </button>

        <button
          onClick={handleZoomOut}
          className="dock-btn hover:text-white"
          title="Zoom Out 3D Motor"
        >
          <ZoomOut className="h-3 w-3" /> -
        </button>

        <button
          onClick={resetCamera}
          className="dock-btn hover:text-white"
          title="Reset Camera Orientation"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
    </div>
  );
};
