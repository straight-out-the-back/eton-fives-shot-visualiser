import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function App() {
  const mountRef = useRef(null);
  const fireShotRef = useRef(() => {});
  const heightRef = useRef(1);
  const applyHeightRef = useRef(() => {});

  const [aim, setAim] = useState(0);
  const [loft, setLoft] = useState(20);
  const [power, setPower] = useState(55);
  const [height, setHeight] = useState(1);
  const [topspin, setTopspin] = useState(0);   // -100 (backspin) .. 100 (topspin)
  const [sidespin, setSidespin] = useState(0); // -100 (left) .. 100 (right)

  useEffect(() => {
    heightRef.current = height;
    applyHeightRef.current(height);
  }, [height]);

  useEffect(() => {
    const mountNode = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1c1f);
    scene.fog = new THREE.Fog(0x1a1c1f, 25, 70);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountNode.appendChild(renderer.domElement);

    const COURT_WIDTH = 14;
    const FRONT_COURT_DEPTH = 10;
    const BACK_COURT_DEPTH = 15;
    const STEP_HEIGHT = 0.45;
    const WALL_HEIGHT = 12;
    const LEDGE_HEIGHT = 4.5;
    const TOTAL_DEPTH = FRONT_COURT_DEPTH + BACK_COURT_DEPTH;

    const BUTTRESS_MIN = new THREE.Vector3(0, 0, FRONT_COURT_DEPTH - 2.6);
    const BUTTRESS_MAX = new THREE.Vector3(3.2, 6, FRONT_COURT_DEPTH + 1.5);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcdbd94, roughness: 0.9, transparent: true, opacity: 1 });
    const frontFloorMat = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, roughness: 1 });
    const backFloorMat = new THREE.MeshStandardMaterial({ color: 0xa6a196, roughness: 1 });
    const buttressMat = new THREE.MeshStandardMaterial({ color: 0x8f7a52, roughness: 0.85, transparent: true, opacity: 1 });
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.6, transparent: true, opacity: 1 });
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 1 });

    function fadeMaterial(material, targetOpacity) {
      material.opacity += (targetOpacity - material.opacity) * 0.15;
    }

    const frontFloor = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, STEP_HEIGHT, FRONT_COURT_DEPTH), frontFloorMat);
    frontFloor.position.set(COURT_WIDTH / 2, STEP_HEIGHT / 2, FRONT_COURT_DEPTH / 2);
    scene.add(frontFloor);

    const backFloor = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, 0.1, BACK_COURT_DEPTH), backFloorMat);
    backFloor.position.set(COURT_WIDTH / 2, -0.05, FRONT_COURT_DEPTH + BACK_COURT_DEPTH / 2);
    scene.add(backFloor);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    scene.add(ground);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, WALL_HEIGHT, 0.5), wallMat);
    frontWall.position.set(COURT_WIDTH / 2, WALL_HEIGHT / 2, -0.25);
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_HEIGHT, TOTAL_DEPTH), wallMat);
    leftWall.position.set(-0.25, WALL_HEIGHT / 2, TOTAL_DEPTH / 2);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_HEIGHT, TOTAL_DEPTH), wallMat);
    rightWall.position.set(COURT_WIDTH + 0.25, WALL_HEIGHT / 2, TOTAL_DEPTH / 2);
    scene.add(rightWall);

    const ledge = new THREE.Mesh(new THREE.BoxGeometry(COURT_WIDTH, 0.25, 0.6), ledgeMat);
    ledge.position.set(COURT_WIDTH / 2, LEDGE_HEIGHT, 0.05);
    scene.add(ledge);

    const buttressFace = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6, 3), buttressMat);
    buttressFace.position.set(1.3, 3, FRONT_COURT_DEPTH);
    scene.add(buttressFace);

    const buttressWing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 1.4), buttressMat);
    buttressWing.position.set(2.6, 3, FRONT_COURT_DEPTH - 1.9);
    scene.add(buttressWing);

    const BALL_RADIUS = 0.15;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 })
    );
    const START_POS = new THREE.Vector3(COURT_WIDTH / 2, 1, TOTAL_DEPTH - 4);
    ball.position.copy(START_POS);
    scene.add(ball);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6 });
    let trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), lineMat);
    scene.add(trajectoryLine);

    const startMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, side: THREE.DoubleSide })
    );
    startMarker.rotation.x = -Math.PI / 2;
    function floorHeightAt(z) {
      return z < FRONT_COURT_DEPTH ? STEP_HEIGHT : 0;
    }
    startMarker.position.set(START_POS.x, floorHeightAt(START_POS.z) + 0.02, START_POS.z);
    scene.add(startMarker);

    function applyHeight(h) {
      const floorY = floorHeightAt(START_POS.z);
      START_POS.y = floorY + h;
      ball.position.copy(START_POS);
    }
    applyHeightRef.current = applyHeight;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xfff2d9, 0.9);
    keyLight.position.set(15, 25, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9db4c0, 0.35);
    fillLight.position.set(-10, 10, -15);
    scene.add(fillLight);

    const orbitCenter = new THREE.Vector3(COURT_WIDTH / 2, 2, TOTAL_DEPTH * 0.45);
    const DEFAULT_ORBIT_CENTER = orbitCenter.clone();
    const DEFAULT_RADIUS = 26;
    const DEFAULT_THETA = Math.PI * 0.32;
    const DEFAULT_PHI = Math.PI * 0.32;

    let radius = DEFAULT_RADIUS, theta = DEFAULT_THETA, phi = DEFAULT_PHI;
    let targetRadius = radius, targetTheta = theta, targetPhi = phi;

    const MIN_PHI = 0.15;
    const MAX_PHI = Math.PI / 2 - 0.05;
    const MIN_RADIUS = 8;
    const MAX_RADIUS = 55;
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
        // pan: move the point the camera orbits around, using the camera's
        // own right/up vectors so it feels natural from any viewing angle
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const panSpeed = radius * 0.0016; // scales with zoom so panning feels consistent
        orbitCenter.addScaledVector(right, -dx * panSpeed);
        orbitCenter.addScaledVector(up, dy * panSpeed);
      } else {
        targetTheta -= dx * 0.006;
        targetPhi -= dy * 0.006;
        targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, targetPhi));
      }
    }
    function onWheel(e) {
      targetRadius += e.deltaY * 0.02;
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

      const hits = raycaster.intersectObjects([frontFloor, backFloor]);
      if (hits.length === 0) return;

      const point = hits[0].point;
      const floorY = floorHeightAt(point.z);

      START_POS.set(point.x, floorY + heightRef.current, point.z);
      ball.position.copy(START_POS);
      startMarker.position.set(point.x, floorY + 0.02, point.z);

      activeFlight = null;
      trajectoryLine.geometry.dispose();
      trajectoryLine.geometry = new THREE.BufferGeometry();
    }

    // ================= PHYSICS =================
    const GRAVITY = 32;
    const DT = 1 / 120;
    const MAX_TIME = 8;
    const MAX_SPIN_RADPS = 45; // angular velocity at slider extremes

    const FLOOR_RESTITUTION = 0.6;
    const FLOOR_MU = 0.45; // friction coefficient — how strongly the surface grips spin

    const WALL_RESTITUTION = 0.68;
    const WALL_MU = 0.4;

    const BUTTRESS_RESTITUTION = 0.6;
    const BUTTRESS_MU = 0.4;

    // For a solid sphere, moment of inertia I = (2/5) m r^2. Working in
    // "per unit mass" terms throughout (so we never need an actual mass value).
    const I_SPECIFIC = (2 / 5) * BALL_RADIUS * BALL_RADIUS;
    const STICK_RATIO = 1 + (BALL_RADIUS * BALL_RADIUS) / I_SPECIFIC; // = 3.5 for a solid sphere

    // Applies the friction impulse at a bounce: figures out how fast the
    // ball's surface is sliding against the wall/floor at the contact point
    // (a mix of its linear velocity and its spin), then reduces that slide
    // — capped by how much grip the surface actually has — updating both
    // the linear velocity and the spin as a result.
    function applySpinFriction(vel, omega, normal, mu, restitution, normalSpeedBefore) {
      const contactOffset = normal.clone().multiplyScalar(-BALL_RADIUS); // center -> contact point
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
        // The ball's center ended up fully inside the box — this happens when
        // a fast shot travels far enough in one physics step to skip clean
        // past the surface-only check below. Rather than missing the
        // collision entirely, push the ball back out through whichever face
        // is nearest and bounce off that.
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

      // normal case: ball is outside the box, check if it's within one radius
      // of the nearest point on the surface
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
      const speed = 5 + (powerPct / 100) * 45;

      const pos = START_POS.clone();
      const vel = new THREE.Vector3(
        speed * Math.cos(loftRad) * Math.sin(aimRad),
        speed * Math.sin(loftRad),
        -speed * Math.cos(loftRad) * Math.cos(aimRad)
      );

      // spin axes: "topspin" rotates about the horizontal axis perpendicular
      // to the direction of travel; "sidespin" rotates about vertical (y)
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

        const floorY = pos.z < FRONT_COURT_DEPTH ? STEP_HEIGHT : 0;
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

        if (vel.length() < 0.6 && pos.y - floorY < 0.05) break;
        if (pos.z > TOTAL_DEPTH + 3) break;
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

      leftWall.visible = camera.position.x >= 0;
      rightWall.visible = camera.position.x <= COURT_WIDTH;
      const frontVisible = camera.position.z >= 0;
      frontWall.visible = frontVisible;
      ledge.visible = frontVisible;
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

      <div style={{
        position: 'absolute', top: 16, left: 16, color: '#8f8a7d', fontSize: 12,
        lineHeight: 1.7, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        pointerEvents: 'none',
      }}>
        <div>Drag: rotate &nbsp;•&nbsp; Shift+drag: pan &nbsp;•&nbsp; Scroll: zoom</div>
        <div>Arrow keys: rotate/tilt &nbsp;•&nbsp; R: reset view &nbsp;•&nbsp; B: toggle buttress</div>
        <div>Click floor: move start position</div>
      </div>

      <div style={panelStyle}>
        <div style={fieldStyle}>
          <label>Height: {height.toFixed(1)} ft</label>
          <input type="range" min={0.2} max={9} step={0.1} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Aim: {aim}°</label>
          <input type="range" min={-90} max={90} value={aim} onChange={(e) => setAim(Number(e.target.value))} />
        </div>
        <div style={fieldStyle}>
          <label>Loft: {loft}°</label>
          <input type="range" min={0} max={80} value={loft} onChange={(e) => setLoft(Number(e.target.value))} />
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