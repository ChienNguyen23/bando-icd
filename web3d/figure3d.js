// Hình giải phẫu 3D: mô hình Z-Anatomy (CC BY-SA 4.0, nền BodyParts3D © DBCLS), dựng bằng _3d/zprocess.mjs.
// 3 lớp: "noitang" (da trong suốt, xương, cơ quan) · "co" (cơ, xương) · "da" (da thật, tóc, móng; bấm vùng da).
// Tên lưới: <lớp>_<vùng|x>__<phần>; lớp s=da, b=xương, o=cơ quan, m=cơ; vùng x = không bấm được.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// màu giải phẫu (sRGB) theo "<lớp>_<vùng>__<phần>", lùi dần về "<lớp>_<vùng>", "<lớp>__<phần>", "<lớp>"
const TONE = {
  b: 0xE6DCC6, b__sun: 0xD5E2E4, b__rang: 0xF2EDE2,
  m: 0x9E3A33, m_x: 0x983730,
  s__toc: 0x2A221E, s__mong: 0xE7C3B9,
  o_nao: 0xE2B4AB, o_nao__tn: 0xD69C94, o_nao__tt: 0xE4C2B4,
  o_mat: 0xF3F0EA, o_mat__mong: 0x6A4A2F, o_mat__giac: 0xFFFFFF, o_mat__thuy: 0xEFE9D8,
  o_tmh: 0xC9736C, o_tmh__tuyen: 0xE0B48A, o_giap: 0xA9483E,
  o_phoi: 0xE59C98, o_phoi__kq: 0xE6D8CC, o_tim: 0xA42A33, o_tim__dm: 0xC2302C, o_tim__tm: 0x3D5FA6,
  o_mach__dm: 0xC2302C, o_mach__tm: 0x3D5FA6,
  o_daday: 0xD4877A, o_daday__tq: 0xC97B70, o_gan: 0x7A2A22, o_gan__tm: 0x6E8C38, o_tuy: 0xE5BE78, o_mau: 0x6B2B42,
  o_tietnieu: 0x8F3A30, o_tietnieu__bq: 0xDDB36B, o_tietnieu__tt: 0xE1AE4A, o_ruot: 0xE7AE95, o_ruot__dt: 0xC98A6A,
  o_sinhduc: 0xC98C7E,
};
const tone = (L, rid, part) => TONE[`${L}_${rid}__${part}`] ?? TONE[`${L}_${rid}`] ?? TONE[`${L}__${part}`] ?? TONE[L] ?? 0xcccccc;
const HIDE_IN_ORGANS = new Set(["so", "suon", "sun", "rang"]); // xương che cơ quan (sọ, sườn): ẩn ở lớp nội tạng
const PINS_BY_MODE = {
  noitang: ["mat", "tmh", "giap", "vu", "sinhduc", "da", "mach", "vai", "tay", "goi", "chan", "cotsong"],
  co: ["tmh", "giap", "vu", "sinhduc", "da", "mach"],
  da: [],
};
const WHITE = new THREE.Color(1, 1, 1);

export async function mount({ host, url, muscleUrl, pins, onPick, onHover, accent }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "c3d";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Mô hình giải phẫu 3D, kéo ngang để xoay, chạm để chọn");

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const cam = new THREE.PerspectiveCamera(18, 1, 0.1, 50);
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-2, 3, 4); cam.add(key);
  const fill = new THREE.DirectionalLight(0xe2ecf7, 0.8); fill.position.set(3, 0.5, 2); cam.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 1.3); back.position.set(0, 2, -4); cam.add(back);
  scene.add(cam);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const turn = new THREE.Group(); scene.add(turn);
  const body = gltf.scene; turn.add(body);
  const accentC = new THREE.Color(accent);
  const parts = []; // {mesh, L, rid, part, pick, active}
  const glass = glassMaterial();
  const skinReal = new THREE.MeshPhysicalMaterial({ color: 0xD6A388, roughness: 0.52, sheen: 0.6, sheenRoughness: 0.55, sheenColor: 0xffd2bd, clearcoat: 0.06 });

  function adopt(root) {
    const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
    for (const o of meshes) {
      const m = /^(s|b|o|m)_([a-z]+)(?:__([a-z]+))?$/.exec(o.name); if (!m) continue;
      const [, L, rid, part = ""] = m;
      if (!(L === "s" && !part)) o.geometry.computeVertexNormals(); // da: pháp tuyến chung đã tính sẵn
      const p = { mesh: o, L, rid, part, pick: rid !== "x" };
      if (L === "s" && !part) { p.glass = glass; p.real = skinReal.clone(); o.material = glass; o.renderOrder = 10; }
      else {
        const bone = L === "b", hair = part === "toc";
        o.material = new THREE.MeshPhysicalMaterial({
          color: tone(L, rid, part), roughness: hair ? 0.85 : bone ? 0.62 : L === "m" ? 0.5 : 0.42,
          clearcoat: bone || hair ? 0 : L === "m" ? 0.2 : 0.35, clearcoatRoughness: 0.35, sheen: hair ? 0 : 0.25, sheenColor: 0xffffff,
        });
        if (part === "giac" || part === "thuy") { Object.assign(o.material, { transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, depthWrite: false }); p.pick = false; }
      }
      if (p.pick) { p.rim = { value: 0 }; addRim(p.real || o.material, p.rim, accentC); }
      o.userData.p = p; parts.push(p);
    }
  }
  adopt(body);

  // khung nhìn: toàn thân / thân mình (đơn vị mét)
  const box = new THREE.Box3(); parts.filter(p => p.L === "s").forEach(p => box.expandByObject(p.mesh));
  const ctr = box.getCenter(new THREE.Vector3()), bodyH = box.max.y - box.min.y;
  body.position.sub(ctr);
  const VIEWS = { full: { y: -bodyH * 0.01, h: bodyH * 1.08 }, torso: { y: 1.16 - ctr.y, h: 0.82 }, head: { y: 1.58 - ctr.y, h: 0.3 }, belly: { y: 1.08 - ctr.y, h: 0.36 } };
  let view = VIEWS.full, camY = view.y, camH = view.h, dirty = true;
  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(0, camY, Math.max(camH / 2 / t, camH * 0.6 / 2 / (t * cam.aspect)));
    cam.lookAt(0, camY, 0); cam.updateProjectionMatrix(); dirty = true;
  };

  // chấm: nút neo "pin_<id>" có sẵn trong mô hình (điểm trên da + pháp tuyến)
  body.updateMatrixWorld(true);
  const anchors = [];
  for (const p of pins) {
    const nd = body.getObjectByName("pin_" + p.id); if (!nd) { p.el.hidden = true; continue; }
    const n = new THREE.Vector3(...(nd.userData.n || [0, 0, 1]));
    anchors.push({ id: p.id, el: p.el, pos: nd.getWorldPosition(new THREE.Vector3()).addScaledVector(n, 0.006), n, on: true });
  }

  // lớp hiển thị
  let mode = "noitang", muscleP = null;
  function applyMode() {
    for (const p of parts) {
      const { L, part, mesh } = p;
      let vis;
      if (mode === "noitang") vis = (L === "s" && !part) || L === "o" || (L === "b" && !HIDE_IN_ORGANS.has(part));
      else if (mode === "co") vis = L === "m" || L === "b" || (L === "o" && (p.rid === "mat" || p.rid === "sinhduc"));
      else vis = L === "s" || (L === "o" && p.rid === "mat");
      mesh.visible = vis;
      if (L === "s" && !part) mesh.material = mode === "da" ? p.real : p.glass;
      p.active = vis && p.pick && (L !== "s" || mode === "da");
    }
    const show = new Set(PINS_BY_MODE[mode]);
    for (const a of anchors) a.on = show.has(a.id);
    paint();
  }

  // xoay: kéo ngang (giữ cuộn dọc trên điện thoại); chuột kéo dọc để nghiêng nhẹ
  let az = 0, tilt = 0, vAz = 0, dragging = false, moved = 0, lx = 0, ly = 0, hoverId = null, selId = null, focusOn = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  canvas.addEventListener("pointerdown", e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; vAz = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => {
    if (dragging) {
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      az += dx * 0.012; vAz = dx * 0.012;
      if (e.pointerType === "mouse") tilt = THREE.MathUtils.clamp(tilt + dy * 0.004, -0.25, 0.35);
      dirty = true;
    } else if (e.pointerType === "mouse") {
      const id = pick(e); if (id !== hoverId) { hoverId = id; paint(); }
      onHover(id, e.clientX, e.clientY);
    }
  });
  canvas.addEventListener("pointerup", e => { if (!dragging) return; dragging = false; if (moved < 7) { const id = pick(e); if (id) onPick(id); vAz = 0; } });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointerleave", () => { if (hoverId) { hoverId = null; paint(); } onHover(null); });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const b = canvas.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    // phần đục không bấm được (cơ thành bụng, xương sọ…) vẫn che phần phía sau; da kính và giác mạc thì không
    const h = ray.intersectObjects(parts.filter(p => p.active || (p.mesh.visible && !p.mesh.material.transparent && p.L !== "s")).map(p => p.mesh), false)[0];
    return h && h.object.userData.p.active ? h.object.userData.p.rid : null;
  }
  // chọn: sáng lên + quầng màu nhấn ở rìa (theo góc nhìn); ở lớp nội tạng, phần khác mờ đi để thấy cả cơ quan nằm sâu
  function paint() {
    const focus = focusOn && mode === "noitang" && parts.some(p => p.active && p.rid === selId);
    for (const p of parts) {
      if (!p.pick) continue;
      const mt = p.mesh.material, on = p.active && p.rid === selId, hot = p.active && p.rid === hoverId && !on;
      if (p.L === "s" && mode !== "da") { p.rim.value = 0; continue; }
      const dim = focus && p.active && !on && !hot;
      mt.emissive.copy(WHITE); mt.emissiveIntensity = on ? 0.1 : hot ? 0.06 : 0;
      p.rim.value = on ? 1 : hot ? 0.55 : 0;
      if (p.L !== "s") {
        if (mt.transparent !== dim) { mt.transparent = dim; mt.depthWrite = !dim; mt.needsUpdate = true; }
        mt.opacity = dim ? 0.18 : 1;
      }
    }
    dirty = true;
  }

  const v = new THREE.Vector3(), camDir = new THREE.Vector3(), nW = new THREE.Vector3();
  function placePins() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const a of anchors) {
      a.el.hidden = !a.on; if (!a.on) continue;
      v.copy(a.pos).applyMatrix4(turn.matrixWorld);
      nW.copy(a.n).applyQuaternion(turn.quaternion);
      const facing = nW.dot(camDir.copy(cam.position).sub(v).normalize());
      v.project(cam);
      a.el.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%)`;
      const show = facing > 0.1;
      a.el.style.opacity = show ? Math.min(1, (facing - 0.1) * 6) : 0;
      a.el.style.pointerEvents = show ? "auto" : "none";
      a.el.tabIndex = show ? 0 : -1;
    }
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!dragging && Math.abs(vAz) > 1e-4 && !reduce) { az += vAz; vAz *= 0.92; dirty = true; }
    if (Math.abs(camY - view.y) > 1e-4 || Math.abs(camH - view.h) > 1e-4) { const k = reduce ? 1 : 0.14; camY += (view.y - camY) * k; camH += (view.h - camH) * k; fit(); }
    if (!dirty) return; dirty = false;
    turn.rotation.set(tilt, az, 0); turn.updateMatrixWorld(true);
    renderer.render(scene, cam); placePins();
  }
  new ResizeObserver(fit).observe(host);
  host.prepend(canvas);
  applyMode(); fit(); requestAnimationFrame(frame);

  return {
    select(id, focus = true) { selId = id; focusOn = focus; paint(); },
    setAccent(c) { accentC.set(c); paint(); },
    setView(name) { view = VIEWS[name] || VIEWS.full; },
    rotate(d) { vAz = 0; az += d; dirty = true; },
    async setMode(m) {
      if (m === "co" && !muscleP) muscleP = loader.loadAsync(muscleUrl).then(g => { const r = g.scene; r.position.copy(body.position); turn.add(r); adopt(r); });
      if (m === "co") await muscleP;
      mode = m; applyMode();
    },
  };
}

// da "kính": trong ở giữa, rõ ở viền (Fresnel) để nhìn xuyên vào trong
function glassMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xBFD6EC, roughness: 0.28, transparent: true, depthWrite: false, clearcoat: 0.6 });
  m.onBeforeCompile = s => {
    s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.2);
      diffuseColor.a = mix(0.06, 0.6, fr);`);
  };
  return m;
}
// quầng màu nhấn ở rìa phần đang chọn/rê chuột (Fresnel): không cần lưới kín, không lộ qua chỗ hở
function addRim(m, k, c) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (s, r) => {
    prev && prev.call(m, s, r);
    s.uniforms.rimK = k; s.uniforms.rimC = { value: c };
    s.fragmentShader = "uniform float rimK;\nuniform vec3 rimC;\n" + s.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      totalEmissiveRadiance += rimC * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0) * rimK * 1.8;`);
  };
  m.customProgramCacheKey = () => "rim" + (prev ? "+" + prev.toString().length : "");
}
