import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function App() {
  const mountRef = useRef(null);
  const fireShotRef = useRef(() => {});
  const heightRef = useRef(0.3);
  const applyHeightRef = useRef(() => {});

  const [aim, setAim] = useState(0);
  const [loft, setLoft] = useState(20);
  const [power, setPower] = useState(55);
  const [height, setHeight] = useState(0.3); // metres above the floor at the strike point
  const [topspin, setTopspin] = useState(0);
  const [sidespin, setSidespin] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  // Dismiss the "work in progress" intro popup with the spacebar too, not
  // just a click. Kept as its own effect (independent of the three.js one
  // below) so it doesn't need to know anything about the scene/camera.
  useEffect(() => {
    if (!showIntro) return;
    function onKeyDown(e) {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setShowIntro(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIntro]);

  useEffect(() => {
    heightRef.current = height;
    applyHeightRef.current(height);
  }, [height]);

  useEffect(() => {
    const mountNode = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1c1f);
    scene.fog = new THREE.Fog(0x1a1c1f, 7.6, 21.3);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountNode.appendChild(renderer.domElement);

    // =================================================================
    // COURT DIMENSIONS — all in metres, from real measurements.
    // z = 0 at the front wall, increasing toward the open back.
    // Coordinate system origin (y = 0) is set at the back step's highest
    // point (its edge nearest the top step) — an arbitrary but convenient
    // reference; every other height is derived relative to it.
    // =================================================================
    const DEG2RAD = Math.PI / 180;

    const TOP_STEP_DEPTH = 3.06;       // "long" dimension, z-direction
    const TOP_STEP_FLOOR_WIDTH = 4.00; // playable floor width (inset by the skirting)
    const TOP_STEP_SLOPE = 2.2 * DEG2RAD;

    const BACK_STEP_DEPTH = 4.61;
    const BACK_STEP_WIDTH = 4.11;      // full wall-to-wall width
    const BACK_STEP_SLOPE = 1 * DEG2RAD;

    const STEP_RISER = 0.143; // vertical riser between top step's back edge and back step's front edge

    // Height reference points, derived from the slopes/riser above.
    // NOTE: these must be declared before anything that uses them (LEDGE1_Y,
    // LEDGE2_BACK_Y, floorHeightAt, wall spans, etc). They were previously
    // declared further down while being referenced above their own
    // declaration, which throws "Cannot access before initialization"
    // (a temporal-dead-zone error) the moment the component mounts.
    const BACK_STEP_NEAR_Y = 0; // our y = 0 reference
    const TOP_STEP_BACK_EDGE_Y = BACK_STEP_NEAR_Y + STEP_RISER;
    const TOP_STEP_FRONT_EDGE_Y = TOP_STEP_BACK_EDGE_Y + Math.tan(TOP_STEP_SLOPE) * TOP_STEP_DEPTH;
    const BACK_STEP_FAR_Y = BACK_STEP_NEAR_Y - Math.tan(BACK_STEP_SLOPE) * BACK_STEP_DEPTH;

    // Wall profile, bottom to top (all "protrusion" values are how far the
    // wall sticks inward into the court beyond its baseline thin thickness):
    //   floor -> LEDGE1_Y         : thick base, protrudes LEDGE_SKIRT_THICKNESS (flat step at LEDGE1_Y)
    //   LEDGE1_Y -> LEDGE2_BASE_Y : baseline thin wall, no protrusion
    //   LEDGE2_BASE_Y -> +BEVEL_DROP : bevelled transition back to baseline (see note above)
    // Heights below are all fixed WORLD heights (the ledges run level,
    // they do not follow the floor's slight slope).
    const LEDGE_SKIRT_THICKNESS = 0.055;
    const LEDGE1_Y = TOP_STEP_BACK_EDGE_Y + 0.59; // first (flat) ledge, top step — 3 walls

    const LEDGE2_BASE_Y = LEDGE1_Y + 0.78; // second (bevelled) ledge, top step — 3 walls
    const BEVEL_ANGLE = 34 * DEG2RAD;      // ASSUMPTION: measured from horizontal — confirm
    const BEVEL_DROP = 0.067;              // vertical extent of the bevel band
    const BEVEL_RUN = BEVEL_DROP / Math.tan(BEVEL_ANGLE); // horizontal protrusion at the bevel's lowest point

    const LEDGE2_BACK_Y = BACK_STEP_FAR_Y + 1.18; // same bevel, back step — 2 side walls only, measured from the open back

    const COURT_WIDTH = BACK_STEP_WIDTH; // overall wall-to-wall width
    const TOTAL_DEPTH = TOP_STEP_DEPTH + BACK_STEP_DEPTH;
    const WALL_HEIGHT = 3.66;   // placeholder, unchanged from earlier estimate
    const LEDGE_HEIGHT = 1.37;  // placeholder "line" ledge height, unchanged for now

    // Continuous floor height as a function of z (no cross-slope in x).
    function floorHeightAt(z) {
      if (z < TOP_STEP_DEPTH) {
        return TOP_STEP_FRONT_EDGE_Y - Math.tan(TOP_STEP_SLOPE) * z;
      }
      const zInBack = z - TOP_STEP_DEPTH;
      return BACK_STEP_NEAR_Y - Math.tan(BACK_STEP_SLOPE) * zInBack;
    }

    // buttress footprint — still placeholder dimensions, just converted to metres
    const BUTTRESS_HEIGHT = 1.5; // 150cm
    const BUTTRESS_MIN = new THREE.Vector3(0, 0, TOP_STEP_DEPTH - 0.79);
    const BUTTRESS_MAX = new THREE.Vector3(0.98, BUTTRESS_HEIGHT, TOP_STEP_DEPTH + 0.46);

    // ----- materials -----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcdbd94, roughness: 0.9, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const topFloorMat = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 1 });
    const backFloorMat = new THREE.MeshStandardMaterial({ color: 0xa6a196, roughness: 1 });
    const buttressMat = new THREE.MeshStandardMaterial({ color: 0x8f7a52, roughness: 0.85, transparent: true, opacity: 1 });
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.6, transparent: true, opacity: 1 });
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0xb0a58a, roughness: 0.8 });
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 1 });

    function fadeMaterial(material, targetOpacity) {
      material.opacity += (targetOpacity - material.opacity) * 0.15;
    }

    // ----- floor slabs, tilted to match the real slopes -----
    const FLOOR_THICKNESS = 0.05;

    // Full court width, not just the inset "playable" width — otherwise a
    // thin gap opens up at each edge once the skirt (which used to cover
    // that inset) is hidden from certain camera angles.
    const topFloor = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH, FLOOR_THICKNESS, TOP_STEP_DEPTH),
      topFloorMat
    );
    const topFloorMidY = (TOP_STEP_FRONT_EDGE_Y + TOP_STEP_BACK_EDGE_Y) / 2;
    topFloor.position.set(COURT_WIDTH / 2, topFloorMidY - FLOOR_THICKNESS / 2, TOP_STEP_DEPTH / 2);
    topFloor.rotation.x = TOP_STEP_SLOPE; // tilts so it dips toward +z, matching floorHeightAt
    scene.add(topFloor);

    // How tall the thick skirting at the base of the walls is, on the top
    // step: it runs from the (average) floor level up to LEDGE1_Y. This was
    // referenced below (skirtLeft/Right/Front) but never actually defined —
    // that's a ReferenceError as soon as this code runs.
    const LEDGE_SKIRT_HEIGHT = LEDGE1_Y - topFloorMidY;

    const backFloor = new THREE.Mesh(
      new THREE.BoxGeometry(BACK_STEP_WIDTH, FLOOR_THICKNESS, BACK_STEP_DEPTH),
      backFloorMat
    );
    const backFloorMidY = (BACK_STEP_NEAR_Y + BACK_STEP_FAR_Y) / 2;
    backFloor.position.set(COURT_WIDTH / 2, backFloorMidY - FLOOR_THICKNESS / 2, TOP_STEP_DEPTH + BACK_STEP_DEPTH / 2);
    backFloor.rotation.x = BACK_STEP_SLOPE;
    scene.add(backFloor);

    // small riser face connecting the two steps visually — width matches
    // the full court width (like the floor), not the narrower inset width,
    // otherwise a gap opens up on each side where it meets the walls.
    const riser = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH, STEP_RISER, 0.03),
      backFloorMat
    );
    riser.position.set(COURT_WIDTH / 2, TOP_STEP_BACK_EDGE_Y - STEP_RISER / 2, TOP_STEP_DEPTH);
    scene.add(riser);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = BACK_STEP_FAR_Y - 0.1;
    scene.add(ground);

    // Side walls run the full court depth (top step + back step). Each
    // wall is built the same way as the floor slabs — one tilted segment
    // per step, rotated to match that step's slope — so the wall's base
    // sits flush against the sloped floor the whole way along, instead of
    // a flat-bottomed box that either floats above the floor or clips
    // through it.
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, WALL_HEIGHT, 0.15), wallMat);
    frontWall.position.set(COURT_WIDTH / 2, WALL_HEIGHT / 2 + TOP_STEP_FRONT_EDGE_Y, -0.08);
    scene.add(frontWall);

    // Build a side-wall segment as its actual profile: a trapezoid with a
    // sloped bottom edge (following floorHeightAt, same slope the floor
    // uses) but perfectly vertical front/back edges. Rotating a full box to
    // match the slope (the previous approach) also shears the box's front
    // face sideways by roughly WALL_HEIGHT * tan(slope) — small angle, but
    // over a 3.66m wall height that's still several centimetres of gap
    // against the front wall. Building the exact profile avoids that entirely.
    function buildSlopedWallSegment(zStart, zEnd, xCenter, thickness) {
      const yStart = floorHeightAt(zStart);
      const yEnd = floorHeightAt(zEnd);
      const shape = new THREE.Shape();
      // shape's local x is -z (negated) so that, after the rotateY(90°)
      // below, the local axes land on world (x = thickness dir, z = depth)
      // with the correct sign and orientation.
      shape.moveTo(-zStart, yStart);
      shape.lineTo(-zEnd, yEnd);
      shape.lineTo(-zEnd, yEnd + WALL_HEIGHT);
      shape.lineTo(-zStart, yStart + WALL_HEIGHT);
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geometry.translate(0, 0, -thickness / 2);
      geometry.rotateY(Math.PI / 2);

      const mesh = new THREE.Mesh(geometry, wallMat);
      mesh.position.x = xCenter;
      return mesh;
    }

    const WALL_THICKNESS = 0.15;

    const leftWallTop = buildSlopedWallSegment(0, TOP_STEP_DEPTH, -0.08, WALL_THICKNESS);
    scene.add(leftWallTop);

    const leftWallBack = buildSlopedWallSegment(TOP_STEP_DEPTH, TOTAL_DEPTH, -0.08, WALL_THICKNESS);
    scene.add(leftWallBack);

    const rightWallTop = buildSlopedWallSegment(0, TOP_STEP_DEPTH, COURT_WIDTH + 0.08, WALL_THICKNESS);
    scene.add(rightWallTop);

    const rightWallBack = buildSlopedWallSegment(TOP_STEP_DEPTH, TOTAL_DEPTH, COURT_WIDTH + 0.08, WALL_THICKNESS);
    scene.add(rightWallBack);

    const ledge = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, 0.08, 0.18), ledgeMat);
    ledge.position.set(COURT_WIDTH / 2, LEDGE_HEIGHT + TOP_STEP_FRONT_EDGE_Y, 0.02);
    scene.add(ledge);

    // the thicker wall base (the real ledge) — wraps left, right, and front
    // walls, only across the top-step section, protruding inward by
    // LEDGE_SKIRT_THICKNESS from floor level up to LEDGE_SKIRT_HEIGHT
    const skirtLeft = new THREE.Mesh(
      new THREE.BoxGeometry(LEDGE_SKIRT_THICKNESS, LEDGE_SKIRT_HEIGHT, TOP_STEP_DEPTH),
      skirtMat
    );
    skirtLeft.position.set(LEDGE_SKIRT_THICKNESS / 2, topFloorMidY + LEDGE_SKIRT_HEIGHT / 2, TOP_STEP_DEPTH / 2);
    scene.add(skirtLeft);

    const skirtRight = new THREE.Mesh(
      new THREE.BoxGeometry(LEDGE_SKIRT_THICKNESS, LEDGE_SKIRT_HEIGHT, TOP_STEP_DEPTH),
      skirtMat
    );
    skirtRight.position.set(COURT_WIDTH - LEDGE_SKIRT_THICKNESS / 2, topFloorMidY + LEDGE_SKIRT_HEIGHT / 2, TOP_STEP_DEPTH / 2);
    scene.add(skirtRight);

    const skirtFront = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH, LEDGE_SKIRT_HEIGHT, LEDGE_SKIRT_THICKNESS),
      skirtMat
    );
    skirtFront.position.set(COURT_WIDTH / 2, topFloorMidY + LEDGE_SKIRT_HEIGHT / 2, LEDGE_SKIRT_THICKNESS / 2);
    scene.add(skirtFront);

    // ----- buttress (visual, placeholder shape until real dimensions confirmed) -----
    const buttressFace = new THREE.Mesh(new THREE.BoxGeometry(0.79, BUTTRESS_HEIGHT, 0.91), buttressMat);
    buttressFace.position.set(0.4, BUTTRESS_HEIGHT / 2 + TOP_STEP_BACK_EDGE_Y, TOP_STEP_DEPTH);
    scene.add(buttressFace);

    const buttressWing = new THREE.Mesh(new THREE.BoxGeometry(0.37, BUTTRESS_HEIGHT, 0.43), buttressMat);
    buttressWing.position.set(0.79, BUTTRESS_HEIGHT / 2 + TOP_STEP_BACK_EDGE_Y, TOP_STEP_DEPTH - 0.58);
    scene.add(buttressWing);

    // ----- the ball -----
    const BALL_RADIUS = 0.046;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 })
    );
    const START_POS = new THREE.Vector3(COURT_WIDTH / 2, floorHeightAt(TOTAL_DEPTH - 1.2) + 0.3, TOTAL_DEPTH - 1.2);
    ball.position.copy(START_POS);
    scene.add(ball);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6 });
    let trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), lineMat);
    scene.add(trajectoryLine);

    const startMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.11, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, side: THREE.DoubleSide })
    );
    startMarker.rotation.x = -Math.PI / 2;
    startMarker.position.set(START_POS.x, floorHeightAt(START_POS.z) + 0.01, START_POS.z);
    scene.add(startMarker);

    function applyHeight(h) {
      const floorY = floorHeightAt(START_POS.z);
      START_POS.y = floorY + h;
      ball.position.copy(START_POS);
    }
    applyHeightRef.current = applyHeight;

    // ----- lighting -----
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xfff2d9, 0.9);
    keyLight.position.set(4.6, 7.6, 3.0);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9db4c0, 0.35);
    fillLight.position.set(-3.0, 3.0, -4.6);
    scene.add(fillLight);

    // ----- camera orbit (damped, with shift-drag pan and R to reset) -----
    const orbitCenter = new THREE.Vector3(COURT_WIDTH / 2, 0.6, TOTAL_DEPTH * 0.45);
    const DEFAULT_ORBIT_CENTER = orbitCenter.clone();
    const DEFAULT_RADIUS = 7.9;
    const DEFAULT_THETA = Math.PI * 0.32;
    const DEFAULT_PHI = Math.PI * 0.32;

    let radius = DEFAULT_RADIUS, theta = DEFAULT_THETA, phi = DEFAULT_PHI;
    let targetRadius = radius, targetTheta = theta, targetPhi = phi;

    const MIN_PHI = 0.15;
    const MAX_PHI = Math.PI / 2 - 0.05;
    const MIN_RADIUS = 2.4;
    const MAX_RADIUS = 16.8;
    const DAMPING = 0.1;

    function updateCameraPosition() {
      const clampedPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
      camera.position.x = orbitCenter.x + radius * Math.sin(clampedPhi) * Math.sin(theta);
      camera.position.y = orbitCenter.y + radius * Math.cos(clampedPhi);
      camera.position.z = orbitCenter.z + radius * Math.sin(clampedPhi) * Math.cos(theta);
      camera.lookAt(orbitCenter);
    }
    updateCameraPosition();

    let isDragging = false;
    let dragStartX = 0, dragStartY = 0, lastX = 0, lastY = 0, dragMoved = false;

    function onPointerDown(e) {
      isDragging = true;
      dragMoved = false;
      dragStartX = lastX = e.clientX;
      dragStartY = lastY = e.clientY;
    }
    function onPointerUp(e) {
      isDragging = false;
      const totalMove = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
      if (!dragMoved && totalMove < 4) handleFloorClick(e);
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragMoved = true;

      if (e.shiftKey) {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const panSpeed = radius * 0.0016;
        orbitCenter.addScaledVector(right, -dx * panSpeed);
        orbitCenter.addScaledVector(up, dy * panSpeed);
      } else {
        targetTheta -= dx * 0.006;
        targetPhi -= dy * 0.006;
        targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, targetPhi));
      }
    }
    function onWheel(e) {
      targetRadius += e.deltaY * 0.006;
      targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, targetRadius));
    }
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    const pressedKeys = new Set();
    let buttressVisible = true;
    function onKeyDown(e) {
      pressedKeys.add(e.key);
      if (e.key.toLowerCase() === 'b') buttressVisible = !buttressVisible;
      if (e.key.toLowerCase() === 'r') {
        targetTheta = DEFAULT_THETA;
        targetPhi = DEFAULT_PHI;
        targetRadius = DEFAULT_RADIUS;
        orbitCenter.copy(DEFAULT_ORBIT_CENTER);
      }
    }
    function onKeyUp(e) { pressedKeys.delete(e.key); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function applyKeyboardInput() {
      const ROTATE_SPEED = 0.03;
      const TILT_SPEED = 0.02;
      if (pressedKeys.has('ArrowLeft')) targetTheta += ROTATE_SPEED;
      if (pressedKeys.has('ArrowRight')) targetTheta -= ROTATE_SPEED;
      if (pressedKeys.has('ArrowUp')) targetPhi -= TILT_SPEED;
      if (pressedKeys.has('ArrowDown')) targetPhi += TILT_SPEED;
      targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, targetPhi));
    }

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    function handleFloorClick(e) {
      pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);

      const hits = raycaster.intersectObjects([topFloor, backFloor]);
      if (hits.length === 0) return;

      const point = hits[0].point;
      const floorY = floorHeightAt(point.z);

      START_POS.set(point.x, floorY + heightRef.current, point.z);
      ball.position.copy(START_POS);
      startMarker.position.set(point.x, floorY + 0.01, point.z);

      activeFlight = null;
      trajectoryLine.geometry.dispose();
      trajectoryLine.geometry = new THREE.BufferGeometry();
    }

    // ================= PHYSICS =================
    const GRAVITY = 9.81;
    const DT = 1 / 120;
    const MAX_TIME = 8;
    const MAX_SPIN_RADPS = 45;

    const FLOOR_RESTITUTION = 0.49; // measured from the real court
    const FLOOR_MU = 0.45;

    const WALL_RESTITUTION = 0.68;
    const WALL_MU = 0.4;

    const BUTTRESS_RESTITUTION = 0.6;
    const BUTTRESS_MU = 0.4;

    const I_SPECIFIC = (2 / 5) * BALL_RADIUS * BALL_RADIUS;
    const STICK_RATIO = 1 + (BALL_RADIUS * BALL_RADIUS) / I_SPECIFIC; // = 3.5 for a solid sphere

    function applySpinFriction(vel, omega, normal, mu, restitution, normalSpeedBefore) {
      const contactOffset = normal.clone().multiplyScalar(-BALL_RADIUS);
      const contactVel = vel.clone().add(new THREE.Vector3().crossVectors(omega, contactOffset));
      const normalComponent = normal.clone().multiplyScalar(contactVel.dot(normal));
      const slipVel = contactVel.clone().sub(normalComponent);
      const slipSpeed = slipVel.length();
      if (slipSpeed < 1e-4) return;

      const slipDir = slipVel.clone().normalize();
      const impulseToFullyStopSlip = slipSpeed / STICK_RATIO;
      const maxAvailableFriction = mu * (1 + restitution) * normalSpeedBefore;
      const impulseMag = Math.min(impulseToFullyStopSlip, maxAvailableFriction);

      const impulse = slipDir.clone().multiplyScalar(-impulseMag);
      vel.add(impulse);

      const angularImpulse = new THREE.Vector3().crossVectors(contactOffset, impulse).divideScalar(I_SPECIFIC);
      omega.add(angularImpulse);
    }

    function reflectOffBox(pos, vel, omega, boxMin, boxMax, restitution, mu) {
      const insideX = pos.x > boxMin.x && pos.x < boxMax.x;
      const insideY = pos.y > boxMin.y && pos.y < boxMax.y;
      const insideZ = pos.z > boxMin.z && pos.z < boxMax.z;

      if (insideX && insideY && insideZ) {
        const faces = [
          { normal: new THREE.Vector3(-1, 0, 0), depth: pos.x - boxMin.x },
          { normal: new THREE.Vector3(1, 0, 0), depth: boxMax.x - pos.x },
          { normal: new THREE.Vector3(0, -1, 0), depth: pos.y - boxMin.y },
          { normal: new THREE.Vector3(0, 1, 0), depth: boxMax.y - pos.y },
          { normal: new THREE.Vector3(0, 0, -1), depth: pos.z - boxMin.z },
          { normal: new THREE.Vector3(0, 0, 1), depth: boxMax.z - pos.z },
        ];
        faces.sort((a, b) => a.depth - b.depth);
        const nearest = faces[0];
        const normal = nearest.normal;

        pos.addScaledVector(normal, nearest.depth + BALL_RADIUS);
        const speedIntoWall = vel.dot(normal);
        if (speedIntoWall < 0) {
          const normalSpeedBefore = Math.abs(speedIntoWall);
          vel.addScaledVector(normal, -(1 + restitution) * speedIntoWall);
          applySpinFriction(vel, omega, normal, mu, restitution, normalSpeedBefore);
        }
        return;
      }

      const closest = new THREE.Vector3(
        Math.max(boxMin.x, Math.min(pos.x, boxMax.x)),
        Math.max(boxMin.y, Math.min(pos.y, boxMax.y)),
        Math.max(boxMin.z, Math.min(pos.z, boxMax.z))
      );
      const diff = pos.clone().sub(closest);
      const dist = diff.length();
      if (dist < BALL_RADIUS && dist > 0.0001) {
        const normal = diff.normalize();
        const overlap = BALL_RADIUS - dist;
        pos.addScaledVector(normal, overlap);
        const speedIntoWall = vel.dot(normal);
        if (speedIntoWall < 0) {
          const normalSpeedBefore = Math.abs(speedIntoWall);
          vel.addScaledVector(normal, -(1 + restitution) * speedIntoWall);
          applySpinFriction(vel, omega, normal, mu, restitution, normalSpeedBefore);
        }
      }
    }

    function computeTrajectory(aimDeg, powerPct, loftDeg, topspinPct, sidespinPct) {
      const aimRad = (aimDeg * Math.PI) / 180;
      const loftRad = (loftDeg * Math.PI) / 180;
      const speed = 1.52 + (powerPct / 100) * 13.7; // m/s

      const pos = START_POS.clone();
      const vel = new THREE.Vector3(
        speed * Math.cos(loftRad) * Math.sin(aimRad),
        speed * Math.sin(loftRad),
        -speed * Math.cos(loftRad) * Math.cos(aimRad)
      );

      const horizontalDir = new THREE.Vector3(vel.x, 0, vel.z).normalize();
      const topAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), horizontalDir).normalize();
      const omega = new THREE.Vector3();
      omega.addScaledVector(topAxis, (topspinPct / 100) * MAX_SPIN_RADPS);
      omega.addScaledVector(new THREE.Vector3(0, 1, 0), (sidespinPct / 100) * MAX_SPIN_RADPS);

      const points = [pos.clone()];
      let t = 0;

      while (t < MAX_TIME) {
        vel.y -= GRAVITY * DT;
        pos.addScaledVector(vel, DT);

        const floorY = floorHeightAt(pos.z);
        if (pos.y - BALL_RADIUS < floorY) {
          const normalSpeedBefore = Math.abs(vel.y);
          pos.y = floorY + BALL_RADIUS;
          vel.y = -vel.y * FLOOR_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(0, 1, 0), FLOOR_MU, FLOOR_RESTITUTION, normalSpeedBefore);
        }

        if (pos.z - BALL_RADIUS < 0) {
          const normalSpeedBefore = Math.abs(vel.z);
          pos.z = BALL_RADIUS;
          vel.z = -vel.z * WALL_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(0, 0, 1), WALL_MU, WALL_RESTITUTION, normalSpeedBefore);
        }
        if (pos.x - BALL_RADIUS < 0) {
          const normalSpeedBefore = Math.abs(vel.x);
          pos.x = BALL_RADIUS;
          vel.x = -vel.x * WALL_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(1, 0, 0), WALL_MU, WALL_RESTITUTION, normalSpeedBefore);
        }
        if (pos.x + BALL_RADIUS > COURT_WIDTH) {
          const normalSpeedBefore = Math.abs(vel.x);
          pos.x = COURT_WIDTH - BALL_RADIUS;
          vel.x = -vel.x * WALL_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(-1, 0, 0), WALL_MU, WALL_RESTITUTION, normalSpeedBefore);
        }

        reflectOffBox(pos, vel, omega, BUTTRESS_MIN, BUTTRESS_MAX, BUTTRESS_RESTITUTION, BUTTRESS_MU);

        points.push(pos.clone());
        t += DT;

        if (vel.length() < 0.2 && pos.y - floorY < 0.015) break;
        if (pos.z > TOTAL_DEPTH + 1) break;
      }
      return points;
    }

    let activeFlight = null;

    function fireShot(aimDeg, powerPct, loftDeg, topspinPct, sidespinPct) {
      const points = computeTrajectory(aimDeg, powerPct, loftDeg, topspinPct, sidespinPct);
      trajectoryLine.geometry.dispose();
      trajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      activeFlight = { points, startTime: performance.now() };
    }
    fireShotRef.current = fireShot;

    let frameId;
    function animate() {
      frameId = requestAnimationFrame(animate);
      applyKeyboardInput();

      theta += (targetTheta - theta) * DAMPING;
      phi += (targetPhi - phi) * DAMPING;
      radius += (targetRadius - radius) * DAMPING;
      updateCameraPosition();

      if (activeFlight) {
        const elapsed = (performance.now() - activeFlight.startTime) / 1000;
        const idx = Math.floor(elapsed / DT);
        if (idx < activeFlight.points.length) {
          ball.position.copy(activeFlight.points[idx]);
        } else {
          ball.position.copy(activeFlight.points[activeFlight.points.length - 1]);
          activeFlight = null;
        }
      }

      const leftVisible = camera.position.x >= 0;
      const rightVisible = camera.position.x <= COURT_WIDTH;
      const frontVisible = camera.position.z >= 0;

      leftWallTop.visible = leftVisible;
      leftWallBack.visible = leftVisible;
      rightWallTop.visible = rightVisible;
      rightWallBack.visible = rightVisible;
      frontWall.visible = frontVisible;
      ledge.visible = frontVisible;

      // The skirt is the thick "injogging" ledge running along the base of
      // each of these three walls — it should disappear along with its wall
      // so it doesn't keep blocking the view into the court.
      skirtLeft.visible = leftVisible;
      skirtRight.visible = rightVisible;
      skirtFront.visible = frontVisible;

      // The buttress keeps its manual 'B' toggle only — it doesn't hide
      // based on camera angle like the walls/skirt do.
      buttressFace.visible = buttressVisible;
      buttressWing.visible = buttressVisible;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mountNode.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const panelStyle = {
    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(26, 28, 31, 0.85)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '16px 22px', display: 'flex', flexWrap: 'wrap',
    gap: 18, alignItems: 'center', justifyContent: 'center', maxWidth: '92vw',
    color: '#e9e6df', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13,
  };
  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 4, width: 120 };
  const buttonStyle = {
    background: '#cdbd94', color: '#1a1c1f', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {showIntro && (
        <div
          onClick={() => setShowIntro(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10, 11, 12, 0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 24, textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: '#e9e6df',
          }}
        >
          <div style={{ maxWidth: 460 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 22, color: '#cdbd94' }}>
              Thanks very much for testing this out!
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: 15, lineHeight: 1.6 }}>
              This is brand new and very much a work in progress — any and all
              feedback is really appreciated. Instructions for use are in the top left! And there is currently no working version for mobile (soon!)
            </p>
            <p style={{ margin: '22px 0 0', fontSize: 13, color: '#8f8a7d' }}>
              Click anywhere or press space to continue
            </p>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', top: 16, left: 16, color: '#8f8a7d', fontSize: 12,
        lineHeight: 1.7, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        pointerEvents: 'none',
      }}>
        <div>Drag: rotate &nbsp;•&nbsp; Shift+drag: pan &nbsp;•&nbsp; Scroll: zoom</div>
        <div>Arrow keys: rotate (left and right) and tilt (up and down)</div>
        <div>R: reset view &nbsp;•&nbsp; B: toggle buttress</div>
        <div>Click floor: move start position</div>
      </div>

      <div style={panelStyle}>
        <div style={fieldStyle}>
          <label>Height: {height.toFixed(2)} m</label>
          <input type="range" min={0.05} max={3} step={0.05} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Aim: {aim}°</label>
          <input type="range" min={-90} max={90} value={aim} onChange={(e) => setAim(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Loft: {loft}°</label>
          <input type="range" min={-30} max={80} value={loft} onChange={(e) => setLoft(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Power: {power}%</label>
          <input type="range" min={0} max={175} value={power} onChange={(e) => setPower(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Topspin: {topspin}</label>
          <input type="range" min={-100} max={100} value={topspin} onChange={(e) => setTopspin(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Sidespin: {sidespin}</label>
          <input type="range" min={-100} max={100} value={sidespin} onChange={(e) => setSidespin(Number(e.target.value))} />
        </div>
        <button style={buttonStyle} onClick={() => fireShotRef.current(aim, power, loft, topspin, sidespin)}>
          Hit the ball
        </button>
      </div>
    </div>
  );
}

export default App;