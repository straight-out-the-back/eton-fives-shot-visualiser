import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function App() {
  const mountRef = useRef(null);
  const fireShotRef = useRef(() => {});
  const heightRef = useRef(0.3);
  const applyHeightRef = useRef(() => {});
  const resetViewRef = useRef(() => {});
  const toggleButtressRef = useRef(() => {});

  const [aim, setAim] = useState(0);
  const [loft, setLoft] = useState(20);
  const [power, setPower] = useState(55);
  const [height, setHeight] = useState(0.3); // metres above the floor at the strike point
  const [topspin, setTopspin] = useState(0);
  const [sidespin, setSidespin] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    function setAppVh() {
      const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    }
    setAppVh();
    window.addEventListener('resize', setAppVh);
    window.addEventListener('orientationchange', setAppVh);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setAppVh);
    }
    return () => {
      window.removeEventListener('resize', setAppVh);
      window.removeEventListener('orientationchange', setAppVh);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setAppVh);
      }
    };
  }, []);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountNode.appendChild(renderer.domElement);

    renderer.domElement.style.touchAction = 'none';

    const DEG2RAD = Math.PI / 180;

    const TOP_STEP_DEPTH = 3.06;
    const TOP_STEP_FLOOR_WIDTH = 4.00;
    const TOP_STEP_SLOPE = 2.2 * DEG2RAD;

    const BACK_STEP_DEPTH = 4.61;
    const BACK_STEP_WIDTH = 4.11;
    const BACK_STEP_SLOPE = 1 * DEG2RAD;

    const STEP_RISER = 0.143;

    const BACK_STEP_NEAR_Y = 0;
    const TOP_STEP_BACK_EDGE_Y = BACK_STEP_NEAR_Y + STEP_RISER;
    const TOP_STEP_FRONT_EDGE_Y = TOP_STEP_BACK_EDGE_Y + Math.tan(TOP_STEP_SLOPE) * TOP_STEP_DEPTH;
    const BACK_STEP_FAR_Y = BACK_STEP_NEAR_Y - Math.tan(BACK_STEP_SLOPE) * BACK_STEP_DEPTH;

    const LEDGE_SKIRT_THICKNESS = 0.055;
    const LEDGE1_Y = TOP_STEP_BACK_EDGE_Y + 0.59;

    const LEDGE2_BASE_Y = LEDGE1_Y + 0.78;
    const BEVEL_ANGLE = 34 * DEG2RAD;
    const BEVEL_SLANT_LENGTH = 0.067;
    const BEVEL_RUN = BEVEL_SLANT_LENGTH * Math.cos(BEVEL_ANGLE);
    const BEVEL_DROP = BEVEL_SLANT_LENGTH * Math.sin(BEVEL_ANGLE);
    const BEVEL_TOP_TOP_STEP_Y = LEDGE2_BASE_Y + BEVEL_DROP;

    const LEDGE2_BACK_Y = BACK_STEP_FAR_Y + 1.18;
    const BEVEL_TOP_BACK_STEP_Y = LEDGE2_BACK_Y + BEVEL_DROP;

    const UPPER_WALL_SETBACK = BEVEL_RUN;

    const COURT_WIDTH = BACK_STEP_WIDTH;
    const TOTAL_DEPTH = TOP_STEP_DEPTH + BACK_STEP_DEPTH;
    const WALL_HEIGHT = 3.66;
    const LEDGE_HEIGHT = 1.37;

    function floorHeightAt(z) {
      if (z < TOP_STEP_DEPTH) {
        return TOP_STEP_FRONT_EDGE_Y - Math.tan(TOP_STEP_SLOPE) * z;
      }
      const zInBack = z - TOP_STEP_DEPTH;
      return BACK_STEP_NEAR_Y - Math.tan(BACK_STEP_SLOPE) * zInBack;
    }

    const BUTTRESS_HEIGHT = 1.5;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb0a37e, roughness: 0.8, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const topFloorMat = new THREE.MeshStandardMaterial({ color: 0xa8a39a, roughness: 1 });
    const backFloorMat = new THREE.MeshStandardMaterial({ color: 0x87837b, roughness: 1 });
    const buttressMat = new THREE.MeshStandardMaterial({ color: 0xa89d88, roughness: 0.95, transparent: true, opacity: 1 });
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x35322d, roughness: 0.5, transparent: true, opacity: 1 });
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0xb0a58a, roughness: 0.9, side: THREE.DoubleSide });
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 1 });

    function fadeMaterial(material, targetOpacity) {
      material.opacity += (targetOpacity - material.opacity) * 0.15;
    }

    const FLOOR_THICKNESS = 0.05;

    const topFloor = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH, FLOOR_THICKNESS + 0.14, TOP_STEP_DEPTH),
      topFloorMat
    );
    const topFloorMidY = (TOP_STEP_FRONT_EDGE_Y + TOP_STEP_BACK_EDGE_Y) / 2;
    topFloor.position.set(COURT_WIDTH / 2, topFloorMidY - FLOOR_THICKNESS / 2 - 0.07, TOP_STEP_DEPTH / 2);
    topFloor.rotation.x = TOP_STEP_SLOPE;
    scene.add(topFloor);

    const LEDGE_SKIRT_HEIGHT = LEDGE1_Y - topFloorMidY;

    const backFloor = new THREE.Mesh(
      new THREE.BoxGeometry(BACK_STEP_WIDTH, FLOOR_THICKNESS, BACK_STEP_DEPTH),
      backFloorMat
    );
    const backFloorMidY = (BACK_STEP_NEAR_Y + BACK_STEP_FAR_Y) / 2;
    backFloor.position.set(COURT_WIDTH / 2, backFloorMidY - FLOOR_THICKNESS / 2, TOP_STEP_DEPTH + BACK_STEP_DEPTH / 2);
    backFloor.rotation.x = BACK_STEP_SLOPE;
    scene.add(backFloor);

    const riser = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH, STEP_RISER, 0.03),
      backFloorMat
    );
    riser.position.set(COURT_WIDTH / 2, TOP_STEP_BACK_EDGE_Y - STEP_RISER / 2, TOP_STEP_DEPTH);
    scene.add(riser);


    const riserPlane = {
      point: new THREE.Vector3(
        COURT_WIDTH / 2,
        TOP_STEP_BACK_EDGE_Y - STEP_RISER / 2,
        TOP_STEP_DEPTH
      ),

      normal: new THREE.Vector3(0, 0, 1),

      uAxis: new THREE.Vector3(1, 0, 0),
      vAxis: new THREE.Vector3(0, 1, 0),

      uHalf: COURT_WIDTH / 2,
      vHalf: STEP_RISER / 2
    };
    
    const ledgePlanes = [];

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = BACK_STEP_FAR_Y - 0.1;
    scene.add(ground);

    const frontWallLower = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH + 0.1, LEDGE2_BASE_Y - TOP_STEP_FRONT_EDGE_Y, 0.15),
      wallMat
    );
    frontWallLower.position.set(COURT_WIDTH / 2, (TOP_STEP_FRONT_EDGE_Y + LEDGE2_BASE_Y) / 2, -0.08);
    scene.add(frontWallLower);

    const frontWallUpper = new THREE.Mesh(
      new THREE.BoxGeometry(COURT_WIDTH + 0.2, TOP_STEP_FRONT_EDGE_Y + WALL_HEIGHT - BEVEL_TOP_TOP_STEP_Y, 0.15),
      wallMat
    );
    frontWallUpper.position.set(COURT_WIDTH / 2, (BEVEL_TOP_TOP_STEP_Y + TOP_STEP_FRONT_EDGE_Y + WALL_HEIGHT) / 2, -0.08 - UPPER_WALL_SETBACK);
    scene.add(frontWallUpper);

    function buildWallBand(zStart, zEnd, xCenter, thickness, yBottomStart, yBottomEnd, yTopStart, yTopEnd) {
      const shape = new THREE.Shape();
      shape.moveTo(-zStart, yBottomStart);
      shape.lineTo(-zEnd, yBottomEnd);
      shape.lineTo(-zEnd, yTopEnd);
      shape.lineTo(-zStart, yTopStart);
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      geometry.translate(0, 0, -thickness / 2);
      geometry.rotateY(Math.PI / 2);

      const mesh = new THREE.Mesh(geometry, wallMat);
      mesh.position.x = xCenter;
      return mesh;
    }

    const WALL_THICKNESS = 0.15;

    const leftWallTop = buildWallBand(
      0, TOP_STEP_DEPTH, -0.08, WALL_THICKNESS,
      floorHeightAt(0), floorHeightAt(TOP_STEP_DEPTH), LEDGE2_BASE_Y, LEDGE2_BASE_Y
    );
    scene.add(leftWallTop);

    const leftWallBack = buildWallBand(
      TOP_STEP_DEPTH, TOTAL_DEPTH, -0.08, WALL_THICKNESS,
      floorHeightAt(TOP_STEP_DEPTH), floorHeightAt(TOTAL_DEPTH), LEDGE2_BACK_Y, LEDGE2_BACK_Y
    );
    scene.add(leftWallBack);

    const rightWallTop = buildWallBand(
      0, TOP_STEP_DEPTH, COURT_WIDTH + 0.08, WALL_THICKNESS,
      floorHeightAt(0), floorHeightAt(TOP_STEP_DEPTH), LEDGE2_BASE_Y, LEDGE2_BASE_Y
    );
    scene.add(rightWallTop);

    const rightWallBack = buildWallBand(
      TOP_STEP_DEPTH, TOTAL_DEPTH, COURT_WIDTH + 0.08, WALL_THICKNESS,
      floorHeightAt(TOP_STEP_DEPTH), floorHeightAt(TOTAL_DEPTH), LEDGE2_BACK_Y, LEDGE2_BACK_Y
    );
    scene.add(rightWallBack);

    const leftWallTopUpper = buildWallBand(
      -0.21, TOP_STEP_DEPTH, -0.08 - UPPER_WALL_SETBACK, WALL_THICKNESS,
      BEVEL_TOP_TOP_STEP_Y, BEVEL_TOP_TOP_STEP_Y, floorHeightAt(0) + WALL_HEIGHT, floorHeightAt(TOP_STEP_DEPTH) + WALL_HEIGHT
    );
    scene.add(leftWallTopUpper);

    const leftWallBackUpper = buildWallBand(
      TOP_STEP_DEPTH, TOTAL_DEPTH, -0.08 - UPPER_WALL_SETBACK, WALL_THICKNESS,
      floorHeightAt(TOP_STEP_DEPTH), floorHeightAt(TOTAL_DEPTH), floorHeightAt(TOP_STEP_DEPTH) + WALL_HEIGHT, floorHeightAt(TOTAL_DEPTH) + WALL_HEIGHT
    );
    scene.add(leftWallBackUpper);

    const rightWallTopUpper = buildWallBand(
      -0.21, TOP_STEP_DEPTH, COURT_WIDTH + 0.08 + UPPER_WALL_SETBACK, WALL_THICKNESS,
      BEVEL_TOP_TOP_STEP_Y, BEVEL_TOP_TOP_STEP_Y, floorHeightAt(0) + WALL_HEIGHT, floorHeightAt(TOP_STEP_DEPTH) + WALL_HEIGHT
    );
    scene.add(rightWallTopUpper);

    const rightWallBackUpper = buildWallBand(
      TOP_STEP_DEPTH,
      TOTAL_DEPTH,
      COURT_WIDTH + 0.08 + UPPER_WALL_SETBACK,
      WALL_THICKNESS,
      floorHeightAt(TOP_STEP_DEPTH),
      floorHeightAt(TOTAL_DEPTH),
      floorHeightAt(TOP_STEP_DEPTH) + WALL_HEIGHT,
      floorHeightAt(TOTAL_DEPTH) + WALL_HEIGHT
    );
    scene.add(rightWallBackUpper);

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

    const skirtLeftBox = new THREE.Box3().setFromObject(skirtLeft);
    const skirtRightBox = new THREE.Box3().setFromObject(skirtRight);
    const skirtFrontBox = new THREE.Box3().setFromObject(skirtFront);

        // Flat ledge collision planes

    const leftFlatLedgePlane = {
      point: new THREE.Vector3(
        0,
        LEDGE1_Y,
        TOP_STEP_DEPTH / 2
      ),
      normal: new THREE.Vector3(0, 1, 0),
      uAxis: new THREE.Vector3(0, 0, 1),
      vAxis: new THREE.Vector3(1, 0, 0),
      uHalf: TOP_STEP_DEPTH / 2,
      vHalf: LEDGE_SKIRT_THICKNESS / 2
    };

    const rightFlatLedgePlane = {
      point: new THREE.Vector3(
        COURT_WIDTH,
        LEDGE1_Y,
        TOP_STEP_DEPTH / 2
      ),
      normal: new THREE.Vector3(0, 1, 0),
      uAxis: new THREE.Vector3(0, 0, 1),
      vAxis: new THREE.Vector3(1, 0, 0),
      uHalf: TOP_STEP_DEPTH / 2,
      vHalf: LEDGE_SKIRT_THICKNESS / 2
    };

    const frontFlatLedgePlane = {
      point: new THREE.Vector3(
        COURT_WIDTH / 2,
        LEDGE1_Y,
        0
      ),
      normal: new THREE.Vector3(0, 1, 0),
      uAxis: new THREE.Vector3(1, 0, 0),
      vAxis: new THREE.Vector3(0, 0, 1),
      uHalf: COURT_WIDTH / 2,
      vHalf: LEDGE_SKIRT_THICKNESS / 2
    };


    ledgePlanes.push(
      leftFlatLedgePlane,
      rightFlatLedgePlane,
      frontFlatLedgePlane
    );

    function makeBevelWedgeGeometry(baseY, dropHeight, runDepth, length) {
      const shape = new THREE.Shape();
      shape.moveTo(0, baseY);
      shape.lineTo(runDepth, baseY);
      shape.lineTo(0, baseY + dropHeight);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    }

    const bevelLeftTop = new THREE.Mesh(
      makeBevelWedgeGeometry(LEDGE2_BASE_Y, BEVEL_DROP, BEVEL_RUN, TOP_STEP_DEPTH + 0.055),
      skirtMat
    );
    bevelLeftTop.position.set(-UPPER_WALL_SETBACK - 0.005, 0, -0.055);
    scene.add(bevelLeftTop);

    const bevelLeftBack = new THREE.Mesh(
      makeBevelWedgeGeometry(LEDGE2_BACK_Y, BEVEL_DROP, BEVEL_RUN, BACK_STEP_DEPTH),
      skirtMat
    );
    bevelLeftBack.position.set(-UPPER_WALL_SETBACK - 0.005, 0, TOP_STEP_DEPTH);
    scene.add(bevelLeftBack);

    const bevelRightTop = new THREE.Mesh(
      makeBevelWedgeGeometry(LEDGE2_BASE_Y, BEVEL_DROP, BEVEL_RUN, TOP_STEP_DEPTH + 0.055),
      skirtMat
    );
    bevelRightTop.scale.x = -1;
    bevelRightTop.position.set(COURT_WIDTH + UPPER_WALL_SETBACK + 0.005, 0, -0.055);
    scene.add(bevelRightTop);

    const bevelRightBack = new THREE.Mesh(
      makeBevelWedgeGeometry(LEDGE2_BACK_Y, BEVEL_DROP, BEVEL_RUN, BACK_STEP_DEPTH),
      skirtMat
    );
    bevelRightBack.scale.x = -1;
    bevelRightBack.position.set(COURT_WIDTH + UPPER_WALL_SETBACK + 0.005, 0, TOP_STEP_DEPTH);
    scene.add(bevelRightBack);

    // Sloped ledge collision planes

    const bevelNormal = new THREE.Vector3(
      0,
      Math.cos(BEVEL_ANGLE),
      Math.sin(BEVEL_ANGLE)
    ).normalize();

    const bevelXAxis = new THREE.Vector3(
      0,
      -Math.sin(BEVEL_ANGLE),
      Math.cos(BEVEL_ANGLE)
    ).normalize();


    ledgePlanes.push(
      {
        point: new THREE.Vector3(
          0,
          LEDGE2_BASE_Y + BEVEL_DROP,
          TOP_STEP_DEPTH / 2
        ),
        normal: bevelNormal.clone(),
        uAxis: bevelXAxis.clone(),
        vAxis: new THREE.Vector3(1,0,0),
        uHalf: BEVEL_SLANT_LENGTH / 2,
        vHalf: TOP_STEP_DEPTH / 2
      },

      {
        point: new THREE.Vector3(
          COURT_WIDTH,
          LEDGE2_BASE_Y + BEVEL_DROP,
          TOP_STEP_DEPTH / 2
        ),
        normal: bevelNormal.clone().multiplyScalar(-1),
        uAxis: bevelXAxis.clone(),
        vAxis: new THREE.Vector3(1,0,0),
        uHalf: BEVEL_SLANT_LENGTH / 2,
        vHalf: TOP_STEP_DEPTH / 2
      }
    );

    const bevelFrontGeo = makeBevelWedgeGeometry(LEDGE2_BASE_Y, BEVEL_DROP, BEVEL_RUN, COURT_WIDTH + 0.11);
    bevelFrontGeo.rotateY(-Math.PI / 2);
    bevelFrontGeo.translate(COURT_WIDTH, 0, 0);
    const bevelFront = new THREE.Mesh(bevelFrontGeo, skirtMat);
    bevelFront.position.set(0.055, 0, -UPPER_WALL_SETBACK - 0.005);
    scene.add(bevelFront);

    const BALL_RADIUS = 0.023;

    function buildGablePier(width, depth, bodyHeight, capHeight, material) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), material);
      body.position.y = bodyHeight / 2;
      group.add(body);

      const roofShape = new THREE.Shape();
      roofShape.moveTo(-width / 2, 0);
      roofShape.lineTo(width / 2, 0);
      roofShape.lineTo(0, capHeight);
      roofShape.closePath();

      const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth, bevelEnabled: false });
      roofGeo.translate(0, 0, -depth / 2);

      const roof = new THREE.Mesh(roofGeo, material);
      roof.position.y = bodyHeight;
      group.add(roof);

      return group;
    }

    function buildSlopedLedgePier(width, depth, bodyHeight, capHeight, material) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyHeight, depth), material);
      body.position.y = bodyHeight / 2;
      group.add(body);

      const capShape = new THREE.Shape();
      capShape.moveTo(-width / 2, capHeight);
      capShape.lineTo(width / 2, 0);
      capShape.lineTo(-width / 2, 0);
      capShape.closePath();

      const capGeo = new THREE.ExtrudeGeometry(capShape, { depth, bevelEnabled: false });
      capGeo.translate(0, 0, -depth / 2);

      const cap = new THREE.Mesh(capGeo, material);
      cap.position.y = bodyHeight;
      group.add(cap);

      return group;
    }

    const BUTTRESS_GAP_FROM_TOP_STEP = 0.2;

    const MAIN_PIER = {
      width: 0.6,
      depth: 0.7, // extended so the near edge reaches the left wall (was 0.6)
      bodyHeight: 1.4,
      capHeight: 0.25,
      x: 0.35, // recentred so the near edge sits at x=0 (touching the wall) while the far/court-facing edge stays where it was
    };
    // NOTE: because mainPierMesh is rotated 90° about Y further down, its
    // local "depth" actually governs the pier's extent along world X (how
    // far it reaches toward the wall), while local "width" governs its
    // extent along world Z (along the court's length, parallel to the
    // wall). This position formula needs WIDTH, not depth, to correctly
    // place the pier's near face relative to the step — using depth here
    // (as before) would shift the pier along the court every time depth
    // changes, even though depth no longer affects that direction at all.
    MAIN_PIER.z = TOP_STEP_DEPTH + BUTTRESS_GAP_FROM_TOP_STEP + MAIN_PIER.width / 2;
    MAIN_PIER.y = floorHeightAt(MAIN_PIER.z);

    const SIDE_PIER = {
      width: 0.4,
      depth: 0.4,
      bodyHeight: 1.3, // raised — was 1.0; total height now 1.5 vs the main pier's 1.65, still a bit smaller
      capHeight: 0.2,
      x: 0.2,
    };
    // Same width-vs-depth note as above: MAIN_PIER's true world-Z half
    // extent is width/2, not depth/2.
    SIDE_PIER.z = (MAIN_PIER.z - MAIN_PIER.width / 2) - SIDE_PIER.depth / 2;
    SIDE_PIER.y = floorHeightAt(SIDE_PIER.z);

    const mainPierMesh = buildGablePier(MAIN_PIER.width, MAIN_PIER.depth, MAIN_PIER.bodyHeight, MAIN_PIER.capHeight, buttressMat);
    mainPierMesh.position.set(MAIN_PIER.x, MAIN_PIER.y, MAIN_PIER.z);
    mainPierMesh.rotation.y = Math.PI / 2;
    scene.add(mainPierMesh);

    const sidePierMesh = buildSlopedLedgePier(SIDE_PIER.width, SIDE_PIER.depth, SIDE_PIER.bodyHeight, SIDE_PIER.capHeight, buttressMat);
    sidePierMesh.position.set(SIDE_PIER.x, SIDE_PIER.y, SIDE_PIER.z);
    scene.add(sidePierMesh);

    mainPierMesh.updateWorldMatrix(true, true);
    sidePierMesh.updateWorldMatrix(true, true);

    const mainPierBodyBox = new THREE.Box3().setFromObject(mainPierMesh.children[0]);
    const sidePierBodyBox = new THREE.Box3().setFromObject(sidePierMesh.children[0]);
    const helper = new THREE.Box3Helper(mainPierBodyBox, 0xff0000);
    //scene.add(helper);
    const helper2 = new THREE.Box3Helper(sidePierBodyBox, 0x00ff00);
    //scene.add(helper2);

    function reflectOffPlane(prevPos, pos, vel, omega, planePoint, planeNormal, uAxis, vAxis, uHalf, vHalf, restitution, mu) {
      const relNow = pos.clone().sub(planePoint);
      const distNow = relNow.dot(planeNormal);

      const relPrev = prevPos.clone().sub(planePoint);
      const distPrev = relPrev.dot(planeNormal);

      const currentlyTouching = distNow >= 0 && distNow <= BALL_RADIUS;
      const tunnelledThrough = distPrev > BALL_RADIUS && distNow <= BALL_RADIUS;
      if (!currentlyTouching && !tunnelledThrough) return;

      const uCoord = relNow.dot(uAxis);
      const vCoord = relNow.dot(vAxis);
      if (Math.abs(uCoord) > uHalf || Math.abs(vCoord) > vHalf) return;

      pos.addScaledVector(planeNormal, BALL_RADIUS - distNow);
      const speedIntoPlane = vel.dot(planeNormal);
      if (speedIntoPlane < -0.05) {
        const normalSpeedBefore = Math.abs(speedIntoPlane);
        vel.addScaledVector(planeNormal, -(1 + restitution) * speedIntoPlane);
        applySpinFriction(vel, omega, planeNormal, mu, restitution, normalSpeedBefore);
      }
    }

    function getRoofPlanes(pier) {
      const halfWidth = pier.width / 2;
      const slopeAngle = Math.atan2(pier.capHeight, halfWidth);
      const slantLength = Math.hypot(halfWidth, pier.capHeight);

      const normalRight = new THREE.Vector3(Math.sin(slopeAngle), Math.cos(slopeAngle), 0);
      const pointRight = new THREE.Vector3(pier.x + halfWidth / 2, pier.y + pier.bodyHeight + pier.capHeight / 2, pier.z);
      const uAxisRight = new THREE.Vector3(Math.cos(slopeAngle), -Math.sin(slopeAngle), 0);

      const normalLeft = new THREE.Vector3(-Math.sin(slopeAngle), Math.cos(slopeAngle), 0);
      const pointLeft = new THREE.Vector3(pier.x - halfWidth / 2, pier.y + pier.bodyHeight + pier.capHeight / 2, pier.z);
      const uAxisLeft = new THREE.Vector3(-Math.cos(slopeAngle), -Math.sin(slopeAngle), 0);

      const vAxis = new THREE.Vector3(0, 0, 1);

      return [
        { point: pointRight, normal: normalRight, uAxis: uAxisRight, vAxis, uHalf: slantLength / 2, vHalf: pier.depth / 2 },
        { point: pointLeft, normal: normalLeft, uAxis: uAxisLeft, vAxis, uHalf: slantLength / 2, vHalf: pier.depth / 2 },
      ];
    }

    function getSlopedLedgePlane(pier) {
      const halfWidth = pier.width / 2;
      const slantLength = Math.hypot(pier.width, pier.capHeight);

      const uAxis = new THREE.Vector3(pier.width, -pier.capHeight, 0).normalize();
      const normal = new THREE.Vector3(pier.capHeight, pier.width, 0).normalize();
      const vAxis = new THREE.Vector3(0, 0, 1);

      const point = new THREE.Vector3(
        pier.x,
        pier.y + pier.bodyHeight + pier.capHeight / 2,
        pier.z
      );

      return [{ point, normal, uAxis, vAxis, uHalf: slantLength / 2, vHalf: pier.depth / 2 }];
    }

    function rotateRoofPlanesY(planes, center, angle) {
      const rot = new THREE.Matrix4().makeRotationY(angle);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(rot);

      return planes.map((plane) => {
        const point = plane.point.clone().sub(center).applyMatrix4(rot).add(center);

        const normal = plane.normal.clone().applyMatrix3(normalMatrix).normalize();
        const uAxis = plane.uAxis.clone().applyMatrix3(normalMatrix).normalize();
        const vAxis = plane.vAxis.clone().applyMatrix3(normalMatrix).normalize();

        return {
          point,
          normal,
          uAxis,
          vAxis,
          uHalf: plane.uHalf,
          vHalf: plane.vHalf,
        };
      });
    }

    const mainPierCenter = new THREE.Vector3(MAIN_PIER.x, MAIN_PIER.y, MAIN_PIER.z);

    const mainPierRoofPlanes = rotateRoofPlanesY(getRoofPlanes(MAIN_PIER), mainPierCenter, Math.PI / 2);
    const sidePierRoofPlanes = getSlopedLedgePlane(SIDE_PIER);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 24),
      new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.15,
          metalness: 0
      })
    );

    const outline = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS * 1.08, 24, 24),
        new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.BackSide
        })
    );

    ball.add(outline);

    const START_POS = new THREE.Vector3(COURT_WIDTH / 2, floorHeightAt(TOTAL_DEPTH - 1.2) + 0.3, TOTAL_DEPTH - 1.2);
    ball.position.copy(START_POS);
    scene.add(ball);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.4 });
    let trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), lineMat);
    //trajectoryLine.visible = false;
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const keyLight = new THREE.DirectionalLight(0xfff2d9, 1.1);
    keyLight.position.set(4.6, 7.6, 3.0);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9db4c0, 0.35);
    fillLight.position.set(-3.0, 3.0, -4.6);
    scene.add(fillLight);

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

    const activePointers = new Map();
    let dragStartX = 0, dragStartY = 0, dragMoved = false;
    let pinchStartDist = 0, pinchStartRadius = 0, pinchMidStart = null;

    function getActivePointerArray() {
      return Array.from(activePointers.values());
    }
    function getPointerDistance() {
      const pts = getActivePointerArray();
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
    function getMidpoint() {
      const pts = getActivePointerArray();
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    }

    function onPointerDown(e) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        dragMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (activePointers.size === 2) {
        dragMoved = true;
        pinchStartDist = getPointerDistance();
        pinchStartRadius = targetRadius;
        pinchMidStart = getMidpoint();
      }
    }

    function onPointerUp(e) {
      const wasSingleTap = activePointers.size === 1 && !dragMoved;
      activePointers.delete(e.pointerId);

      if (wasSingleTap) {
        const totalMove = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
        if (totalMove < 4) handleFloorClick(e);
      }

      if (activePointers.size === 1) {
        const [remaining] = getActivePointerArray();
        dragStartX = remaining.x;
        dragStartY = remaining.y;
      }
    }

    function onPointerCancel(e) {
      activePointers.delete(e.pointerId);
    }

    function onPointerMove(e) {
      if (!activePointers.has(e.pointerId)) return;
      const prev = activePointers.get(e.pointerId);
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        if (Math.abs(e.clientX - dragStartX) > 4 || Math.abs(e.clientY - dragStartY) > 4) dragMoved = true;

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
      } else if (activePointers.size === 2) {
        const newDist = getPointerDistance();
        if (pinchStartDist > 0) {
          const scale = pinchStartDist / newDist;
          targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, pinchStartRadius * scale));
        }

        const newMid = getMidpoint();
        const midDx = newMid.x - pinchMidStart.x;
        const midDy = newMid.y - pinchMidStart.y;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const panSpeed = radius * 0.0016;
        orbitCenter.addScaledVector(right, -midDx * panSpeed);
        orbitCenter.addScaledVector(up, midDy * panSpeed);
        pinchMidStart = newMid;
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
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    const pressedKeys = new Set();
    let buttressVisible = true;

    function resetView() {
      targetTheta = DEFAULT_THETA;
      targetPhi = DEFAULT_PHI;
      targetRadius = DEFAULT_RADIUS;
      orbitCenter.copy(DEFAULT_ORBIT_CENTER);
    }
    function toggleButtress() {
      buttressVisible = !buttressVisible;
    }
    resetViewRef.current = resetView;
    toggleButtressRef.current = toggleButtress;

    function onKeyDown(e) {
      pressedKeys.add(e.key);
      if (e.key.toLowerCase() === 'b') toggleButtress();
      if (e.key.toLowerCase() === 'r') resetView();
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

    const GRAVITY = 9.81;
    const DT = 1 / 120;
    const MAX_TIME = 8;
    const MAX_SPIN_RADPS = 100;

    const FLOOR_RESTITUTION = 0.7;
    const FLOOR_MU = 0.45;

    const WALL_RESTITUTION = 0.68;
    const WALL_MU = 0.4;

    const BUTTRESS_RESTITUTION = 0.7;
    const BUTTRESS_MU = 0.4;

    const I_SPECIFIC = (2 / 5) * BALL_RADIUS * BALL_RADIUS;
    const STICK_RATIO = 1 + (BALL_RADIUS * BALL_RADIUS) / I_SPECIFIC;

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
      const speed = 1.52 + (powerPct / 100) * 13.7;

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
        const prevPos = pos.clone();
        vel.y -= GRAVITY * DT;
        pos.addScaledVector(vel, DT);

        const floorY = floorHeightAt(pos.z);
        if (pos.y - BALL_RADIUS < floorY && vel.y < 0) {
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
        if (pos.x - BALL_RADIUS < -0.08) {
          const normalSpeedBefore = Math.abs(vel.x);
          pos.x = -0.08 + BALL_RADIUS;
          vel.x = -vel.x * WALL_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(1, 0, 0), WALL_MU, WALL_RESTITUTION, normalSpeedBefore);
        }
        if (pos.x + BALL_RADIUS > COURT_WIDTH + 0.08) {
          const normalSpeedBefore = Math.abs(vel.x);
          pos.x = COURT_WIDTH + 0.08 - BALL_RADIUS;
          vel.x = -vel.x * WALL_RESTITUTION;
          applySpinFriction(vel, omega, new THREE.Vector3(-1, 0, 0), WALL_MU, WALL_RESTITUTION, normalSpeedBefore);
        }

        reflectOffBox(
          pos,
          vel,
          omega,
          skirtLeftBox.min,
          skirtLeftBox.max,
          WALL_RESTITUTION,
          WALL_MU
        );

        reflectOffBox(
          pos,
          vel,
          omega,
          skirtRightBox.min,
          skirtRightBox.max,
          WALL_RESTITUTION,
          WALL_MU
        );

        reflectOffBox(
          pos,
          vel,
          omega,
          skirtFrontBox.min,
          skirtFrontBox.max,
          WALL_RESTITUTION,
          WALL_MU
        );


        reflectOffPlane(
            prevPos,
            pos,
            vel,
            omega,

            riserPlane.point,
            riserPlane.normal,
            riserPlane.uAxis,
            riserPlane.vAxis,
            riserPlane.uHalf,
            riserPlane.vHalf,

            WALL_RESTITUTION,
            WALL_MU
        );

                // Ledge collisions
        for (const plane of ledgePlanes) {
          reflectOffPlane(
            prevPos,
            pos,
            vel,
            omega,

            plane.point,
            plane.normal,
            plane.uAxis,
            plane.vAxis,
            plane.uHalf,
            plane.vHalf,

            WALL_RESTITUTION,
            WALL_MU
          );
        }

        reflectOffBox(pos, vel, omega, mainPierBodyBox.min, mainPierBodyBox.max, BUTTRESS_RESTITUTION, BUTTRESS_MU);
        reflectOffBox(pos, vel, omega, sidePierBodyBox.min, sidePierBodyBox.max, BUTTRESS_RESTITUTION, BUTTRESS_MU);
        for (const plane of mainPierRoofPlanes) {
          reflectOffPlane(prevPos, pos, vel, omega, plane.point, plane.normal, plane.uAxis, plane.vAxis, plane.uHalf, plane.vHalf, BUTTRESS_RESTITUTION, BUTTRESS_MU);
        }
        for (const plane of sidePierRoofPlanes) {
          reflectOffPlane(prevPos, pos, vel, omega, plane.point, plane.normal, plane.uAxis, plane.vAxis, plane.uHalf, plane.vHalf, BUTTRESS_RESTITUTION, BUTTRESS_MU);
        }

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
      leftWallTopUpper.visible = leftVisible;
      leftWallBack.visible = leftVisible;
      leftWallBackUpper.visible = leftVisible;
      rightWallTop.visible = rightVisible;
      rightWallTopUpper.visible = rightVisible;
      rightWallBack.visible = rightVisible;
      rightWallBackUpper.visible = rightVisible;
      frontWallLower.visible = frontVisible;
      frontWallUpper.visible = frontVisible;

      skirtLeft.visible = leftVisible;
      skirtRight.visible = rightVisible;
      skirtFront.visible = frontVisible;

      bevelLeftTop.visible = leftVisible;
      bevelLeftBack.visible = leftVisible;
      bevelRightTop.visible = rightVisible;
      bevelRightBack.visible = rightVisible;
      bevelFront.visible = frontVisible;

      mainPierMesh.visible = buttressVisible;
      sidePierMesh.visible = buttressVisible;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
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
    position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
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
  const fireButtonStyle = {
    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    background: '#cdbd94', color: '#1a1c1f', border: 'none', borderRadius: 10,
    padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.35)', WebkitTapHighlightColor: 'transparent',
  };
  const cornerButtonStyle = {
    background: 'rgba(26, 28, 31, 0.85)', color: '#e9e6df', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      className="app-root"
      style={{ width: '100vw', position: 'relative', touchAction: 'none', overscrollBehavior: 'none' }}
    >
      <style>{`
        .app-root {
          height: 100vh;
        }
        @supports not (height: 100dvh) {
          .app-root {
            height: calc(var(--app-vh, 1vh) * 100);
          }
        }
        @supports (height: 100dvh) {
          .app-root {
            height: 100dvh;
          }
        }
        @media (max-width: 700px) {
          .control-panel {
            padding: 10px 10px !important;
            gap: 8px !important;
            bottom: 8px !important;
            border-radius: 12px !important;
          }
          .control-field {
            width: 27vw !important;
            min-width: 84px !important;
          }
          .control-field label {
            font-size: 11px !important;
          }
          .hint-text {
            font-size: 10.5px !important;
            line-height: 1.5 !important;
            max-width: 55vw;
          }
          .fire-button {
            padding: 12px 18px !important;
            font-size: 14px !important;
          }
          .corner-buttons {
            top: 8px !important;
            right: 8px !important;
            gap: 6px !important;
          }
          .corner-buttons button {
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      <div ref={mountRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

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
              This is brand new and very much a work in progress - any and all
              feedback is really really appreciated! Instructions for how to use this are in the top left.
            </p>
            <p style={{ margin: '22px 0 0', fontSize: 13, color: '#8f8a7d' }}>
              Tap or press space to continue
            </p>
          </div>
        </div>
      )}

      <div
        className="hint-text"
        style={{
          position: 'absolute', top: 16, left: 16, color: '#8f8a7d', fontSize: 12,
          lineHeight: 1.7, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          pointerEvents: 'none', maxWidth: '62vw',
        }}
      >
        <div>Drag: rotate &nbsp;•&nbsp; Shift+drag / two-finger drag: pan</div>
        <div>Scroll / pinch: zoom &nbsp;•&nbsp; Arrow keys: rotate & tilt</div>
        <div>Click or tap floor: move start position</div>
      </div>

      <div
        className="corner-buttons"
        style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, maxWidth: '50vw' }}
      >
        <button style={cornerButtonStyle} onClick={() => resetViewRef.current()}>
          Reset view
        </button>
        <button style={cornerButtonStyle} onClick={() => toggleButtressRef.current()}>
          Toggle buttress
        </button>
        <button style={cornerButtonStyle} onClick={() => setControlsOpen((o) => !o)}>
          {controlsOpen ? 'Hide' : 'Show'} shot settings
        </button>
      </div>

      {controlsOpen && (
        <div className="control-panel" style={panelStyle}>
          <div className="control-field" style={fieldStyle}>
            <label>Height: {height.toFixed(2)} m</label>
            <input type="range" min={0.05} max={3} step={0.05} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
          <div className="control-field" style={fieldStyle}>
            <label>Aim: {aim}°</label>
            <input type="range" min={-90} max={90} value={aim} onChange={(e) => setAim(Number(e.target.value))} />
          </div>
          <div className="control-field" style={fieldStyle}>
            <label>Loft: {loft}°</label>
            <input type="range" min={-30} max={80} value={loft} onChange={(e) => setLoft(Number(e.target.value))} />
          </div>
          <div className="control-field" style={fieldStyle}>
            <label>Power: {power}%</label>
            <input type="range" min={0} max={175} value={power} onChange={(e) => setPower(Number(e.target.value))} />
          </div>
          <div className="control-field" style={fieldStyle}>
            <label>Topspin: {topspin}</label>
            <input type="range" min={-100} max={100} value={topspin} onChange={(e) => setTopspin(Number(e.target.value))} />
          </div>
          <div className="control-field" style={fieldStyle}>
            <label>Sidespin: {sidespin}</label>
            <input type="range" min={-100} max={100} value={sidespin} onChange={(e) => setSidespin(Number(e.target.value))} />
          </div>
        </div>
      )}

      <button className="fire-button" style={fireButtonStyle} onClick={() => fireShotRef.current(aim, power, loft, topspin, sidespin)}>
        Hit the ball
      </button>
    </div>
  );
}

export default App;