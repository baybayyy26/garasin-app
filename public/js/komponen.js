/* ==========================================================================
   GARASIN — komponen.js
   Potongan tampilan yang dipakai di banyak halaman (pelanggan & admin):
   foto kondisi, ringkasan kondisi, status kesehatan, timeline perawatan.
   ========================================================================== */

window.G = window.G || {};

(function () {
  const ui = G.ui;

  // Foto kondisi motor — tampilkan foto bila ada, atau info bahwa update
  // foto/video dikirim lewat WhatsApp (pelanggan tidak akses CCTV langsung).
  function fotoKondisi(p) {
    const stamp = `<span class="stamp">${ui.tanggal(p.tanggal)}</span>`;
    if (p && p.foto) return `<div class="foto-kondisi">${stamp}<img src="${p.foto}" alt="Foto kondisi ${ui.tanggal(p.tanggal)}"></div>`;
    return `<div class="foto-kondisi"><div class="ph"><span class="cam">🎥</span>Area terpantau CCTV 24 jam<br>Update foto/video via WhatsApp</div></div>`;
  }

  // Ringkasan 3 komponen (aki / ban / mesin) sebagai pill
  function ringkasanKondisi(p) {
    return `<div class="kondisi-row">
      ${ui.kondisiPill('Aki', p.status_aki)}
      ${ui.kondisiPill('Ban', p.status_ban)}
      ${ui.kondisiPill('Mesin', p.status_mesin)}
    </div>`;
  }

  // Perawatan terbaru untuk satu motor (atau null)
  function perawatanTerbaru(motorId) {
    const list = G.store.find('perawatan', p => p.motor_id === Number(motorId))
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    return list[0] || null;
  }

  // Status kesehatan motor berdasar perawatan terbaru -> { label, kelas } | null
  function statusKesehatan(motorId) {
    const p = perawatanTerbaru(motorId);
    if (!p) return null;
    const nilai = [p.status_aki, p.status_ban, p.status_mesin];
    if (nilai.includes('buruk')) return { label: 'Perlu tindakan', kelas: 'b-merah' };
    if (nilai.includes('perhatian')) return { label: 'Perlu perhatian', kelas: 'b-kuning' };
    return { label: 'Sehat', kelas: 'b-hijau' };
  }
  function badgeKesehatan(motorId) {
    const s = statusKesehatan(motorId);
    return s ? `<span class="badge ${s.kelas}">${s.label}</span>` : '<span class="badge b-abu">Belum dicek</span>';
  }

  // Timeline seluruh perawatan satu motor (urut terbaru di atas)
  function timelinePerawatan(motorId) {
    const list = G.store.find('perawatan', p => p.motor_id === Number(motorId))
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    if (!list.length) return ui.empty('🔧', 'Belum ada laporan perawatan', 'Laporan kondisi harian akan muncul di sini.');
    return `<div class="timeline">${list.map(p => `
      <div class="tl-item">
        <div class="between" style="align-items:flex-start;gap:14px">
          <div class="grow">
            <div class="tl-date">${ui.tanggal(p.tanggal)}</div>
            <div class="tl-meta">Petugas: ${p.petugas}</div>
            <div class="mt-1">${ringkasanKondisi(p)}</div>
            ${p.catatan ? `<p class="kecil mt-1">"${p.catatan}"</p>` : ''}
          </div>
          <div style="width:160px;flex-shrink:0">${fotoKondisi(p)}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  // Modal: riwayat kondisi sebuah motor
  function bukaRiwayatKondisi(motor) {
    ui.modal({
      judul: `Riwayat Kondisi — ${motor.tipe}`,
      lebar: 580,
      isiHTML: `<div class="between mb-2"><span class="plat" style="font-size:1.05rem">${motor.plat}</span>
                <span class="muted kecil">${motor.warna} · ${motor.cc} cc</span></div>
                ${timelinePerawatan(motor.id)}`,
    });
  }

  G.komponen = {
    fotoKondisi, ringkasanKondisi, perawatanTerbaru,
    statusKesehatan, badgeKesehatan, timelinePerawatan, bukaRiwayatKondisi,
  };
})();
