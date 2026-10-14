// ===TS2_BEGIN===  (trang Tầm soát theo người khám, kế hoạch người thân, phần tầm soát của Khám tổng quát, 14/10/2026. Bản web: build.py cắt
// ===TS_ENGINE_BEGIN===  (máy tầm soát theo người khám + kế hoạch người thân, 14/10/2026. kiem_tamsoat_cathe.mjs cắt đoạn này để chạy riêng)
const TSB = {
  ut_dtt: ["C18.9", "ut_dtt"], u_tuyen: ["D12.6", "ut_dtt", 1], ut_vu: ["C50.9", "ut_vu"], ut_bt: ["C56", "ut_buongtrung"], ut_dd: ["C16.9", "ut_daday"],
  ut_ttl: ["C61", "ut_ttl"], ut_gan: ["C22.0", "ut_gan"], ut_phoi: ["C34.9", "ut_phoi"], ut_khac: [null, "ut_khac"], tim: ["I21.9"], dtd: ["E11.9"],
  than: ["N18.5"], pdmc: ["I71.4"], thal: ["D56.9"], xo_gan: ["K74.6"], brca1: [null, null, 0, "BRCA1"], brca2: [null, null, 0, "BRCA2"], fh: ["E78.0"], hbv: ["B18.1"],
  hiv: ["B20"], hcv: ["B18.2"], lao: ["A15.0"], giang_mai: ["A51.9"], lau: ["A54.9"], chla: ["A56.0"], trung_roi: ["A59.0"], ghe: ["B86"], hemo: ["D66"] };
const TS_TSGD = new Set(["tsgd_ut_dtt", "tsgd_u_tuyen_tt", "tsgd_ut_vu", "tsgd_ut_buongtrung", "tsgd_ut_daday", "tsgd_ut_ttl", "tsgd_ut_gan"]);
const TSQ = { bo: ["con", 1, "nam"], me: ["con", 1, "nu"], anh_em_trai: ["anh_chi_em", 1, "nam"], chi_em_gai: ["anh_chi_em", 1, "nu"], con_trai: ["cha_me", 1, "nam"],
  con_gai: ["cha_me", 1, "nu"], bac1: ["anh_chi_em", 1, null], bac2: ["chau", 2, null], vo_chong: ["vo_chong", null, null], cung_nha: ["song_cung_nha", null, null] };
const TSN_NHOM = { vo_chong: "Vợ hoặc chồng", con: "Con", ace: "Anh chị em ruột", cha_me: "Cha mẹ", cung_nha: "Người sống cùng nhà" };
const TSN_VAI = {
  ban_than: { vo_chong: ["vo_chong", null], con: ["con", 1], ace: ["anh_chi_em", 1], cha_me: ["cha_me", 1], cung_nha: ["song_cung_nha", null] },
  bo: { cha_me: ["vo_chong", null, "người còn lại"], ace: ["con", 1], con: ["chau", 2] }, me: { cha_me: ["vo_chong", null, "người còn lại"], ace: ["con", 1], con: ["chau", 2] },
  anh_em_trai: { cha_me: ["cha_me", 1], ace: ["anh_chi_em", 1, "anh chị em khác"], con: ["chau", 2] }, chi_em_gai: { cha_me: ["cha_me", 1], ace: ["anh_chi_em", 1, "anh chị em khác"], con: ["chau", 2] },
  con_trai: { cha_me: ["ong_ba", 2], ace: ["co_di_chu_bac", 2], con: ["anh_chi_em", 1, "các con khác"], vo_chong: ["cha_me", 1, "nếu là cha hoặc mẹ ruột của người con này"] },
  con_gai: { cha_me: ["ong_ba", 2], ace: ["co_di_chu_bac", 2], con: ["anh_chi_em", 1, "các con khác"], vo_chong: ["cha_me", 1, "nếu là cha hoặc mẹ ruột của người con này"] },
  vo_chong: { con: ["con", 1, "nếu là con chung"], cung_nha: ["song_cung_nha", null] }, cung_nha: { cung_nha: ["song_cung_nha", null] }, bac1: {}, bac2: {} };
const tsThang = (a, b) => (b.y - a.y) * 12 + (b.m - a.m);
const tsCong = (a, n) => { const k = a.y * 12 + (a.m - 1) + Math.ceil(n - 1e-9); return { y: Math.floor(k / 12), m: (k % 12) + 1 }; };
const tsYm = s => { const m = /^(\d{4})-(\d{1,2})/.exec(s || ""); return m ? { y: +m[1], m: +m[2] } : null; };
const tsNeg = m => (m.to_chuc === "USPSTF" && (m.muc_do === "D" || m.muc_do === "I")) || /không nên/.test(m.muc_do || "");
const tsKhongNen = m => (m.to_chuc === "USPSTF" && m.muc_do === "D") || /không nên/.test(m.muc_do || "");
function gdIcd(r, b) {
  if (b.gen) return r.id.startsWith("gd_dot_bien_brca");
  const c = b.icd || ""; return !!c && (r.benh.icd || []).some(x => c === x || c.startsWith(x + ".") || (x.length === 3 && c.slice(0, 3) === x));
}
function gdDk(r, b) {
  if (r.id === "gd_vgb_me_con" || r.id === "gd_hiv_me_con") return !!b.mang_thai;
  if (r.id === "gd_vgc_me_con") return b.gioi === "nu";
  if (r.id === "gd_hemophilia") return b.gioi === "nam";
  if (r.id === "gd_thalassemia_vo") return b.gioi !== "nu"; if (r.id === "gd_thalassemia_chong") return b.gioi !== "nam";
  const lt = r.ts?.tuoi_nguoi_benh_luc_mac_lt;
  if (lt && typeof lt === "object") return b.tuoi != null && !!b.gioi && b.tuoi < lt[b.gioi];
  return true;
}
function gdAp(GD, b, qh, bac, ng) {
  const o = { co: [], viec: [], dk: [] };
  for (const r of GD.quy_tac) {
    const nt = r.nt; if (!gdIcd(r, b) || !gdDk(r, b) || !nt.quan_he.includes(qh) || (nt.bac && !nt.bac.includes(bac))) continue;
    if (nt.gioi !== "ca_hai" && ng.gioi && ng.gioi !== nt.gioi) continue;
    if (ng.tuoi != null && ((nt.tuoi_tu != null && ng.tuoi < nt.tuoi_tu) || (nt.tuoi_den != null && ng.tuoi > nt.tuoi_den))) continue;
    const ts = r.ts || {}, can = ts.chi_ap_khi_nguoi_than_co, cam = ts.chi_ap_khi_khong_co; let dk = null;
    if (can) { if (ng.co) { if (!can.some(f => ng.co.has(f))) continue; } else dk = can; }
    if (cam && ng.co && cam.some(f => ng.co.has(f))) continue;
    if (!dk) for (const f of r.co) if (!o.co.includes(f)) o.co.push(f);
    if (ng.duong_tinh) for (const [k, v] of Object.entries(ts)) if (k.startsWith("neu_") && k.endsWith("_gan_them") && (k !== "neu_dot_bien_brca2_gan_them" || b.gen === "BRCA2")) v.forEach(f => o.dk.includes(f) || o.dk.push(f));
    const ng0 = { ...ng, gioi: nt.gioi !== "ca_hai" ? nt.gioi : ng.gioi };
    for (const v of r.viec) {
      if (v.ap_cho_quan_he && !v.ap_cho_quan_he.includes(qh)) continue; if (v.ap_cho_bac && !v.ap_cho_bac.includes(bac)) continue;
      const t = ng.tuoi; if (t != null && v.tuoi_den != null && t > v.tuoi_den) continue;
      if (t != null && v.tuoi_tu_thang != null && v.tuoi_tu == null && t * 12 < v.tuoi_tu_thang) continue;
      const khi = t === 0 && v.tuoi_tu_thang > 0 ? `từ ${v.tuoi_tu_thang} tháng tuổi` + (v.tuoi_den_thang ? ` đến ${v.tuoi_den_thang} tháng` : "")
        : t != null && v.tuoi_tu != null && t < v.tuoi_tu ? `từ ${v.tuoi_tu} tuổi, còn ${v.tuoi_tu - t} năm` : v.thoi_diem ? v.thoi_diem
        : v.tuoi_tu_thang ? `từ ${v.tuoi_tu_thang} tháng tuổi` : t == null && v.tuoi_tu > 1 ? `từ ${v.tuoi_tu} tuổi` : "ngay";
      o.viec.push({ qt: r.id, muc: v.muc || r.muc, viec: v.viec, khi, dk: v.dieu_kien || (dk ? "nếu người thân " + dk.map(f => (GD.co[f]?.nghia || f).toLowerCase()).join(", ") : null), gioi: ng0.gioi, can_cu: r.nguon.filter(x => v.trich_id.includes(x.id)) });
    }
  }
  return o;
}
function tsTsgd(m, rec) {
  const T = m.tsgd, lo = [].concat(T.loai), uOk = T.tinh_ca_u_tuyen_tien_trien !== false;
  const k = rec.filter(r => (lo.includes(r.loai) || (lo.includes("ut_tieuhoa_khac") && r.loai === "ut_dtt" && !r.u)) && (T.bac == null || r.bac === T.bac) && (uOk || !r.u) && r.bac);
  if (!k.length) return null;
  const n = k.length, hai = T.hoac_2_nguoi_moi_tuoi && n >= 2;
  if (!hai && ((T.so_nguoi_toi_thieu || 1) > n || (T.so_nguoi_toi_da != null && n > T.so_nguoi_toi_da))) return null;
  let dung = k;
  if (!hai && T.tuoi_luc_mac_duoi) { dung = k.filter(r => r.tuoi != null && r.tuoi < T.tuoi_luc_mac_duoi); if (!dung.length) return null; }
  if (T.tuoi_luc_mac_tu) { dung = k.filter(r => r.tuoi != null && r.tuoi >= T.tuoi_luc_mac_tu); if (!dung.length) return null; }
  const tb = m.tuoi_bat_dau_nguy_co_tang; if (!tb) return { ok: true };
  const t = dung.filter(r => r.tuoi != null).map(r => r.tuoi);
  if (tb.lay !== "som_hon") return { ok: true, bd: tb.co_dinh };
  return { ok: true, bd: t.length ? Math.min(tb.co_dinh, Math.min(...t) - tb.tru_tuoi_nguoi_than) : tb.co_dinh, thieu_tuoi: t.length < dung.length };
}
function tsHoSo(GD, P) {
  const co = new Set(P.co || []), h = P.hut || {}, rec = [], viec = [], ghi = [];
  if (h.tt === "dang" || h.tt === "bo") co.add("hut_thuoc");
  if (P.thai) co.add("thai");
  for (const e of P.gd || []) {
    const B = TSB[e.benh], q = TSQ[e.qh]; if (!B || !q) continue;
    if (B[1] && q[1]) rec.push({ loai: B[1], u: !!B[2], bac: q[1], tuoi: e.tuoi ?? null, qh: e.qh, benh: e.benh });
    const b = { icd: B[0], gen: B[3], tuoi: e.tuoi ?? null, gioi: q[2] }, a = gdAp(GD, b, q[0], q[1], { gioi: P.gioi, tuoi: P.tuoi, co });
    a.co.forEach(f => co.add(f)); a.viec.forEach(v => viec.push({ ...v, tu: e }));
  }
  if (co.has("brca2")) co.add("brca");
  return { ...P, co, rec, viec_gd: viec, ghi, hut: h };
}
function tsDong(c, m, H, lan) {
  const P = H, co = H.co, h = H.hut;
  if (P.thai) { if (!m.thai_ky) return null; } else if (m.thai_ky) return null;
  if (m.gioi !== "ca_hai" && P.gioi && m.gioi !== P.gioi) return null;
  if ((m.loai_tru_neu_co || []).some(f => co.has(f))) return null;
  const bb = m.nguy_co_bat_buoc || [], hoi = [];
  const hq = H.hq || {};
  for (const f of bb) { if (f in hq) { if (P.hoi?.[f] === false) return null; if (P.hoi?.[f] !== true) hoi.push(f); } else if (!co.has(f)) return null; }
  const OR = (m.nguy_co || []).filter(f => !bb.includes(f)); let tg = null, qk = false;
  if (m.tsgd) { tg = tsTsgd(m, H.rec); const kh = OR.filter(f => !TS_TSGD.has(f) && co.has(f)); if (!tg && !kh.length) return null; if (!tg) qk = kh.every(f => f === "khac"); }
  else if (OR.length) { const kh = OR.filter(f => co.has(f)); if (!kh.length) return null; qk = kh.every(f => f === "khac"); }
  const R = { c, m, hoi, qua_khac: qk };
  if (m.goi_nam_tu != null) {
    if (h.tt !== "dang" && h.tt !== "bo") return null;
    if (h.goi_nam == null) return { ...R, tt: "THIEU", thieu: "goi_nam" };
    if (h.goi_nam < m.goi_nam_tu) return null;
    if (m.bo_thuoc_duoi != null && h.tt === "bo") { if (h.bo_nam == null) return { ...R, tt: "THIEU", thieu: "bo_nam" }; if (h.bo_nam >= m.bo_thuoc_duoi) return m.ngung_khi_bo != null ? { ...R, tt: "NGUNG", bo_nam: h.bo_nam } : null; }
  }
  const t = P.tuoi, bd = tg?.bd ?? m.tuoi_tu;
  if (m.tuoi_den != null && t != null && t > m.tuoi_den) return null;
  if (bd != null && t != null && t < bd) return tsKhongNen(m) ? null : { ...R, tt: "SAP_TOI", tuoi_bat_dau: bd, con_nam: bd - t, thieu_tuoi: tg?.thieu_tuoi };
  if (tg?.bd != null) R.tuoi_bat_dau = bd, R.thieu_tuoi = tg.thieu_tuoi;
  if (tsKhongNen(m)) return { ...R, tt: "KHONG", neg: true };
  if (P.thai) {
    const w = m.moc_tuan || [[m.tuan_thai_tu ?? 0, m.tuan_thai_den ?? 99]], u = P.tuan;
    if (u == null) return { ...R, tt: m.quyet_dinh_chung ? "BAN" : "DEN_HAN", w };
    const vao = w.find(([a, b]) => u >= a && u <= b + 6 / 7);
    if (vao) return { ...R, tt: m.quyet_dinh_chung ? "BAN" : "DEN_HAN", w, cua_so: vao };
    const sau = w.find(([a]) => a > u); if (sau) return { ...R, tt: "SAP_TOI", tuan_bat_dau: sau[0], w };
    return { ...R, tt: "DA_QUA_MOC", w };
  }
  const base = m.quyet_dinh_chung || hoi.some(f => hq[f] === "ban") ? "BAN" : null;
  const L = lan?.[c.id], d0 = tsYm(L?.ym);
  if (!d0) return { ...R, tt: base || "DEN_HAN", chua: true };
  if (L.bt === true) return { ...R, tt: base || "DEN_HAN", bat_thuong: true, lan: d0 };
  const ops = (m.chu_ky || []).filter(o => (o.tuoi_tu == null || t >= o.tuoi_tu) && (o.tuoi_den == null || t <= o.tuoi_den));
  const pp = L.pp, cho = ops.some(o => o.pp) ? (pp ? ops.filter(o => !o.pp || o.pp === pp) : ops) : ops;
  if (!cho.length) return { ...R, tt: base || "DA_LAM", lan: d0, khong_chu_ky: !(m.chu_ky || []).length };
  if (cho.every(o => o.mot_lan)) return { ...R, tt: base || "DA_LAM", lan: d0, mot_lan: true };
  const han = cho.filter(o => !o.mot_lan).map(o => { const [a, b] = o.thang ? [o.thang, o.thang] : o.khoang ? o.khoang : o.tuan.map(x => x * 7 / 30.4375); return { som: tsCong(d0, a), muon: tsCong(d0, b), o }; });
  const som = han.reduce((x, y) => tsThang(x.som, y.som) < 0 ? y : x), muon = han.reduce((x, y) => tsThang(x.muon, y.muon) < 0 ? y : x);
  const di = tsThang(H.nay, som.som), dm = tsThang(H.nay, som.muon);
  const r = { ...R, lan: d0, han_som: som.som, han_muon: som.muon, chua_chon_pp: !pp && ops.some(o => o.pp), nhieu_han: han.length > 1 };
  if (dm <= 0) return { ...r, tt: base || "DEN_HAN", qua_thang: -dm };
  if (di <= 0) return { ...r, tt: base || "DEN_HAN", trong_cua_so: true };
  return { ...r, tt: base || "SAP_TOI", con_thang: di };
}
function tsXet(TS, H) {
  H.hq = TS.hoi || {};
  const lan = H.lan || {}, am = new Set(), da = [];
  for (const [f, ids] of Object.entries(TS.da_mac || {})) if (H.co.has(f)) ids.forEach(x => { am.add(x); da.push([f, x]); });
  for (const b of H.ban_than || []) { const L = TSB[b.benh]?.[1]; if (L && L !== "ut_khac") { am.add(L); da.push(["ut:" + b.benh, L]); } }
  const out = [];
  for (const c of TS.chu_de) {
    if (am.has(c.id)) continue;
    let ds = c.muc.map(m => tsDong(c, m, H, lan)).filter(Boolean);
    if (!ds.length) continue;
    const kn = ds.some(r => r.tt === "KHONG" && r.neg && r.m.to_chuc === "USPSTF" && r.m.muc_do === "D");
    if (kn) ds = ds.map(r => r.tt === "DEN_HAN" || (r.tt === "SAP_TOI" && r.con_thang != null) ? { ...r, tt: "BAN", lech: true } : r);
    const th = ds.filter(r => !r.m.chi_kem); if (!th.length) continue;
    const nhom = th.some(r => r.tt === "DEN_HAN") ? 1 : th.some(r => r.tt === "SAP_TOI" && r.con_thang != null && r.con_thang <= 12) ? 2 : th.some(r => r.tt === "BAN") ? 3 : 4;
    const thu = { DEN_HAN: 0, SAP_TOI: 1, BAN: 2, DA_LAM: 3, THIEU: 4, NGUNG: 5, KHONG: 6, DA_QUA_MOC: 7 };
    const vn = r => r.m.vung === "VN" ? 0 : 1;
    ds.sort((a, b) => thu[a.tt] - thu[b.tt] || vn(a) - vn(b) || (a.con_thang ?? 99) - (b.con_thang ?? 99));
    out.push({ c, ds, nhom, chinh: ds.find(r => !r.m.chi_kem) });
  }
  const ghi = [];
  const LOAI_CD = { ut_dtt: "ut_dtt", ut_vu: "ut_vu", ut_buongtrung: "ut_vu", ut_daday: "ut_daday", ut_ttl: "ut_ttl", ut_gan: "ut_gan", ut_phoi: "ut_phoi", ut_khac: null };
  for (const r of H.rec) {
    const cd = LOAI_CD[r.loai], C = cd && TS.chu_de.find(x => x.id === cd), coTb = C?.muc.some(m => m.tuoi_bat_dau_nguy_co_tang);
    if (r.loai === "ut_khac" || (r.bac === 2 && !out.some(x => x.ds.some(y => y.m.tsgd && tsTsgd(y.m, [r])))) || (r.tuoi != null && !coTb && cd && r.loai !== "ut_phoi"))
      ghi.push({ r, chu: r.loai === "ut_khac" ? "nguồn trong web không có lịch tầm soát theo loại ung thư này" : r.bac === 2 ? "nguồn trong web không có lịch cho người thân bậc 2" : "nguồn không ghi bắt đầu sớm hơn theo tuổi người thân lúc mắc" });
  }
  return { cd: out, da_mac: da, ghi };
}
const GD_GOP = { ho_gd_hbv: "vgb", ban_tinh_hiv: "hiv", tsgd_pdmc: "pdmc" };
function gdNguoi(TS, GD, ng, voi) {
  const o = { co: new Set(ng.co || []), viec: [], dk: [], rec: [], dong: [] }, tuCo = {};
  for (const v of voi) {
    const a = gdAp(GD, v.b, v.qh, v.bac, { ...ng, co: ng.co ? new Set(ng.co) : null }); a.co.forEach(f => { o.co.add(f); tuCo[f] ??= v.nhan; }); a.dk.forEach(f => tuCo[f] ??= v.nhan); o.dk.push(...a.dk);
    a.viec.forEach(x => o.viec.push({ ...x, tu: v.nhan }));
    if (v.b.loai && v.bac && a.co.some(f => TS_TSGD.has(f))) o.rec.push({ loai: v.b.loai, u: !!v.b.u, bac: v.bac, tuoi: v.b.tuoi ?? null, tu: v.nhan });
  }
  const gop = new Set(Object.entries(GD_GOP).filter(([f]) => o.co.has(f)).map(([, x]) => x));
  for (const [f0, kd] of [[o.co, false], [new Set([...o.co, ...o.dk]), true]]) {
    if (kd && !o.dk.length) continue;
    const H = { tuoi: ng.tuoi ?? null, gioi: ng.gioi ?? null, co: f0, rec: kd ? [] : o.rec, hut: {}, hoi: {}, hq: TS.hoi || {}, nay: ng.nay || { y: 2026, m: 10 } };
    for (const c of TS.chu_de) for (const m of c.muc) {
      if (m.thai_ky || gop.has(c.id)) continue;
      const lien = (m.nguy_co || []).concat(m.nguy_co_bat_buoc || []).some(f => f0.has(f) && (kd ? o.dk.includes(f) : !(ng.co || []).includes(f))) || (m.tsgd && !kd && o.rec.length);
      if (!lien) continue;
      const r = tsDong(c, m, { ...H, gioi: H.gioi || m.gioi === "ca_hai" && H.gioi || (m.gioi !== "ca_hai" ? m.gioi : null) }, {});
      if (!r || r.tt === "KHONG") continue;
      if (m.tsgd && !kd && !tsTsgd(m, o.rec) && !(m.nguy_co || []).some(f => !TS_TSGD.has(f) && f0.has(f))) continue;
      if (o.dong.some(x => x.m === m)) continue;
      const bd = r.tuoi_bat_dau ?? m.tuoi_tu, f1 = (m.nguy_co || []).concat(m.nguy_co_bat_buoc || []).find(f => tuCo[f]);
      o.dong.push({ c, m, kd, tt: r.tt, tuoi_bat_dau: bd, tu: (m.tsgd && !kd && o.rec[0]?.tu) || tuCo[f1] || null, khi: ng.tuoi == null ? (bd != null ? `từ ${bd} tuổi` : "theo tuổi") : r.tt === "SAP_TOI" ? `từ ${bd} tuổi, còn ${bd - ng.tuoi} năm` : "ngay" });
    }
  }
  return o;
}
function gdBenhNhan(GD, b) {
  return GD.quy_tac.filter(r => gdIcd(r, b) && gdDk(r, b)).flatMap(r => r.viec_bn.map(v => ({ qt: r.id, muc: v.muc || r.muc, viec: v.viec, can_cu: r.nguon.filter(x => v.trich_id.includes(x.id)) })));
}
function gdKeHoach(TS, GD, H) {
  const nguon = [{ k: "ban_than", nhan: "người khám", ds: [...(H.ban_than || []).map(b => ({ benh: b.benh, tuoi: b.tuoi })), ...[...H.co].filter(f => TSB[f] && !f.startsWith("brca")).map(f => ({ benh: f }))] }];
  for (const e of H.gd || []) nguon.push({ k: e.qh, nhan: e, ds: [{ benh: e.benh, tuoi: e.tuoi }] });
  const nhom = [];
  for (const [g, ten] of Object.entries(TSN_NHOM)) {
    const voi = [], hoi = [];
    for (const s of nguon) for (const d of s.ds) {
      const B = TSB[d.benh]; if (!B) continue;
      const vai = TSN_VAI[s.k]?.[g]; if (!vai) { if (s.k === "bac2" || (s.k === "ban_than" ? false : g !== "vo_chong" && g !== "cung_nha")) hoi.push({ tu: s.nhan, benh: d.benh }); continue; }
      const gioiB = s.k === "ban_than" ? H.gioi : TSQ[s.k]?.[2];
      voi.push({ b: { icd: B[0], gen: B[3], loai: B[1], u: B[2], tuoi: d.tuoi ?? null, gioi: gioiB, mang_thai: s.k === "ban_than" && H.thai }, qh: vai[0], bac: vai[1], nhan: { tu: s.nhan, benh: d.benh, ghi: vai[2] || null } });
    }
    if (!voi.length && !hoi.length) continue;
    const gioi = g === "vo_chong" ? (H.gioi === "nam" ? "nu" : H.gioi === "nu" ? "nam" : null) : null;
    const ng = gdNguoi(TS, GD, { gioi, tuoi: null, co: null, nay: H.nay }, voi);
    let so = null; if (g === "con" && H.thai) so = gdNguoi(TS, GD, { gioi: null, tuoi: 0, co: null, nay: H.nay }, voi.filter(v => v.b.mang_thai));
    if (so) { so.viec = so.viec.filter(v => v.qt.endsWith("me_con")); ng.viec = ng.viec.filter(v => !v.qt.endsWith("me_con")); }
    nhom.push({ g, ten, ng, so, hoi });
  }
  return nhom;
}
// ===TS_ENGINE_END===
(() => { if (document.getElementById("tn-css")) return; const s = document.createElement("style"); s.id = "tn-css"; s.textContent = `
.tnwrap{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr);gap:20px;align-items:start}
.tnr{min-width:0;scroll-margin-top:72px}.tnf{display:grid;gap:12px;min-width:0}
.ktqrow .tnin2{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ktqrow .tnin2 input{width:92px}
.tnchips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px 12px}
.tngd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;padding:8px 16px;border-top:1px solid var(--line)}.tngd .tnx{justify-self:end;width:44px}
.tngd select,.tngd input,.tnlan input,.tnpk input{font:inherit;font-size:14px;width:100%;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);min-height:40px;min-width:0}
.tngd.b3{grid-template-columns:minmax(0,1fr) 84px 40px}.tngd .tnx{min-height:40px;border:1px solid var(--line);border-radius:8px;background:none;color:var(--muted);font-size:18px;cursor:pointer}
.tnadd{margin:8px 16px 12px}
.tnlan{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:6px 10px;align-items:center;padding:9px 16px;border-top:1px solid var(--line);font-size:13.5px}
.tnlan .seg{grid-column:1/-1}.tnlan b{font-weight:600}
.tnkl{border:1.5px solid var(--ink);border-radius:14px;background:var(--surface);padding:14px 16px 12px;margin:0 0 14px}
.tnkl h3{margin:0 0 8px;font-size:16.5px;letter-spacing:-.01em}
.tnkl .tnh{margin:12px 0 4px;font-size:12.5px;font-weight:700;color:var(--muted);text-transform:none}
.tnkl ol,.tnkl ul{margin:0;padding-left:20px}.tnkl li{margin:3px 0;line-height:1.45}
.tnmuc{margin:8px 0 0}.tncc.tnthem{display:block;margin:4px 0 0 18px;font-size:13px}.tnchung{margin:6px 0 0}.tnchung>summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--muted);padding:6px 0}.tnlan input[aria-invalid=true]{border-color:var(--sev-ccd-ink)}.tnmuc>b{display:block;font-size:13.5px;margin:0 0 2px}
.tncc{font:inherit;font-size:12px;font-weight:600;color:var(--accent);background:none;border:0;padding:0 2px;margin-left:4px;cursor:pointer;text-decoration:underline;text-underline-offset:2px;position:relative}.tncc::after{content:"";position:absolute;inset:-6px -4px}
.tnccd{margin:6px 0 8px;padding:8px 10px;border:1px solid var(--line);background:var(--bg);border-radius:6px;font-size:12.5px}.tnccd q{display:block;margin:2px 0}
.tnst{display:inline-block;font-size:12px;font-weight:700;border-radius:5px;padding:2px 7px;white-space:nowrap;margin-right:6px;vertical-align:1px;color:var(--muted);background:var(--bg)}
.tnst.qua{color:var(--sev-ccd-ink);background:var(--sev-ccd-bg)}.tnst.den{color:var(--sev-tranh-ink);background:var(--sev-tranh-bg)}.tnst.sap{color:var(--accent);background:var(--accent-soft)}.tnst.ban{color:var(--warn-ink);background:var(--warn-bg)}
.tnnhom{display:flex;align-items:baseline;gap:8px;margin:18px 0 8px}.tnnhom h3{margin:0;font-size:14.5px}.tnnhom span{color:var(--muted);font-size:12.5px}
.tnds{padding:8px 16px 4px}.tnds .tsln{font-size:13px}
.tnhoi{color:var(--warn-ink);font-weight:600}
.tngdp{border:1px solid var(--line);border-radius:14px;background:var(--surface);margin:18px 0 12px;overflow:hidden}
.tngdp>header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px;margin:0}.tngdp>header h3{margin:0;font-size:15.5px}
.tngdn{padding:10px 16px;border-top:1px solid var(--line)}.tngdn>b{display:block;font-size:14px;margin:0 0 4px}.tngdn .src{margin:2px 0}
.tngdn li{margin:4px 0;line-height:1.45}
.tnmode{margin:22px 0 0}.tnmode>summary{cursor:pointer;font-weight:700;font-size:14.5px;padding:12px 0}
.tnin{display:none}
.tnthai .tnnhom:first-child{margin-top:0}
@media (max-width:1100px){.tnwrap{grid-template-columns:minmax(0,1fr)}}
@media (min-width:1101px){.tnr{position:sticky;top:76px;max-height:calc(100vh - 92px);overflow:auto;overscroll-behavior:contain;padding-right:4px;scrollbar-width:thin}}
@media (max-width:600px){.tngd.b3{grid-template-columns:minmax(0,1fr) 80px 44px}.tnlan{grid-template-columns:minmax(0,1fr)}}
@media print{body.in-the .tnin.in-dich{display:block!important;font-size:10pt;line-height:1.28}
.tnin h2{font-size:13.5pt;margin:0 0 1pt}.tnin .tnpkh{font-size:11pt;font-weight:700;margin:0}.tnin h4{font-size:10.5pt;margin:7pt 0 2pt;break-after:avoid}.tnin p{margin:1.5pt 0}.tnin ol,.tnin ul{margin:0;padding-left:20pt}.tnin .tnkhn{font-weight:700;margin:4pt 0 0;break-after:avoid}.tnin li{margin:0;break-inside:avoid}
.tnin table{width:100%;border-collapse:collapse;font-size:9.5pt}.tnin td,.tnin th{border:.5pt solid #999!important;padding:2pt 4pt;text-align:left;vertical-align:top}
.tnin .tnky{display:flex;justify-content:space-between;margin-top:12pt;gap:24pt;break-inside:avoid}.tnin .tnky div{flex:1;text-align:center;padding-bottom:40pt}.tnin .tnid{display:flex;gap:6pt;align-items:flex-end;margin:3pt 0 2pt}.tnin .tnid i{flex:1;border-bottom:.6pt dotted #000;height:9pt}.tnin .tnid i.ng{flex:.55}.tnin .tnghi{font-style:italic;font-size:9pt}.tnin .tnchan{margin-top:4pt;font-size:8.5pt}}
`; document.head.appendChild(s); })();
const TSN = { v: {}, co: new Set(), gd: [], bt: [], lan: {}, mo: new Set(), pk: "" };
let TN_ID = 0;
function tnXoa() { TSN.v = {}; TSN.co.clear(); TSN.gd = []; TSN.bt = []; TSN.lan = {}; TSN.mo.clear(); TSN.in_rieng = false; }
const TN_BN = [["copd", "COPD (bệnh phổi tắc nghẽn mạn tính)"], ["hbv", "Viêm gan B mạn"], ["hcv", "Viêm gan C"], ["xo_gan", "Xơ gan"], ["hiv", "HIV"], ["dtd", "Đái tháo đường"], ["tha", "Tăng huyết áp"],
  ["tim_mach", "Bệnh tim mạch"], ["btm", "Bệnh thận mạn"], ["thua_can", "Thừa cân, béo phì"], ["hp", "H. pylori, viêm loét dạ dày mạn"]];
const TN_NC = [["qhtd", "Hành vi tình dục nguy cơ"], ["tiem_chich", "Tiêm chích ma tuý"], ["tiep_xuc_lao", "Tiếp xúc người bệnh lao"], ["khac", "Nhóm nguy cơ khác (ghi trong từng dòng)"]];
const TN_UT = [["ut_dtt", "Ung thư đại trực tràng"], ["u_tuyen", "U tuyến tiến triển đại trực tràng"], ["ut_vu", "Ung thư vú"], ["ut_bt", "Ung thư buồng trứng, vòi trứng, phúc mạc"], ["ut_dd", "Ung thư dạ dày"],
  ["ut_ttl", "Ung thư tuyến tiền liệt"], ["ut_gan", "Ung thư gan"], ["ut_phoi", "Ung thư phổi"], ["ut_khac", "Ung thư khác"]];
const TN_GDB = [...TN_UT, ["tim", "Bệnh tim mạch do xơ vữa (nhồi máu cơ tim, đột quỵ não, bệnh động mạch chi)"], ["dtd", "Đái tháo đường"], ["than", "Bệnh thận giai đoạn cuối, lọc máu, thận đa nang"],
  ["pdmc", "Phình động mạch chủ bụng"], ["thal", "Thalassemia hoặc mang gen"], ["fh", "Tăng cholesterol máu gia đình"], ["brca1", "Mang đột biến BRCA1 (đã xét nghiệm)"], ["brca2", "Mang đột biến BRCA2 (đã xét nghiệm)"],
  ["hbv", "Viêm gan B"], ["hiv", "HIV"], ["lao", "Lao phổi"]];
const TN_BT = [...TN_UT, ["tim", "Bệnh tim mạch do xơ vữa, cần tuổi lúc mắc"], ["thal", "Thalassemia hoặc mang gen"], ["fh", "Tăng cholesterol máu gia đình"], ["pdmc", "Phình động mạch chủ bụng"],
  ["than", "Bệnh thận giai đoạn cuối, lọc máu, thận đa nang"], ["lao", "Lao phổi"], ["giang_mai", "Giang mai"], ["lau", "Lậu"], ["chla", "Chlamydia"], ["trung_roi", "Trùng roi âm đạo"], ["ghe", "Ghẻ"], ["hemo", "Hemophilia"]];
const TN_QH = [["bo", "Bố"], ["me", "Mẹ"], ["anh_em_trai", "Anh, em trai ruột"], ["chi_em_gai", "Chị, em gái ruột"], ["con_trai", "Con trai"], ["con_gai", "Con gái"],
  ["bac2", "Họ hàng bậc 2 (ông bà, cô dì chú bác, cháu)"], ["vo_chong", "Vợ hoặc chồng"], ["cung_nha", "Người sống cùng nhà"]];
const TN_PP = { hpv: "HPV", te_bao: "Tế bào học hoặc VIA", fit: "Máu ẩn trong phân (FIT)", sigma: "Nội soi đại tràng sigma", noi_soi: "Nội soi đại tràng" };
const TN_MUC = { bat_buoc: "Bắt buộc", nen: "Nên làm", can_nhac: "Bàn với bác sĩ" };
const tnMucChu = v => v.muc === "nen" || v.viec.startsWith(TN_MUC[v.muc]) ? "" : TN_MUC[v.muc] + ": ";
const tnKhi = v => v.khi && v.khi !== "ngay" && !v.viec.includes(v.khi) ? ", " + v.khi : "";
const tnTen = (ds, k) => ds.find(x => x[0] === k)?.[1] || k;
const tnThuong = s => (s = String(s || ""), /^[A-ZĐ][A-ZĐ0-9-]|^[A-Z]\./.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const tnTenNgan = c => c.ten.split(/ \(|, /)[0];
const tnSo = x => { const s = String(x ?? "").replace(",", ".").trim(); return s === "" || Number.isNaN(+s) ? null : +s; };
const tnYm = s => { s = String(s || "").trim(); let m = /^(\d{4})-(\d{1,2})$/.exec(s); if (m) return `${m[1]}-${m[2].padStart(2, "0")}`; m = /^(\d{1,2})[/.-](\d{4})$/.exec(s); return m && +m[1] >= 1 && +m[1] <= 12 ? `${m[2]}-${m[1].padStart(2, "0")}` : null; };
const tnThang = ym => ym ? `${String(ym.m).padStart(2, "0")}/${ym.y}` : "";
const tnNay = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 }; };
function tnGoiNam(v) { const d = tnSo(v.dieu), n = tnSo(v.nam); return d != null && n != null && d >= 0 && n >= 0 ? Math.round(d / 20 * n * 10) / 10 : null; }
function tnHoSo(ngoai) {
  const v = TSN.v, o = ngoai || {}, gioi = o.gioi ?? v.gioi ?? null, tuoi = o.tuoi ?? tnSo(v.tuoi), nu = gioi === "nu";
  const co = new Set([...TSN.co, ...(o.co || [])]);
  if (nu && v.rh) co.add("rh_am"); if (nu && (o.man_kinh ?? v.man_kinh)) co.add("sau_man_kinh"); if (nu && v.du_dinh) co.add("du_dinh_thai"); if (v.muc === "phan_loai") co.add("kham_phan_loai");
  if (v.gen === "brca1" || v.gen === "brca2") co.add("brca"); if (v.gen === "brca2") co.add("brca2");
  const thai = nu && !!(o.thai ?? v.thai);
  let hut = { tt: v.hut || null, goi_nam: tnGoiNam(v), bo_nam: tnSo(v.bo) };
  if (o.hut === true && hut.tt !== "bo") hut.tt = "dang"; if (o.hut === false && hut.tt === "dang") hut.tt = "chua";
  const bt = TSN.bt.filter(b => b.benh).map(b => ({ benh: b.benh, tuoi: tnSo(b.tuoi) }));
  if (co.has("tim_mach") && tnSo(v.tim_tuoi) != null && !bt.some(b => b.benh === "tim")) bt.push({ benh: "tim", tuoi: tnSo(v.tim_tuoi) });
  if (v.gen === "brca1" || v.gen === "brca2") bt.push({ benh: v.gen, tuoi: null });
  return { tuoi: tuoi != null ? Math.floor(tuoi) : null, gioi, thai, tuan: thai ? tnSo(v.tuan) : null, co: [...co], hut, hoi: { quan_he_td: v.qhtd, hbv_dna_cao: co.has("hbv") ? v.dna : undefined },
    gd: TSN.gd.filter(e => e.qh && e.benh).map(e => ({ qh: e.qh, benh: e.benh, tuoi: tnSo(e.tuoi) })), ban_than: bt, lan: { ...TSN.lan, ...(o.lan || {}) }, nay: tnNay() };
}
function tnChay(ngoai) { const P = tnHoSo(ngoai), H = tsHoSo(D.giadinh, P); return { P, H, R: tsXet(TS, H), K: gdKeHoach(TS, D.giadinh, H) }; }
function tnChu(r) {
  switch (r.tt) {
    case "DEN_HAN": return r.bat_thuong ? ["qua", "Lần trước bất thường"] : r.qua_thang != null ? [r.qua_thang ? "qua" : "den", r.qua_thang ? `Quá hạn ${r.qua_thang} tháng` : "Đến hạn tháng này"] : r.trong_cua_so ? ["den", `Đến hạn, chậm nhất ${tnThang(r.han_muon)}`] : r.cua_so ? ["den", "Đến hạn"] : ["den", r.chua ? "Chưa làm hoặc chưa nhập" : "Đến hạn"];
    case "SAP_TOI": return r.con_thang != null ? ["sap", `Đến hạn ${tnThang(r.han_som)}`] : r.tuan_bat_dau != null ? ["sap", `Từ tuần ${r.tuan_bat_dau}`] : ["", `Từ ${r.tuoi_bat_dau} tuổi, còn ${r.con_nam} năm`];
    case "BAN": return ["ban", r.lech ? "Nguồn lệch nhau, bàn với người bệnh" : r.hoi?.some(f => (TS.hoi || {})[f] === "ban") ? "Chưa đủ dữ kiện, bàn với người bệnh" : "Bàn với người bệnh"];
    case "KHONG": return ["", "Không nên làm thường quy"];
    case "NGUNG": return ["", `Ngừng: đã bỏ thuốc ${r.bo_nam} năm`];
    case "THIEU": return ["", r.thieu === "goi_nam" ? "Cần số gói-năm để xét" : "Cần số năm đã bỏ thuốc để xét"];
    case "DA_LAM": return ["", r.mot_lan ? `Đã làm ${tnThang(r.lan)}, nguồn ghi làm 1 lần` : `Đã làm ${tnThang(r.lan)}, khoảng cách lần sau: bác sĩ quyết định`];
    case "DA_QUA_MOC": return ["", "Đã qua mốc tuần thai"];
  }
  return ["", r.tt];
}
const tnSt = r => { const [k, t] = tnChu(r); return el("span", "tnst " + k, t); };
const tnDk = r => [...(r.hoi || []).map(f => f === "quan_he_td" ? "nếu đã quan hệ tình dục" : "cần " + tnThuong(TS.tu_vung?.[f] || f)), r.qua_khac ? "nếu thuộc nhóm ghi ở đối tượng" : null, r.thieu_tuoi ? "chưa nhập tuổi người thân lúc mắc, mốc có thể sớm hơn" : null, r.chua_chon_pp ? "chưa chọn loại xét nghiệm, tính theo chu kỳ ngắn nhất" : null, r.m.chi_kem ? "tham khảo, nguồn không nêu tuổi hoặc đối tượng cụ thể" : null].filter(Boolean);
const tnCau = x => String(x || "").replace(/\s*;\s*(\S)/g, (_, c) => ". " + c.toUpperCase()).replace(/\.$/, "");
const tnNhu = m => { const k = /^Như nhóm (\d+)/.exec(m.cach || ""); if (!k) return null; const n = +k[1];
  return TS.chu_de.find(x => x.muc.includes(m))?.muc.find(x => x !== m && x.to_chuc === m.to_chuc && x.cach && !/^Như /.test(x.cach) && (x.tuoi_tu ?? 0) <= n && n <= (x.tuoi_den ?? 200)) || null; };
const tnViecDong = (r, ngan) => { const g = tnNhu(r.m), mm = g || r.m, c = tnCau(mm.cach || mm.doi_tuong), t = tnCau(mm.tan_suat), them = g ? ` (${tnThuong(r.m.cach)})` : "";
  if (ngan) { const k = c.search(/[^A-Z]\.\s[A-ZĐÂÊÔƠƯ]/), s = k > 20 ? c.slice(0, k + 1) : c; return ((s.match(/['"“”]/g) || []).length % 2 ? c : s) + them; } return c + (t && r.tt !== "KHONG" && t !== c ? `. ${t}` : "") + them; };
const tnLyDo = (r, H) => { const m = r.m; if (m.tsgd && tsTsgd(m, H.rec)) return "có tiền sử gia đình"; const f = [...(m.nguy_co_bat_buoc || []), ...(m.nguy_co || [])].filter(x => H.co.has(x) && x !== "khac" && !TS_TSGD.has(x));
  return f.length ? "có " + [...new Set(f)].map(x => tnThuong((TS.tu_vung?.[x] || x).split(" (")[0])).join(", ") : r.qua_khac ? "thuộc nhóm nguy cơ khác" : null; };
function tnCc(li, nguon, gd) {
  if (!nguon?.length) return; const b = el("button", "tncc", "Căn cứ"); b.type = "button"; b.setAttribute("aria-expanded", "false"); let box = null;
  b.addEventListener("click", () => { if (box) { box.remove(); box = null; b.setAttribute("aria-expanded", "false"); return; } box = el("div", "tnccd");
    if (gd) for (const x of nguon) { const p = el("p"); p.appendChild(el("b", "", [x.to_chuc, x.van_ban].filter(Boolean).join(": "))); if (x.vi_tri) p.append(" ", el("span", "vt", x.vi_tri)); p.appendChild(el("q", "", x.trich)); if (x.url) { const a = aEl("Mở văn bản ↗", x.url + (x.trang && !x.url.includes("#") ? "#page=" + x.trang : "")); a.className = "open"; p.appendChild(a); } box.appendChild(p); }
    else box.appendChild(srcList(nguon));
    li.appendChild(box); b.setAttribute("aria-expanded", "true"); });
  li.appendChild(b);
}
const TN_TG = [[/ngay|khẩn|cấp cứu|tức thì/i, 0], [/trong (vòng )?\d+\s*tuần|trong 2 tuần|1 đến 3 tháng|sau 1 đến 3 tháng|trong vòng 4 tuần/i, 1], [/trong (vòng )?1 năm|mỗi 1 đến 3 năm|mỗi \d+ năm|hằng năm|lặp lại sau/i, 2]];
const tnMoc = s => { for (const [re, k] of TN_TG) if (re.test(s)) return k; return 0; };
const TN_RIENG = new Set(["baohanh", "matuy", "hiv", "sti"]), TN_RIENG_BENH = new Set(["hiv", "giang_mai", "lau", "chla", "trung_roi"]);
function tnKetLuan(X, them, an) {
  const { R, H } = X, vd = [], viec = [[], [], []], dan = []; let bot = 0;
  const bo = id => an?.has(id) ? (bot++, true) : false, boB = b => an && TN_RIENG_BENH.has(b) ? (bot++, true) : false;
  const thaiDS = H.thai ? R.cd.flatMap(x => bo(x.c.id) ? [] : x.ds) : null;
  for (const x of H.thai ? [] : R.cd) {
    const c = x.c; if (bo(c.id)) continue; const r = x.chinh, cc = x.ds.filter(y => y.tt === r.tt && !y.m.chi_kem).flatMap(y => y.m.nguon || []).slice(0, 4);
    const lyDo = r.m.tsgd || (r.m.nguy_co || []).length || (r.m.nguy_co_bat_buoc || []).length;
    if (x.ds.some(y => y.bat_thuong)) { vd.push({ d: 80, chu: `${c.ten}: kết quả lần trước bất thường`, cc });
      const q = TS.quytrinh?.[c.id]; for (const k of ["bat_thuong", "chuyen"]) for (const l of q?.[k]?.y || []) viec[tnMoc(l)].push({ chu: `${c.ten}: ${l}`, cc: q[k].nguon, ut: 2 });
      if (!q?.bat_thuong) viec[0].push({ chu: `${c.ten}: lần trước bất thường, nguồn trong web chưa có quy trình xử trí, chuyển bác sĩ chuyên khoa đánh giá`, cc, ut: 2 }); continue; }
    if (x.nhom === 1) { const qua = x.ds.find(y => y.qua_thang > 0);
      if (qua) vd.push({ d: 60 + Math.min(qua.qua_thang, 24) / 2, chu: `${c.ten}: quá hạn ${qua.qua_thang} tháng`, cc });
      else if (lyDo) vd.push({ d: 40, chu: `${c.ten}: ${r.chua ? "chưa làm" : "đến hạn"}${tnLyDo(r, H) ? ", " + tnLyDo(r, H) : ""}`, cc });
      viec[0].push({ chu: `${c.ten}: ${tnViecDong(r, 1)}`, cc, ut: lyDo || x.ds.some(y => y.qua_thang != null) ? 1 : 0 });
      if (r.m.chu_ky_thang && !r.m.chu_ky?.some(o => o.pp)) viec[2].push({ chu: `${c.ten}: lần sau tháng ${tnThang(tsCong(H.nay, r.m.chu_ky_thang))} nếu kết quả bình thường`, cc, han: tsCong(H.nay, r.m.chu_ky_thang) }); }
    if (x.nhom === 2) { const y = x.ds.find(z => z.con_thang != null); viec[y.con_thang <= 3 ? 1 : 2].push({ chu: `${c.ten}: tháng ${tnThang(y.han_som)}, ${tnViecDong(y, 1)}`, cc: y.m.nguon, han: y.han_som }); }
    for (const y of x.ds) if ((y.tt === "DEN_HAN" || y.tt === "SAP_TOI" && y.con_thang != null) && y.m.loi_nguoi_benh) y.m.loi_nguoi_benh.forEach(l => dan.includes(l) || dan.push(l));
  }
  if (thaiDS) { const den = thaiDS.filter(r => r.tt === "DEN_HAN" || r.tt === "BAN"), sap = thaiDS.filter(r => r.tt === "SAP_TOI").sort((a, b) => a.tuan_bat_dau - b.tuan_bat_dau);
    vd.push({ d: 50, chu: `Đang mang thai ${H.tuan != null ? H.tuan + " tuần" : "(chưa nhập tuần thai)"}: ${den.length} việc đến hạn theo mốc tuần thai, ${sap.length} việc sắp tới` });
    den.forEach(r => viec[0].push({ chu: `${tnViecDong(r, 1)} (${r.m.to_chuc})`, cc: r.m.nguon, ut: 1 }));
    sap.forEach(r => viec[r.tuan_bat_dau - (H.tuan ?? 0) <= 13 ? 1 : 2].push({ chu: `Tuần ${r.tuan_bat_dau}: ${tnViecDong(r, 1)} (${r.m.to_chuc})`, cc: r.m.nguon }));
    for (const r of [...den, ...sap]) for (const l of r.m.loi_nguoi_benh || []) dan.includes(l) || dan.push(l); }
  const chua = R.cd.filter(x => !an?.has(x.c.id) && x.nhom === 1 && !x.ds.some(y => y.bat_thuong || y.qua_thang > 0) && !(x.chinh.m.tsgd || (x.chinh.m.nguy_co || []).length || (x.chinh.m.nguy_co_bat_buoc || []).length));
  if (chua.length && !H.thai) vd.push({ d: 20, chu: `Chưa làm hoặc chưa nhập lần làm: ${chua.slice(0, 4).map(x => tnThuong(tnTenNgan(x.c))).join(", ")}${chua.length > 4 ? ` và ${chua.length - 4} chủ đề khác` : ""}` });
  const ban = R.cd.filter(x => x.nhom === 3 && !an?.has(x.c.id)); if (ban.length) vd.push({ d: 10, chu: `Bàn với người bệnh: ${ban.slice(0, 4).map(x => tnThuong(tnTenNgan(x.c))).join(", ")}${ban.length > 4 ? ` và ${ban.length - 4} chủ đề khác` : ""}` });
  for (const v of H.viec_gd) if (!boB(v.tu?.benh)) viec[v.khi === "ngay" || !/^từ \d+ tuổi/.test(v.khi) ? 0 : 2].push({ chu: `${v.viec}${v.dk ? ` (${v.dk})` : ""}, vì ${tnThuong(tnTen(TN_QH, v.tu.qh))} mắc ${tnThuong(tnTen(TN_GDB, v.tu.benh))}`, cc: v.can_cu, gd: 1, ut: 1 });
  for (const g of R.ghi) if (!boB(g.r.benh)) viec[0].push({ chu: `Tiền sử gia đình ${tnThuong(tnTen(TN_GDB, g.r.benh))}: ${g.chu}, chuyển bác sĩ chuyên khoa đánh giá`, ut: 1 });
  for (const b of H.ban_than || []) if (!boB(b.benh)) for (const v of gdBenhNhan(D.giadinh, { icd: TSB[b.benh]?.[0], gioi: H.gioi, tuoi: b.tuoi })) viec[0].push({ chu: v.viec, cc: v.can_cu, gd: 1, ut: 1 });
  if (them) { vd.push(...them.vd); them.viec.forEach((ds, k) => viec[k].push(...ds)); }
  vd.sort((a, b) => b.d - a.d); viec[0].sort((a, b) => (b.ut || 0) - (a.ut || 0)); viec[1].sort((a, b) => tsThang(b.han || H.nay, a.han || H.nay)); viec[2].sort((a, b) => tsThang(b.han || H.nay, a.han || H.nay));
  return { vd: vd.slice(0, 5), vd_them: Math.max(0, vd.length - 5), viec, dan: dan.slice(0, 8), bot };
}
function tnKlEl(K) {
  const s = el("section", "tnkl"); s.setAttribute("aria-label", "Kết luận và việc cần làm"); s.appendChild(el("h3", "", "Kết luận và việc cần làm"));
  s.appendChild(el("p", "tnh", "Vấn đề, xếp từ nặng tới nhẹ"));
  const ol = el("ol"); K.vd.forEach(v => { const li = el("li", "", v.chu); tnCc(li, v.cc); ol.appendChild(li); }); if (!K.vd.length) ol.appendChild(el("li", "", "Chưa thấy vấn đề từ số đã nhập.")); s.appendChild(ol);
  if (K.vd_them) s.appendChild(el("p", "src", `Còn ${K.vd_them} vấn đề nhẹ hơn ở các nhóm bên dưới.`));
  s.appendChild(el("p", "tnh", "Việc cần làm")); let co = 0;
  const liV = v => { const x = el("li", "", v.chu); tnCc(x, v.cc, v.gd); return x; };
  [["Làm ngay hôm nay", 0], ["Trong 1 đến 3 tháng", 1], ["Hẹn lần sau", 2]].forEach(([t, k]) => { const ds = K.viec[k]; if (!ds.length) return; co++; const w = el("div", "tnmuc"); w.appendChild(el("b", "", t));
    const rieng = k ? ds : ds.filter(v => v.ut > 0), chung = k ? [] : ds.filter(v => !(v.ut > 0));
    if (rieng.length) { const o = el("ol"), an = []; rieng.forEach((v, i) => { const x = liV(v); if (rieng.length > 10 && i >= 8) { x.hidden = !TSN.mo.has("kl:them"); an.push(x); } o.appendChild(x); }); w.appendChild(o);
      if (an.length) { const b = el("button", "tncc tnthem"); b.type = "button"; const nhan = () => { b.textContent = an[0].hidden ? `Xem thêm ${an.length} việc` : "Thu gọn"; b.setAttribute("aria-expanded", String(!an[0].hidden)); }; nhan();
        b.addEventListener("click", () => { const mo = an[0].hidden; an.forEach(x => { x.hidden = !mo; }); mo ? TSN.mo.add("kl:them") : TSN.mo.delete("kl:them"); nhan(); }); w.appendChild(b); } }
    if (chung.length) { const d = el("details", "tnchung"); d.open = TSN.mo.has("kl:chung") || !rieng.length; d.addEventListener("toggle", () => d.open ? TSN.mo.add("kl:chung") : TSN.mo.delete("kl:chung"));
      d.appendChild(el("summary", "", `Tầm soát theo tuổi, chưa làm hoặc chưa nhập lần làm (${chung.length})`)); const o = el("ol"); o.start = rieng.length + 1; chung.forEach(v => o.appendChild(liV(v))); d.appendChild(o); w.appendChild(d); }
    s.appendChild(w); });
  if (!co) s.appendChild(el("p", "src", "Chưa có việc từ số đã nhập."));
  if (K.dan.length) { s.appendChild(el("p", "tnh", "Lời dặn người khám")); const u = el("ul", "pts"); K.dan.forEach(l => u.appendChild(el("li", "", l))); s.appendChild(u); }
  return s;
}
const tnKlChu = (K, L) => { L.push("Kết luận và việc cần làm:", "Vấn đề:"); K.vd.forEach((v, i) => L.push(`${i + 1}. ${v.chu}`));
  [["Làm ngay hôm nay", 0], ["Trong 1 đến 3 tháng", 1], ["Hẹn lần sau", 2]].forEach(([t, k]) => { if (!K.viec[k].length) return; L.push(t + ":"); K.viec[k].forEach((v, i) => L.push(`${i + 1}. ${v.chu}`)); });
  if (K.dan.length) { L.push("Lời dặn người khám:"); K.dan.forEach(l => L.push("- " + l)); } };
function tnMuc(x) {
  const c = x.c, det = el("details", "vx"); det.id = "tn-" + c.id; det.open = TSN.mo.has(c.id); det.addEventListener("toggle", () => det.open ? TSN.mo.add(c.id) : TSN.mo.delete(c.id));
  const sm = el("summary"), d0 = el("span"); d0.appendChild(el("b", "", c.ten)); sm.appendChild(d0); sm.appendChild(tnSt(x.chinh));
  sm.appendChild(el("span", "vxone", `${orgTxt(x.chinh.m)}: ${tnViecDong(x.chinh)}`)); det.appendChild(sm);
  const ds = el("div", "tnds");
  for (const r of x.ds) { const d = el("div", "tsln" + (r.tt === "KHONG" ? " neg" : "")); d.appendChild(el("span", orgCls(r.m), orgTxt(r.m))); d.appendChild(tnSt(r));
    d.appendChild(document.createTextNode(`${r.m.doi_tuong.replace(/\.$/, "")}. ${tnViecDong(r)}.`)); const dk = tnDk(r); if (dk.length) d.append(" ", el("span", "tnhoi", cap1(dk.join(". ")) + "."));
    if (r.tuoi_bat_dau != null && r.tt !== "SAP_TOI" && r.m.tsgd) d.appendChild(el("span", "src", ` Mốc bắt đầu tính theo tiền sử gia đình: ${r.tuoi_bat_dau} tuổi.`)); ds.appendChild(d); }
  det.appendChild(ds);
  const card = tsCard(c, x.ds.map(r => r.m)); card.removeAttribute("id"); card.classList.add("vxbody"); det.appendChild(card); return det;
}
const tnVi = v => { const t = v.tu; if (!t?.benh) return ""; const ai = t.tu === "người khám" ? "người khám" : tnThuong(tnTen(TN_QH, t.tu?.qh)); return ` (vì ${ai} mắc ${tnThuong(tnTen(TN_GDB, t.benh))}${t.ghi ? ", " + t.ghi : ""})`; };
const tnKhTen = (n, P) => n.g === "vo_chong" && P?.gioi ? (P.gioi === "nam" ? "Vợ" : "Chồng") : n.ten;
function tnKhDs(n) {
  const ds = [];
  (n.so?.viec || []).forEach(v => ds.push({ chu: `Con sắp sinh: ${tnMucChu(v)}${v.viec}${tnKhi(v)}${tnVi(v)}`, cc: v.can_cu, gd: 1, rieng: TN_RIENG_BENH.has(v.tu?.benh) }));
  n.ng.viec.forEach(v => ds.push({ chu: `${tnMucChu(v)}${v.gioi && n.g === "con" ? (v.gioi === "nu" ? "con gái, " : "con trai, ") : ""}${v.viec}${v.dk ? ` (${v.dk})` : ""}${tnKhi(v)}${tnVi(v)}`, cc: v.can_cu, gd: 1, rieng: TN_RIENG_BENH.has(v.tu?.benh) }));
  n.ng.dong.forEach(d => ds.push({ chu: `${d.kd ? "Nếu xét nghiệm gen dương tính: " : ""}${d.c.ten}, ${orgTxt(d.m)}: ${tnViecDong({ m: d.m, tt: d.tt }, 1)}, ${d.khi}${tnVi(d)}`, cc: d.m.nguon, rieng: TN_RIENG.has(d.c.id) || TN_RIENG_BENH.has(d.tu?.benh) }));
  n.hoi.forEach(h => ds.push({ chu: `${cap1(tnTen(TN_QH, h.tu?.qh || h.tu))} mắc ${tnThuong(tnTen(TN_GDB, h.benh))}: chưa suy được quan hệ huyết thống với nhóm này, chuyển bác sĩ đánh giá`, rieng: TN_RIENG_BENH.has(h.benh) }));
  return ds;
}
function tnKhEl(K, P) {
  const s = el("section", "tngdp"), hd = el("header"); hd.appendChild(el("h3", "", "Kế hoạch cho người thân")); s.appendChild(hd);
  const co = K.map(n => [n, tnKhDs(n)]).filter(([, ds]) => ds.length);
  const b = el("button", "vxall", "Sao chép phần này"); b.type = "button"; b.dataset.cp = "gd"; b.addEventListener("click", () => copy(tnKhChu(K, P).join("\n"), "Đã sao chép kế hoạch người thân")); hd.appendChild(b);
  if (!co.length) { s.appendChild(el("p", "src tngdn", "Chưa có. Nhập bệnh nền, chẩn đoán của người khám hoặc tiền sử gia đình để lập kế hoạch cho người thân.")); return s; }
  s.appendChild(el("p", "src tngdn", "Chỉ quy tắc có văn bản. Người thân chưa rõ tuổi nên mốc ghi theo tuổi bắt đầu. Dòng 'nếu' chỉ áp khi người thân đúng điều kiện đó."));
  for (const [n, ds] of co) { const w = el("div", "tngdn"); w.appendChild(el("b", "", tnKhTen(n, P))); const u = el("ul", "pts");
    for (const d of ds) { const li = el("li", "", d.chu); tnCc(li, d.cc, d.gd); u.appendChild(li); }
    w.appendChild(u); s.appendChild(w); }
  return s;
}
function tnKhChu(K, P) {
  const L = ["Kế hoạch cho người thân"];
  for (const n of K) { const ds = tnKhDs(n); if (!ds.length) continue; L.push("", tnKhTen(n, P) + ":"); ds.forEach(d => L.push("- " + d.chu)); }
  return L;
}
const TN_NHOM = [[1, "Quá hạn hoặc chưa làm"], [2, "Đến hạn trong 12 tháng"], [3, "Bàn với người bệnh"], [4, "Chưa tới hoặc không nên"]];
function tnDsEl(X) {
  const w = el("div"), { R, H } = X;
  if (H.thai) { w.className = "tnthai"; const ds = R.cd.flatMap(x => x.ds.map(r => ({ ...r, c: x.c })));
    for (const [tt, t] of [[["DEN_HAN", "BAN"], H.tuan != null ? `Đến hạn ở tuần ${H.tuan}` : "Việc trong thai kỳ (chưa nhập tuần thai)"], [["SAP_TOI"], "Sắp tới"], [["DA_QUA_MOC"], "Đã qua mốc"]]) {
      const it = ds.filter(r => tt.includes(r.tt)).sort((a, b) => (a.tuan_bat_dau ?? 0) - (b.tuan_bat_dau ?? 0)); if (!it.length) continue;
      const hh = el("div", "tnnhom"); hh.append(el("h3", "", t), el("span", "", `${it.length} việc`)); w.appendChild(hh); const l = el("div", "vxlist tnds");
      for (const r of it) { const d = el("div", "tsln"); d.appendChild(el("span", orgCls(r.m), orgTxt(r.m))); d.appendChild(tnSt(r)); d.appendChild(document.createTextNode(`${tnViecDong(r)}.`)); if (r.m.chon_mot) d.append(" ", el("span", "tnhoi", "Chọn một trong các cách sàng lọc lệch bội."));
        const dk = tnDk(r); if (dk.length) d.append(" ", el("span", "tnhoi", cap1(dk.join(". ")) + ".")); tnCc(d, r.m.nguon); l.appendChild(d); } w.appendChild(l); }
    const b = el("button", "lkb", "Vắc xin khi mang thai: mở trang Tiêm chủng"); b.type = "button"; b.addEventListener("click", () => { tcState.sex = "nu"; tcState.tt.add("co_thai"); const t = H.tuoi ?? 30; tcState.band = Math.max(0, TC_BANDS.findIndex(([a, z]) => t >= a && t <= z)); tcState.tre = false; openView("tiemchung"); });
    w.appendChild(b); return w; }
  for (const [g, t] of TN_NHOM) { const it = R.cd.filter(x => x.nhom === g); if (!it.length) continue;
    const hh = el("div", "tnnhom"); hh.append(el("h3", "", t), el("span", "", `${it.length} chủ đề`)); const l = el("div", "vxlist"); it.forEach(x => l.appendChild(tnMuc(x)));
    if (g === 4) { const d = el("details", "ktqam"); d.appendChild(el("summary", "", `${t} (${it.length})`)); d.appendChild(l); w.appendChild(d); } else w.append(hh, l); }
  for (const [f, cd] of R.da_mac) w.appendChild(el("p", "src", `Đã có ${tnThuong(f.startsWith("ut:") ? tnTen(TN_UT, f.slice(3)) : TS.tu_vung?.[f] || f)}: không tầm soát lại ${tnThuong(TS.chu_de.find(c => c.id === cd)?.ten || cd)}, theo dõi theo thẻ bệnh hoặc bác sĩ chuyên khoa.`));
  return w;
}
function tnForm(k, doi) {
  const v = TSN.v, f = el("div", "tnf"), ktq = k === "ktq";
  const nhom = (ten, gap) => { const s = el(gap ? "details" : "fieldset", "ktqg"); if (gap) { const sm = el("summary"); sm.appendChild(el("b", "", ten)); s.appendChild(sm); s.open = TSN.mo.has("f:" + ten); s.addEventListener("toggle", () => s.open ? TSN.mo.add("f:" + ten) : TSN.mo.delete("f:" + ten)); } else s.appendChild(el("legend", "", ten)); f.appendChild(s); return s; };
  const hang = (box, nhan, inp) => { const r = el("div", "ktqrow"), lb = inp.matches?.("input,select") ? el("label", "ktqlab", nhan) : el("span", "ktqlab", nhan);
    if (lb.tagName === "LABEL") { inp.id ||= "tn" + (++TN_ID); lb.htmlFor = inp.id; } else if (inp.matches?.(".seg")) inp.setAttribute("aria-label", nhan); r.append(lb, inp); box.appendChild(r); return r; };
  const so = (key, ph, min, max) => { const i = el("input"); i.type = "number"; i.inputMode = "decimal"; i.min = min; i.max = max; i.step = "any"; i.value = v[key] ?? ""; i.placeholder = ph || ""; i.setAttribute("aria-label", ph || key); i.addEventListener("input", () => { v[key] = i.value; doi(); }); return i; };
  const nut = (key, opts, ve) => { const g = el("div", "seg"); g.setAttribute("role", "group"); for (const [val, t] of opts) { const b = el("button", "", t); b.type = "button"; b.setAttribute("aria-pressed", String(v[key] === val)); b.addEventListener("click", () => { v[key] = v[key] === val ? undefined : val; g.querySelectorAll("button").forEach((x, i) => x.setAttribute("aria-pressed", String(v[key] === opts[i][0]))); ve?.(); doi(); }); g.appendChild(b); } return g; };
  const chip = (box, ds) => { const w = el("div", "tnchips"); for (const [c, t] of ds) { const b = el("button", "rk", t); b.type = "button"; b.setAttribute("aria-pressed", String(TSN.co.has(c))); b.addEventListener("click", () => { TSN.co.has(c) ? TSN.co.delete(c) : TSN.co.add(c); b.setAttribute("aria-pressed", String(TSN.co.has(c))); ve(); doi(); }); w.appendChild(b); } box.appendChild(w); return w; };
  let ve = () => {};
  const an = []; const khi = (node, dk) => { an.push([node, dk]); return node; };
  if (!ktq) { const g = nhom("Người khám");
    const t = so("tuoi", "Tuổi", 18, 120); t.id = "tn-tuoi"; hang(g, "Tuổi (năm)", t);
    hang(g, "Giới", nut("gioi", [["nam", "Nam"], ["nu", "Nữ"]], () => ve()));
    khi(hang(g, "Đang mang thai", nut("thai", [[true, "Có"], [false, "Không"]], () => ve())), () => v.gioi === "nu");
    khi(hang(g, "Tuần thai", so("tuan", "Tuần", 1, 42)), () => v.gioi === "nu" && v.thai === true);
    const rh = el("input"); rh.type = "checkbox"; rh.checked = !!v.rh; rh.addEventListener("change", () => { v.rh = rh.checked; doi(); }); khi(hang(g, "Nhóm máu Rh(D) âm", rh), () => v.gioi === "nu" && v.thai === true);
    const mk = el("input"); mk.type = "checkbox"; mk.checked = !!v.man_kinh; mk.addEventListener("change", () => { v.man_kinh = mk.checked; doi(); }); khi(hang(g, "Đã mãn kinh", mk), () => v.gioi === "nu" && v.thai !== true);
    const dd = el("input"); dd.type = "checkbox"; dd.checked = !!v.du_dinh; dd.addEventListener("change", () => { v.du_dinh = dd.checked; doi(); }); khi(hang(g, "Dự định có thai", dd), () => v.gioi === "nu" && v.thai !== true);
    hang(g, "Mục đích khám", nut("muc", [["dinh_ky", "Định kỳ"], ["phan_loai", "Đi học, đi làm"]])); }
  else { const g = nhom("Tầm soát: thai kỳ, mục đích khám", false);
    khi(hang(g, "Tuần thai", so("tuan", "Tuần", 1, 42)), () => ktqThai({ gioi: ktqState.v.gioi, tinh_trang: { co_thai: ktqState.v.co_thai } }));
    const dd = el("input"); dd.type = "checkbox"; dd.checked = !!v.du_dinh; dd.addEventListener("change", () => { v.du_dinh = dd.checked; doi(); }); khi(hang(g, "Dự định có thai", dd), () => ktqState.v.gioi === "nu" && !ktqState.v.co_thai);
    hang(g, "Mục đích khám", nut("muc", [["dinh_ky", "Định kỳ"], ["phan_loai", "Đi học, đi làm"]])); }
  { const g = nhom("Thuốc lá");
    if (!ktq) hang(g, "Hút thuốc", nut("hut", [["chua", "Chưa từng"], ["dang", "Đang hút"], ["bo", "Đã bỏ"]], () => ve()));
    else hang(g, "Đã bỏ thuốc", nut("hut", [["bo", "Đã bỏ"]], () => ve()));
    const w = el("div", "tnin2"), a = so("dieu", "Điếu/ngày", 0, 200), b = so("nam", "Số năm", 0, 90), kq = el("b"); w.append(a, el("span", "", "điếu mỗi ngày,"), b, el("span", "", "năm"), kq);
    khi(hang(g, "Số điếu, số năm đã hút", w), () => v.hut === "dang" || v.hut === "bo" || (ktq && ktqState.v.hut_thuoc));
    khi(hang(g, "Đã bỏ được (năm)", so("bo", "Năm", 0, 90)), () => v.hut === "bo");
    const gn = () => { const x = tnGoiNam(v); kq.textContent = x != null ? `= ${soVN(x)} gói-năm` : ""; }; a.addEventListener("input", gn); b.addEventListener("input", gn); gn();
    g.appendChild(khi(el("p", "ktqghi", "1 gói-năm là hút trung bình 20 điếu (1 bao) mỗi ngày trong 1 năm (USPSTF, dòng ung thư phổi)."), () => v.hut === "dang" || v.hut === "bo" || (ktq && ktqState.v.hut_thuoc))); }
  { const g = nhom(ktq ? "Bệnh nền thêm cho tầm soát" : "Bệnh nền, tiền sử bản thân");
    chip(g, ktq ? TN_BN.filter(([c]) => ["copd", "hcv", "hp"].includes(c)) : TN_BN);
    khi(hang(g, "HBV DNA trên 20.000 IU/mL", nut("dna", [[true, "Có"], [false, "Không"]])), () => TSN.co.has("hbv") || (ktq && ktqState.v.ts_hbv));
    khi(hang(g, "Tuổi lúc mắc bệnh tim mạch", so("tim_tuoi", "Tuổi", 1, 120)), () => !ktq && TSN.co.has("tim_mach"));
    const gen = el("select"); [["", "Chưa biết hoặc không"], ["brca1", "Mang đột biến BRCA1"], ["brca2", "Mang đột biến BRCA2"]].forEach(([x, t]) => { const o = el("option", "", t); o.value = x; gen.appendChild(o); }); gen.value = v.gen || ""; gen.addEventListener("change", () => { v.gen = gen.value; doi(); });
    hang(g, "Gen BRCA đã xét nghiệm", gen);
    g.appendChild(el("p", "ktqsub", "Đã mắc, để lập kế hoạch cho người thân"));
    const bl = el("div"); g.appendChild(bl);
    const veBt = () => { bl.innerHTML = ""; TSN.bt.forEach((b, i) => { const r = el("div", "tngd"); const s1 = el("select"); [["", "Chọn bệnh…"], ...TN_BT].forEach(([x, t]) => { const o = el("option", "", t); o.value = x; s1.appendChild(o); }); s1.value = b.benh || ""; s1.setAttribute("aria-label", "Bệnh đã mắc");
      s1.addEventListener("change", () => { b.benh = s1.value; doi(); }); const a = el("input"); a.type = "number"; a.inputMode = "numeric"; a.placeholder = "Tuổi mắc"; a.value = b.tuoi ?? ""; a.setAttribute("aria-label", "Tuổi lúc mắc"); a.addEventListener("input", () => { b.tuoi = a.value; doi(); });
      const x = el("button", "tnx", "×"); x.type = "button"; x.setAttribute("aria-label", "Bỏ dòng này"); x.addEventListener("click", () => { TSN.bt.splice(i, 1); veBt(); doi(); }); r.classList.add("b3"); r.append(s1, a, x); bl.appendChild(r); }); };
    veBt(); const ad = el("button", "vxall tnadd", "Thêm bệnh đã mắc"); ad.type = "button"; ad.addEventListener("click", () => { TSN.bt.push({ benh: "", tuoi: "" }); veBt(); bl.lastElementChild?.querySelector("select")?.focus(); }); g.appendChild(ad); }
  { const g = nhom("Tình dục và nguy cơ khác");
    hang(g, "Đã hoặc đang quan hệ tình dục", nut("qhtd", [[true, "Có"], [false, "Chưa từng"]]));
    if (!ktq) chip(g, TN_NC); }
  { const g = nhom("Tiền sử gia đình"); g.appendChild(el("p", "ktqghi", "Mỗi người thân một dòng. Tuổi lúc mắc giúp tính mốc bắt đầu, không biết thì để trống."));
    const bl = el("div"); g.appendChild(bl);
    const veGd = () => { bl.innerHTML = ""; TSN.gd.forEach((e, i) => { const r = el("div", "tngd"); const s1 = el("select"), s2 = el("select");
      [["", "Người thân…"], ...TN_QH].forEach(([x, t]) => { const o = el("option", "", t); o.value = x; s1.appendChild(o); }); [["", "Bệnh…"], ...TN_GDB].forEach(([x, t]) => { const o = el("option", "", t); o.value = x; s2.appendChild(o); });
      s1.value = e.qh || ""; s2.value = e.benh || ""; s1.setAttribute("aria-label", "Người thân"); s2.setAttribute("aria-label", "Bệnh của người thân");
      s1.addEventListener("change", () => { e.qh = s1.value; doi(); }); s2.addEventListener("change", () => { e.benh = s2.value; doi(); });
      const a = el("input"); a.type = "number"; a.inputMode = "numeric"; a.placeholder = "Tuổi lúc mắc"; a.value = e.tuoi ?? ""; a.setAttribute("aria-label", "Tuổi người thân lúc mắc"); a.addEventListener("input", () => { e.tuoi = a.value; doi(); });
      const x = el("button", "tnx", "×"); x.type = "button"; x.setAttribute("aria-label", "Bỏ người thân này"); x.addEventListener("click", () => { TSN.gd.splice(i, 1); veGd(); doi(); }); r.append(s1, s2, a, x); bl.appendChild(r); }); };
    veGd(); const ad = el("button", "vxall tnadd", "Thêm người thân"); ad.type = "button"; ad.addEventListener("click", () => { TSN.gd.push({ qh: "", benh: "", tuoi: "" }); veGd(); bl.lastElementChild?.querySelector("select")?.focus(); }); g.appendChild(ad); }
  const lanBox = nhom("Lần làm gần nhất (để tính đến hạn)", true); lanBox.appendChild(el("p", "ktqghi", "Tháng và năm làm gần nhất, kết quả lần đó. Chỉ hiện chủ đề đang hợp với người khám."));
  const lanDs = el("div"); lanBox.appendChild(lanDs);
  if (!ktq) { const g = nhom("Phiếu in", true); const r = el("div", "ktqrow tnpk"), i = el("input"); i.type = "text"; i.placeholder = "Tên phòng khám (không bắt buộc)"; i.value = TSN.pk; i.setAttribute("aria-label", "Tên phòng khám in ở đầu phiếu"); i.addEventListener("input", () => { TSN.pk = i.value; }); r.appendChild(i); g.appendChild(r);
    const rg = el("input"); rg.type = "checkbox"; rg.checked = !!TSN.in_rieng; rg.addEventListener("change", () => { TSN.in_rieng = rg.checked; }); hang(g, "In cả mục nhạy cảm (bạo lực, HIV, bệnh lây qua đường tình dục, ma tuý)", rg); }
  ve = () => an.forEach(([n, dk]) => { n.hidden = !dk(); }); ve();
  const ymChu = ym => ym ? ym.split("-").reverse().join("/") : "";
  f.veLan = R => {
    const fk = lanDs.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
    lanDs.innerHTML = ""; if (!R || R.H.thai) { lanDs.appendChild(el("p", "ktqghi", R?.H.thai ? "Đang mang thai: lịch theo tuần thai." : "Nhập tuổi và giới trước.")); return; }
    for (const x of R.R.cd.filter(x => x.nhom < 4 || TSN.lan[x.c.id])) { const id = x.c.id, L = TSN.lan[id] || {}, r = el("div", "tnlan"); r.appendChild(el("b", "", x.c.ten.split(" (")[0]));
      const i = el("input"); i.type = "text"; i.inputMode = "numeric"; i.autocomplete = "off"; i.value = ymChu(L.ym) || L.sai || ""; i.placeholder = "vd 04/2025"; i.dataset.fk = id + ":m"; i.setAttribute("aria-label", "Tháng và năm làm gần nhất: " + x.c.ten); if (L.sai) i.setAttribute("aria-invalid", "true");
      const g2 = el("div", "seg"), pp = [...new Set(x.c.muc.flatMap(m => (m.chu_ky || []).map(o => o.pp)).filter(Boolean))]; g2.setAttribute("role", "group"); g2.setAttribute("aria-label", "Lần trước: " + x.c.ten);
      const luu = () => { if (L.ym || L.bt != null || L.pp || L.sai) TSN.lan[id] = { ...L }; else delete TSN.lan[id]; doi(true); };
      i.addEventListener("change", () => { const v = i.value.trim(), ym = tnYm(v); L.ym = ym; L.sai = !ym && v ? v : undefined; luu(); });
      for (const [val, t] of [[false, "Bình thường"], [true, "Bất thường"]]) { const b = el("button", "", t); b.type = "button"; b.dataset.fk = `${id}:bt:${val}`; b.setAttribute("aria-pressed", String(L.bt === val)); b.addEventListener("click", () => { L.bt = L.bt === val ? undefined : val; luu(); }); g2.appendChild(b); }
      for (const p of pp) { const b = el("button", "", TN_PP[p] || p); b.type = "button"; b.dataset.fk = `${id}:pp:${p}`; b.setAttribute("aria-pressed", String(L.pp === p)); b.addEventListener("click", () => { L.pp = L.pp === p ? undefined : p; luu(); }); g2.appendChild(b); }
      r.append(i, g2); lanDs.appendChild(r); }
    if (fk) lanDs.querySelector(`[data-fk="${CSS.escape(fk)}"]`)?.focus();
  };
  f.ve = ve; return f;
}
function tnChuDs(X, L) {
  const { R, H } = X;
  if (H.thai) { L.push("", `Tầm soát thai kỳ theo tuần thai${H.tuan != null ? " (tuần " + H.tuan + ")" : ""}:`); for (const x of R.cd) for (const r of x.ds) L.push(`- ${tnChu(r)[1]}: ${tnViecDong(r)} (${r.m.to_chuc})`); return; }
  for (const [g, t] of TN_NHOM) { const it = R.cd.filter(x => x.nhom === g); if (!it.length) continue; L.push("", t + ":");
    it.forEach(x => L.push(`- ${x.c.ten}: ${tnChu(x.chinh)[1]}. ${orgTxt(x.chinh.m)}: ${tnViecDong(x.chinh)}`)); }
}
function tnLich(X, K) {
  const H = X.H, m = []; for (let i = 0; i < 12; i++) m.push({ ym: tsCong(H.nay, i), ds: [] });
  const vao = (ym, chu) => { const k = tsThang(H.nay, ym); if (k >= 0 && k < 12) m[k].ds.push(chu); };
  K.viec[0].forEach(v => m[0].ds.push(v.chu.split(":")[0])); [...K.viec[1], ...K.viec[2]].forEach(v => v.han && vao(v.han, v.chu.split(":")[0]));
  return m.filter(x => x.ds.length);
}
function tnPhieu(X, K0, nguoi) {
  const an = TSN.in_rieng ? null : TN_RIENG, K = an ? tnKetLuan(X, null, an) : K0;
  const kh = X.K.map(n => { const ds = tnKhDs(n), d2 = an ? ds.filter(d => !d.rieng) : ds; return [n, d2, ds.length - d2.length]; });
  const bot = (K.bot || 0) + kh.reduce((t, x) => t + x[2], 0);
  const w = el("div", "tnin in-chi"); if (TSN.pk.trim()) w.appendChild(el("p", "tnpkh", TSN.pk.trim()));
  w.appendChild(el("h2", "", "Phiếu kế hoạch tầm soát"));
  const id = el("p", "tnid"); id.append(el("span", "", "Họ tên"), el("i"), el("span", "", "Mã hồ sơ"), el("i", "ng")); w.appendChild(id);
  w.appendChild(el("p", "", `Ngày ${ngayVN()}. Người khám: ${nguoi}`));
  if (bot) w.appendChild(el("p", "tnghi", "Một số mục nhạy cảm bác sĩ trao đổi riêng, không in trên phiếu."));
  const h4 = t => w.appendChild(el("h4", "", t));
  h4("Vấn đề"); const o1 = el("ol"); K.vd.forEach(v => o1.appendChild(el("li", "", v.chu))); w.appendChild(o1);
  [["Làm ngay hôm nay", 0], ["Trong 1 đến 3 tháng", 1], ["Hẹn lần sau", 2]].forEach(([t, k]) => { const ds = K.viec[k]; if (!ds.length) return; h4(t);
    const rieng = k ? ds : ds.filter(v => v.ut > 0), chung = k ? [] : ds.filter(v => !(v.ut > 0));
    if (rieng.length) { const o = el("ol"); rieng.forEach(v => o.appendChild(el("li", "", v.chu))); w.appendChild(o); }
    if (chung.length) { w.appendChild(el("p", "tnkhn", "Tầm soát theo tuổi, chưa làm hoặc chưa nhập lần làm")); const o = el("ol"); o.start = rieng.length + 1; chung.forEach(v => o.appendChild(el("li", "", v.chu))); w.appendChild(o); } });
  const lich = tnLich(X, K); if (lich.length) { h4("Lịch 12 tháng"); const t = el("table"), b = el("tbody"); lich.forEach(x => { const tr = el("tr"); tr.append(el("td", "", "Tháng " + tnThang(x.ym)), el("td", "", [...new Set(x.ds)].join(", "))); b.appendChild(tr); }); t.appendChild(b); w.appendChild(t); }
  if (K.dan.length) { h4("Lời dặn người khám"); const u = el("ul"); K.dan.forEach(l => u.appendChild(el("li", "", l))); w.appendChild(u); }
  const kh2 = kh.filter(x => x[1].length);
  if (kh2.length) { h4("Kế hoạch cho người thân"); for (const [n, ds] of kh2) { w.appendChild(el("p", "tnkhn", tnKhTen(n, X.P))); const u = el("ul"); ds.forEach(d => u.appendChild(el("li", "", d.chu))); w.appendChild(u); } }
  const ky = el("div", "tnky"); ky.append(el("div", "", "Người khám (ký, ghi rõ họ tên)"), el("div", "", "Bác sĩ khám (ký, ghi rõ họ tên)")); w.appendChild(ky);
  w.appendChild(el("p", "tnchan", "Kết quả tính tự động từ số đã nhập, bác sĩ là người kết luận. " + chanNguon())); return w;
}
function tnChuTat(X, K, nguoi) { const L = ["Kế hoạch tầm soát", `Ngày ${ngayVN()}. Người khám: ${nguoi}`, ""]; tnKlChu(K, L); tnChuDs(X, L); const kh = tnKhChu(X.K, X.P); if (kh.length > 1) L.push("", ...kh);
  L.push("", "Kết quả tính tự động từ số đã nhập, bác sĩ là người kết luận.", chanNguon()); return L.join("\n"); }
const tnNguoi = P => [P.tuoi != null ? P.tuoi + " tuổi" : "chưa nhập tuổi", P.gioi === "nu" ? "nữ" : P.gioi === "nam" ? "nam" : "chưa chọn giới", P.thai ? `mang thai ${P.tuan ?? "?"} tuần` : null].filter(Boolean).join(", ");
function renderTamSoat() {
  const body = viewHead("Tầm soát theo chuẩn và bệnh tật của người Việt", "Nhập một lần, ô nào chưa biết thì để trống. Bộ Y tế đứng trước, mỗi dòng có câu trích nguồn. Số nhập chỉ nằm trên máy này khi trang còn mở, không lưu, không gửi đi đâu.");
  const wrap = el("div", "tnwrap"), rcol = el("div", "tnr"); rcol.setAttribute("aria-live", "off"); let tmr = 0;
  const doi = ngay => { clearTimeout(tmr); tmr = setTimeout(ve, ngay ? 0 : 120); };
  const form = tnForm("ts", doi); wrap.append(form, rcol); body.appendChild(wrap);
  { const xem = el("button", "vxall ktqxem", "Xem kết quả"); xem.type = "button"; xem.addEventListener("click", () => rcol.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" })); form.appendChild(xem); }
  const inEl = el("div"); body.appendChild(inEl);
  function ve() {
    rcol.innerHTML = ""; const v = TSN.v, P0 = tnHoSo();
    const hh = el("div", "ktqbar"); hh.appendChild(el("h3", "", "Kết quả")); rcol.appendChild(hh);
    if (P0.tuoi == null || !P0.gioi) { form.veLan(null); srBao("ts", ""); rcol.appendChild(el("p", "tdempty", "Nhập tuổi và giới. Kết quả hiện ngay ở đây.")); return; }
    if (P0.tuoi < 18) { form.veLan(null); rcol.appendChild(el("p", "miss", "Trang này dành cho người từ 18 tuổi.")); return; }
    const X = tnChay(), K = tnKetLuan(X), nguoi = tnNguoi(X.P);
    const cpb = cpBar(() => tnChuTat(X, K, nguoi), () => { inEl.innerHTML = ""; inEl.appendChild(tnPhieu(X, K, nguoi)); return inEl.firstChild; }, "kế hoạch tầm soát");
    const xoa = el("button", "", "Xoá hết"); xoa.type = "button"; xoa.dataset.cp = "xoa"; xoa.setAttribute("aria-label", "Xoá hết số đã nhập");
    xoa.addEventListener("click", () => { tnXoa(); renderTamSoat(); say("Đã xoá hết số đã nhập"); }); cpb.appendChild(xoa); hh.appendChild(cpb);
    rcol.appendChild(tnKlEl(K)); rcol.appendChild(tnDsEl(X)); rcol.appendChild(tnKhEl(X.K, X.P)); srBao("ts", `Kết quả: ${K.vd.length} vấn đề, ${K.viec[0].length} việc làm ngay hôm nay`);
    rcol.appendChild(el("p", "src ktqfoot", "Kết quả tính tự động từ số đã nhập, bác sĩ là người kết luận. Tầm soát dành cho người không triệu chứng. Có triệu chứng hoặc đã có bệnh thì khám và theo dõi theo thẻ bệnh."));
    form.veLan(X);
  }
  ve();
  const cd = el("details", "tnmode"); cd.open = TSN.mo.has("cd"); cd.addEventListener("toggle", () => { cd.open ? TSN.mo.add("cd") : TSN.mo.delete("cd"); });
  cd.appendChild(el("summary", "", "Xem theo chủ đề: bảng theo tuổi và khuyến cáo từng tổ chức")); const cdb = el("div"); cd.appendChild(cdb); body.appendChild(cd); tnChuDe(cdb);
  body.appendChild(el("p", "src", "Quyết định cuối cùng theo đánh giá của bác sĩ và hướng dẫn chuyên môn của cơ sở."));
}
const TS_BANDS = [[18, 29], [30, 39], [40, 49], [50, 64], [65, 74], [75, 200]], bandTxt = ([a, b]) => b >= 200 ? `≥${a}` : `${a}–${b}`;
const tsCdState = { band: 2, sex: "nam" };
const tsChung = m => !m.thai_ky && !(m.nguy_co || []).length && !(m.nguy_co_bat_buoc || []).length && !m.tsgd && !m.chi_kem;
const tsTrong = (m, i, sex) => { const [lo, hi] = TS_BANDS[i]; return !((m.tuoi_den ?? 200) < lo || (m.tuoi_tu ?? 0) > hi) && (m.gioi === "ca_hai" || m.gioi === sex); };
function tnChuDe(box) {
  box.innerHTML = ""; const st = tsCdState;
  const ctl = el("div", "tsctl"); const seg = (label, opts, cur, on) => { const w = el("div"); w.appendChild(el("p", "lab", label)); const g = el("div", "seg"); g.setAttribute("role", "group"); g.setAttribute("aria-label", label);
    opts.forEach(([v, t]) => { const b = el("button", "", t); b.type = "button"; b.setAttribute("aria-pressed", String(v === cur)); b.addEventListener("click", () => { on(v); tnChuDe(box); }); g.appendChild(b); }); w.appendChild(g); return w; };
  ctl.appendChild(seg("Tuổi", TS_BANDS.map((b, i) => [i, bandTxt(b)]), st.band, v => st.band = v)); ctl.appendChild(seg("Giới", [["nam", "Nam"], ["nu", "Nữ"]], st.sex, v => st.sex = v)); box.appendChild(ctl);
  const tb = el("table", "tsmx"), th = el("thead"), tr0 = el("tr"); tr0.appendChild(el("th", "", "Chủ đề")); TS_BANDS.forEach((b, i) => { const c = el("th", i === st.band ? "cur" : "", bandTxt(b)); c.scope = "col"; tr0.appendChild(c); }); th.appendChild(tr0); tb.appendChild(th);
  const tbd = el("tbody");
  for (const c of TS.chu_de.filter(c => c.muc.some(m => tsChung(m) && !tsNeg(m) && (m.gioi === "ca_hai" || m.gioi === st.sex)))) { const tr = el("tr"), r = el("th"); r.scope = "row"; const a = el("a", "", c.ten); a.href = "#ts-" + c.id;
    a.addEventListener("click", e => { e.preventDefault(); const t = $("#ts-" + c.id); if (t) { t.open = true; t.scrollIntoView({ block: "start" }); } }); r.appendChild(a); tr.appendChild(r);
    TS_BANDS.forEach((_, i) => { const td = el("td", i === st.band ? "cur" : ""), orgs = [...new Set(c.muc.filter(m => tsChung(m) && !tsNeg(m) && tsTrong(m, i, st.sex)).map(m => m.vung))];
      for (const v of ["VN", "Châu Âu", "Toàn cầu", "Mỹ"]) if (orgs.includes(v)) { const o = el("span", "o", v === "VN" ? "B" : v === "Mỹ" ? "M" : v === "Châu Âu" ? "E" : "W"); o.title = v === "VN" ? "Bộ Y tế" : v === "Mỹ" ? "Mỹ (CDC, USPSTF)" : v === "Châu Âu" ? "Châu Âu" : "WHO"; td.appendChild(o); }
      if (orgs.length) { td.classList.add("hit"); td.addEventListener("click", () => { st.band = i; tnChuDe(box); $("#ts-" + c.id)?.scrollIntoView({ block: "start" }); }); } tr.appendChild(td); }); tbd.appendChild(tr); }
  tb.appendChild(tbd); box.appendChild(tb);
  box.appendChild(el("p", "tsleg", "Bảng chỉ đếm dòng cho mọi người cùng tuổi, giới. Dòng theo nhóm nguy cơ, tiền sử gia đình, thai kỳ nằm trong thẻ từng chủ đề. B: Bộ Y tế · E: châu Âu · W: WHO · M: Mỹ."));
  const lst = el("div", "vxlist"); for (const c of TS.chu_de) lst.appendChild(tsItem(c, c.muc)); box.appendChild(lst);
}
function tsMoChuDe(id) {
  const c = TS?.chu_de.find(x => x.id === id); if (!c) { openView("tamsoat"); return; }
  ghiXem("tamsoat/" + id, "Tầm soát: " + c.ten); TSN.mo.add("cd"); tsOpen.add(id);
  openView("tamsoat", () => { const t = $("#ts-" + id); if (t) { t.open = true; t.scrollIntoView({ block: "start" }); } });
}
const tsOpen = new Set();
function tsItem(c, ms) {
  const det = el("details", "vx"); det.id = "ts-" + c.id; det.open = tsOpen.has(c.id);
  det.addEventListener("toggle", () => det.open ? tsOpen.add(c.id) : tsOpen.delete(c.id));
  const sm = el("summary"); sm.appendChild(el("b", "", c.ten)); const og = el("span", "vxorg");
  const order = { VN: 0, "Châu Âu": 1, "Toàn cầu": 2, "Mỹ": 3 };
  [...new Set(ms.filter(m => !tsNeg(m)).map(m => m.vung))].sort((a, b) => order[a] - order[b]).forEach(v => { const o = el("span", "o", v === "VN" ? "B" : v === "Mỹ" ? "M" : v === "Châu Âu" ? "E" : "W"); og.appendChild(o); });
  sm.appendChild(og); const t1 = TS.tomtat?.[c.id]?.y?.[0]; if (t1) sm.appendChild(el("span", "vxone", t1)); det.appendChild(sm);
  const card = tsCard(c, ms); card.removeAttribute("id"); card.classList.add("vxbody"); det.appendChild(card); return det;
}
const KTQ_TS_DO = { tha_vsh2026_phan_loai: "tha", bmi_chaua: "beophi", non_hdl: "lipid", ldl_friedewald: "lipid", phq2: "tramcam", gad2: "loau", audit_c: "ruou", steadi: "nga" };
function ktqTsNgoai(R) {
  const nc = R.nguy_co || {}, co = Object.entries(nc).filter(([k, x]) => x && k !== "hut_thuoc" && k !== "sau_man_kinh").map(([k]) => k);
  const nay = tnNay(), lan = {}; for (const [id, cd] of Object.entries(KTQ_TS_DO)) { const Rt = R.thang?.[id]; if (Rt?.K && Rt.K.r != null && !Rt.khong_ap_dung) lan[cd] = { ym: `${nay.y}-${String(nay.m).padStart(2, "0")}`, hom_nay: 1 }; }
  return { tuoi: R.tuoi != null ? Math.floor(R.tuoi) : null, gioi: R.gioi || null, co, thai: ktqThai(R), man_kinh: !!nc.sau_man_kinh, hut: nc.hut_thuoc, lan };
}
function ktqTsX(R) { if (R.tuoi == null || !R.gioi || R.tuoi < 18) return null; return tnChay(ktqTsNgoai(R)); }
const tnHd = h => Array.isArray(h) ? h.length > 0 : !!h;
function ktqVanDe(R) {
  const C = D.khamtq, vd = [], viec = [[], [], []];
  for (const k of C.khoi) for (const id of k.thang) {
    const Rt = R.thang[id], K = Rt?.K; if (!K || K.r == null || Rt.khong_ap_dung) continue;
    const t = D.thangdiem.thang.find(x => x.id === id), ten = C.thang[id].ten_ngan;
    for (const c of K.cb || []) if (c.muc === "khan") { vd.push({ d: 100, chu: `${ten}: ${c.hanh_dong.split(". ")[0]}`, cc: t.nguon }); viec[0].push({ chu: `${ten}: ${c.hanh_dong}`, cc: t.nguon, ut: 3 }); }
    const S = tdStrata(t, Rt.v).filter(p => !/^Chưa/.test(p.nhan || "")), i = S.indexOf(K.pt);
    if (i > 0 && tnHd(K.pt.hanh_dong)) { vd.push({ d: 50 + 40 * i / Math.max(1, S.length - 1), chu: `${ten}: ${[K.bang ? K.ma : t.an_so ? "" : K.chu, K.pt.nhan].filter(Boolean).join(", ")}`, cc: t.nguon });
      for (const l of [].concat(K.pt.hanh_dong)) if (l) viec[tnMoc(l)].push({ chu: `${ten}: ${l}`, cc: t.nguon, ut: 2 }); }
  }
  return { vd, viec };
}
function ktqKetLuan(R) { const X = ktqTsX(R), them = ktqVanDe(R); if (!X) return them.vd.length ? { vd: them.vd.sort((a, b) => b.d - a.d).slice(0, 5), vd_them: Math.max(0, them.vd.length - 5), viec: them.viec, dan: [] } : null; return tnKetLuan(X, them); }
function ktqTsSec(rcol, R) {
  const X = ktqTsX(R), sec = el("section", "ktqsec");
  sec.appendChild(el("h3", "tsh", X?.H.thai ? "Tầm soát thai kỳ theo tuần thai" : "Tầm soát nên xem theo tuổi, giới, yếu tố nguy cơ"));
  if (!X) { sec.appendChild(el("p", "miss", "Nhập tuổi và giới để lọc lịch tầm soát.")); rcol.appendChild(sec); return; }
  sec.appendChild(tnDsEl(X));
  const chua = Object.entries(R.nguy_co).filter(([, x]) => x == null).map(([k]) => TS_RISK.find(r => r[0] === k)?.[1]).filter(Boolean);
  if (chua.length) sec.appendChild(el("p", "src", "Chưa xét được yếu tố: " + chua.join(", ") + " (thiếu số)."));
  sec.appendChild(el("p", "src", "Tầm soát áp dụng cho người không triệu chứng. Nhập lần làm gần nhất ở mục Tầm soát của biểu mẫu để tính đến hạn, quá hạn."));
  rcol.appendChild(sec); rcol.appendChild(tnKhEl(X.K, X.P));
}
function ktqTsChu(R, L) { const X = ktqTsX(R); if (!X) return; if (X.H.thai) { tnChuDs(X, L); return; } L.push("", "Tầm soát nên xem theo tuổi, giới, yếu tố nguy cơ:"); const L2 = []; tnChuDs(X, L2); L.push(...L2.filter(Boolean)); const kh = tnKhChu(X.K, X.P); if (kh.length > 1) L.push("", ...kh); }
function ktqKlChu(R, L) { const K = ktqKetLuan(R); if (!K) return; L.push(""); tnKlChu(K, L); }
const GRADE_TXT = { A: "nên làm", B: "nên làm", C: "cân nhắc từng người", D: "không nên làm", I: "chưa đủ bằng chứng" };
function tsCard(c, ms) {
  const box = el("section", "rx"); box.id = "ts-" + c.id;
  const head = el("header", "rxhead"); head.appendChild(el("h4", "", c.ten));
  for (const z of c.ma_z || []) { const r = BY.get(z); if (!r) continue; const p = el("p", "tscode"); p.append(document.createTextNode("Mã khi khám sàng lọc: "), el("b", "", z), document.createTextNode(" " + r.ten + " · ")); p.appendChild(aEl(`TT 06/2026 tr. ${r.tr} ↗`, `${TT06}#page=${r.tr}`, "Phụ lục Thông tư 06/2026/TT-BYT")); head.appendChild(p); }
  box.appendChild(head);
  const refs = [], idx = new Map(), src = id => D.nguon[id] || { ten: id };
  const list = el("ol", "tl");
  const notes = [];
  const tt = TS.tomtat?.[c.id];
  const qt = TS.quytrinh?.[c.id];
  const cite = arr => { const f = document.createDocumentFragment(), shown = new Set();
    for (const x of arr || []) { const key = x.id + "|" + (x.vi_tri || "");
      if (!idx.has(key)) { idx.set(key, refs.length + 1); refs.push({ ...x, trichs: [] }); }
      const n = idx.get(key), r = refs[n - 1]; if (x.trich && !r.trichs.includes(x.trich)) r.trichs.push(x.trich);
      if (shown.has(n)) continue; shown.add(n);
      const a = el("a", "sup", String(n)); a.href = "#"; a.title = (src(x.id).ten || x.id) + (x.vi_tri ? ", " + x.vi_tri : "");
      a.addEventListener("click", e => { e.preventDefault(); det.open = true; const li = list.querySelector(`[data-ref="${n}"]`); if (li) { li.scrollIntoView({ block: "center" }); li.classList.add("hi"); setTimeout(() => li.classList.remove("hi"), 1800); } });
      f.appendChild(a); } return f; };
  if (tt?.y?.length) { const k = el("div", "tstt"); k.appendChild(el("p", "ld", "Tóm tắt nên làm:")); const ul = el("ul", "pts"); tt.y.forEach(l => ul.appendChild(el("li", "", l))); k.appendChild(ul); box.appendChild(k); ul.lastElementChild?.appendChild(cite(tt.nguon)); }
  if (qt) {
    const Q = [["lam", "Làm gì", "q0"], ["binh_thuong", "Bình thường", "q1"], ["bat_thuong", "Bất thường", "q2"], ["chuyen", "Chuyển tuyến", "q3"], ["ngung", "Khi nào ngừng", "q4"]];
    const w = el("ol", "qtr");
    for (const [k, nhan, cls] of Q) { const b = qt[k]; if (!b?.y?.length) continue; const li = el("li", cls); li.appendChild(el("b", "", nhan));
      const ul = el("ul"); b.y.forEach(l => ul.appendChild(el("li", "", l))); li.appendChild(ul); w.appendChild(li); ul.lastElementChild?.appendChild(cite(b.nguon)); }
    box.appendChild(w);
  }
  const bd = el("div", "tsbody");
  const order = { VN: 0, "Châu Âu": 1, "Toàn cầu": 2, "Mỹ": 3 };
  for (const m of [...ms].sort((a, b) => order[a.vung] - order[b.vung])) {
    const d = el("div", "tsln" + (tsNeg(m) ? " neg" : "")); d.appendChild(el("span", orgCls(m), orgTxt(m)));
    const gtx = m.to_chuc === "USPSTF" ? GRADE_TXT[m.muc_do] : m.muc_do ? m.muc_do.replace(/^IARC: /, "IARC đánh giá bằng chứng: ") : null;
    if (gtx) d.appendChild(el("span", "gr", gtx + " "));
    if (m.y?.length) {
      let ul = null;
      for (const line of m.y) {
        if (/:\s*$/.test(line)) { d.appendChild(el("p", "ld", line)); ul = null; }
        else { if (!ul) { ul = el("ul", "pts"); d.appendChild(ul); } ul.appendChild(el("li", "", line)); } }
      (d.lastElementChild?.tagName === "UL" ? d.lastElementChild.lastElementChild : d.lastElementChild || d).appendChild(cite(m.nguon));
      for (const g of m.ghi_chu_y || []) notes.push(`${orgTxt(m)}: ${g}`);
    } else {
      d.appendChild(document.createTextNode(m.doi_tuong + ". "));
      if (m.cach) d.appendChild(document.createTextNode(m.cach.replace(/\.?$/, ". ")));
      if (m.tan_suat) d.appendChild(el("span", "tf", m.tan_suat.replace(/\.?$/, ".")));
      if (m.ghi_chu) notes.push(`${orgTxt(m)}: ${m.ghi_chu}`);
      d.appendChild(cite(m.nguon));
    }
    bd.appendChild(d);
  }
  if (qt) { const dg = el("details", "tsrc tsorg"); dg.appendChild(el("summary", "", `Khuyến cáo của từng tổ chức (${ms.length})`)); dg.appendChild(bd); box.appendChild(dg); } else box.appendChild(bd);
  const det = el("details", "tsrc"); det.appendChild(el("summary", "", notes.length ? `Ghi chú và nguồn (${refs.length})` : `Nguồn (${refs.length})`));
  if (notes.length) { const g = el("ul", "gc"); notes.forEach(t => g.appendChild(el("li", "", t))); det.appendChild(g); }
  refs.forEach((x, i) => { const s = src(x.id), li = el("li"); li.dataset.ref = i + 1;
    li.appendChild(el("b", "", [s.ten, s.so_hieu].filter(Boolean).join(", ")));
    if (s.vung === "Mỹ") { li.appendChild(document.createTextNode(" ")); li.appendChild(el("span", "b bdau", "Mỹ")); }
    li.appendChild(document.createTextNode([s.co_quan, s.nam].filter(Boolean).length ? ". " + [s.co_quan, s.nam].filter(Boolean).join(", ") : ""));
    if (x.vi_tri) li.appendChild(el("span", "vt", x.vi_tri));
    for (const q of x.trichs) li.appendChild(el("q", "", q));
    if (s.url) { const a = aEl("Mở văn bản ↗", s.url + (x.trang && !s.url.includes("#") ? "#page=" + x.trang : "")); a.className = "open"; li.appendChild(a); }
    list.appendChild(li); });
  det.appendChild(list); box.appendChild(det);
  return box;
}
// ===TS2_END===
