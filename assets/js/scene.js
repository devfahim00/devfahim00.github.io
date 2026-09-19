/* three.js background: drifting particle network + wireframe core */
(function () {
  'use strict';

  var root = document.documentElement;
  var canvas = document.getElementById('bg');
  if (!canvas || typeof THREE === 'undefined') { root.classList.add('no-webgl'); return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { root.classList.add('no-webgl'); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  var small = window.innerWidth < 720;
  var N = small ? 55 : 110;              // particles
  var LINK = small ? 3.0 : 3.4;          // link distance
  var LINK2 = LINK * LINK;
  var MAXL = small ? 220 : 520;          // max line segments
  var BOX = { x: 22, y: 13, z: 9 };

  var group = new THREE.Group();
  scene.add(group);

  /* --- particles --- */
  var pos = new Float32Array(N * 3);
  var vel = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * BOX.x * 2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * BOX.y * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z * 2;
    vel[i * 3]     = (Math.random() - 0.5) * 0.012;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  var pMat = new THREE.PointsMaterial({ color: 0x22d3ee, size: 0.09, transparent: true, opacity: 0.9, sizeAttenuation: true });
  var points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  group.add(points);

  /* --- connecting lines --- */
  var linePos = new Float32Array(MAXL * 6);
  var lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lGeo.setDrawRange(0, 0);
  var lMat = new THREE.LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.34 });
  var lines = new THREE.LineSegments(lGeo, lMat);
  lines.frustumCulled = false;
  group.add(lines);

  /* --- wireframe core --- */
  var core = new THREE.Group();
  var outer = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.2, 1),
    new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.5 })
  );
  var inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 0),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.65 })
  );
  core.add(outer, inner);
  scene.add(core);

  /* --- interaction state --- */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var scrollY = window.scrollY || 0;
  window.addEventListener('scroll', function () { scrollY = window.scrollY || 0; }, { passive: true });

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var wide = camera.aspect > 1.15;
    core.position.set(wide ? 5.4 : 0, wide ? 0.2 : 2.2, wide ? 0 : -3);
    core.scale.setScalar(wide ? 1 : 0.75);
  }
  window.addEventListener('resize', resize);
  resize();

  function stepParticles() {
    for (var i = 0; i < N; i++) {
      var k = i * 3;
      pos[k]     += vel[k];
      pos[k + 1] += vel[k + 1];
      pos[k + 2] += vel[k + 2];
      if (pos[k] > BOX.x || pos[k] < -BOX.x) vel[k] *= -1;
      if (pos[k + 1] > BOX.y || pos[k + 1] < -BOX.y) vel[k + 1] *= -1;
      if (pos[k + 2] > BOX.z || pos[k + 2] < -BOX.z) vel[k + 2] *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  function buildLines() {
    var n = 0;
    outer: for (var i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var dx = pos[i * 3] - pos[j * 3];
        var dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        var dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK2) {
          if (n >= MAXL) break outer;
          var o = n * 6;
          linePos[o]     = pos[i * 3];
          linePos[o + 1] = pos[i * 3 + 1];
          linePos[o + 2] = pos[i * 3 + 2];
          linePos[o + 3] = pos[j * 3];
          linePos[o + 4] = pos[j * 3 + 1];
          linePos[o + 5] = pos[j * 3 + 2];
          n++;
        }
      }
    }
    lGeo.setDrawRange(0, n * 2);
    lGeo.attributes.position.needsUpdate = true;
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 16.667, 3);
    last = now;

    // ease mouse
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    if (!reduce) {
      stepParticles();
      buildLines();
      core.rotation.y += 0.0035 * dt;
      core.rotation.x += 0.0018 * dt;
      inner.rotation.y -= 0.007 * dt;
      inner.rotation.z += 0.004 * dt;
    }

    // parallax + scroll
    group.rotation.y = mouse.x * 0.12 + scrollY * 0.00025;
    group.rotation.x = mouse.y * 0.08;
    camera.position.x = mouse.x * 0.6;
    camera.position.y = -mouse.y * 0.4 - scrollY * 0.0016;
    camera.lookAt(0, camera.position.y * 0.5, 0);

    // fade the core as the hero scrolls away
    var fade = Math.max(0, 1 - scrollY / (window.innerHeight * 0.85));
    outer.material.opacity = 0.5 * fade;
    inner.material.opacity = 0.65 * fade;
    core.visible = fade > 0.01;
    core.position.y = (camera.aspect > 1.15 ? 0.2 : 2.2) + scrollY * 0.004;

    renderer.render(scene, camera);
  }

  function loop(now) {
    if (!document.hidden) frame(now);
    requestAnimationFrame(loop);
  }

  if (reduce) {
    stepParticles(); buildLines(); frame(performance.now());
    window.addEventListener('scroll', function () { frame(performance.now()); }, { passive: true });
    window.addEventListener('resize', function () { frame(performance.now()); });
  } else {
    requestAnimationFrame(loop);
  }
})();
