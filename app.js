/* =========================================================
   Thanh Xuân A5 – App Logic v4  (Supabase backend)
========================================================= */
import { createClient } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────
// SUPABASE_URL và SUPABASE_ANON được khai báo trong supabase.config.js
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const PHOTO_BUCKET = 'wish-photos';
const VIDEO_BUCKET = 'wish-videos';

// ── App state ─────────────────────────────────────────────
let wishes       = [];
let photoFile    = null;
let videoFile    = null;
let mediaType    = 'photo';
let viewingId    = null;
let activeFilter = 'all';
let searchQuery  = '';

// ── DOM refs ─────────────────────────────────────────────
const gallery             = document.getElementById('gallery');
const emptyState          = document.getElementById('emptyState');
const statCount           = document.getElementById('statCount');
const modalOverlay        = document.getElementById('modalOverlay');
const viewOverlay         = document.getElementById('viewOverlay');
const btnOpen             = document.getElementById('btnOpen');
const btnOpenEmpty        = document.getElementById('btnOpenEmpty');
const btnClose            = document.getElementById('btnClose');
const btnCancelForm       = document.getElementById('btnCancelForm');
const btnViewClose        = document.getElementById('btnViewClose');
const btnDelete           = document.getElementById('btnDelete');
const wishForm            = document.getElementById('wishForm');
const charCount           = document.getElementById('charCount');
const messageInput        = document.getElementById('message');
const searchBox           = document.getElementById('searchBox');
const filterTabs          = document.getElementById('filterTabs');
const toastEl             = document.getElementById('toast');
const particlesContainer  = document.getElementById('particles');

// Photo refs
const photoInput          = document.getElementById('photoInput');
const uploadAreaPhoto     = document.getElementById('uploadAreaPhoto');
const uploadPlaceholder   = document.getElementById('uploadPlaceholder');
const previewWrap         = document.getElementById('previewWrap');
const previewImg          = document.getElementById('previewImg');
const removePhotoBtn      = document.getElementById('removePhoto');

// Video refs
const videoInput          = document.getElementById('videoInput');
const uploadAreaVideo     = document.getElementById('uploadAreaVideo');
const videoPlaceholder    = document.getElementById('videoPlaceholder');
const videoPreviewWrap    = document.getElementById('videoPreviewWrap');
const previewVideo        = document.getElementById('previewVideo');
const removeVideoBtn      = document.getElementById('removeVideo');

// Media tabs
const tabPhoto            = document.getElementById('tabPhoto');
const tabVideo            = document.getElementById('tabVideo');

// ── Particles ─────────────────────────────────────────────
const EMOJIS = ['🌸','🌼','🌺','🌷','✿','❀','🍀','⭐','✨'];
(function spawnParticles() {
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left              = Math.random() * 100 + 'vw';
    el.style.fontSize          = (0.7 + Math.random() * 0.8) + 'rem';
    el.style.animationDuration = (8 + Math.random() * 14) + 's';
    el.style.animationDelay    = (Math.random() * 12) + 's';
    el.style.opacity           = (0.1 + Math.random() * 0.35).toFixed(2);
    particlesContainer.appendChild(el);
  }
})();

// ── Helpers ───────────────────────────────────────────────
function fmt(iso) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
}

let _toastTimer;
function showToast(msg, type = 'info', duration = 3000) {
  toastEl.textContent = msg;
  toastEl.className = `toast show toast-${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

function fmtSize(bytes) {
  return bytes < 1048576
    ? (bytes / 1024).toFixed(0) + ' KB'
    : (bytes / 1048576).toFixed(1) + ' MB';
}

function updateStats() { statCount.textContent = wishes.length; }

// ── Media tabs ────────────────────────────────────────────
function switchMediaTab(type) {
  mediaType = type;
  if (type === 'photo') {
    tabPhoto.classList.add('active');
    tabVideo.classList.remove('active');
    uploadAreaPhoto.classList.remove('hidden');
    uploadAreaVideo.classList.add('hidden');
  } else {
    tabVideo.classList.add('active');
    tabPhoto.classList.remove('active');
    uploadAreaVideo.classList.remove('hidden');
    uploadAreaPhoto.classList.add('hidden');
  }
}
tabPhoto.addEventListener('click', () => switchMediaTab('photo'));
tabVideo.addEventListener('click', () => switchMediaTab('video'));

// ── Photo select ──────────────────────────────────────────
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('⚠ Ảnh tối đa 10MB nhé!', 'warn'); return; }
  photoFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewWrap.classList.remove('hidden');
  uploadPlaceholder.style.display = 'none';
});
removePhotoBtn.addEventListener('click', e => { e.stopPropagation(); clearPhoto(); });
function clearPhoto() {
  photoFile = null;
  if (previewImg.src) URL.revokeObjectURL(previewImg.src);
  previewImg.src = '';
  previewWrap.classList.add('hidden');
  uploadPlaceholder.style.display = 'flex';
  photoInput.value = '';
}

// Drag & drop photo
uploadAreaPhoto.addEventListener('dragover',  e => { e.preventDefault(); uploadAreaPhoto.classList.add('dragover'); });
uploadAreaPhoto.addEventListener('dragleave', () => uploadAreaPhoto.classList.remove('dragover'));
uploadAreaPhoto.addEventListener('drop', e => {
  e.preventDefault(); uploadAreaPhoto.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith('image/')) { photoInput.files = makeFileList(file); photoInput.dispatchEvent(new Event('change')); }
});

// ── Video select ──────────────────────────────────────────
videoInput.addEventListener('change', () => {
  const file = videoInput.files[0];
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) { showToast('⚠ Video tối đa 100MB nhé!', 'warn'); return; }
  videoFile = file;
  previewVideo.src = URL.createObjectURL(file);
  videoPreviewWrap.classList.remove('hidden');
  videoPlaceholder.style.display = 'none';
  showToast(`🎬 Video sẵn sàng (${fmtSize(file.size)})`, 'info');
});
removeVideoBtn.addEventListener('click', e => { e.stopPropagation(); clearVideo(); });
function clearVideo() {
  videoFile = null;
  if (previewVideo.src) URL.revokeObjectURL(previewVideo.src);
  previewVideo.src = ''; previewVideo.load();
  videoPreviewWrap.classList.add('hidden');
  videoPlaceholder.style.display = 'flex';
  videoInput.value = '';
}

uploadAreaVideo.addEventListener('dragover',  e => { e.preventDefault(); uploadAreaVideo.classList.add('dragover'); });
uploadAreaVideo.addEventListener('dragleave', () => uploadAreaVideo.classList.remove('dragover'));
uploadAreaVideo.addEventListener('drop', e => {
  e.preventDefault(); uploadAreaVideo.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith('video/')) { videoInput.files = makeFileList(file); videoInput.dispatchEvent(new Event('change')); }
});

function makeFileList(file) {
  const dt = new DataTransfer(); dt.items.add(file); return dt.files;
}

// ── Char counter ──────────────────────────────────────────
messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 500`;
  charCount.style.color = len > 500 ? '#e04470' : '';
});

// ── Supabase: Load wishes ─────────────────────────────────
async function loadWishes() {
  showSkeletons();
  const { data, error } = await supabase
    .from('wishes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load error:', error);
    showToast('❌ Không tải được dữ liệu. Kiểm tra kết nối!', 'error');
    gallery.innerHTML = '';
    emptyState.classList.add('visible');
    return;
  }
  wishes = data || [];
  renderGallery();
}

// ── Supabase: Upload file to Storage ─────────────────────
async function uploadFile(file, bucket) {
  const ext  = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Supabase: Delete file from Storage ───────────────────
async function deleteFile(url, bucket) {
  if (!url) return;
  try {
    // Extract path from public URL
    const path = url.split(`/${bucket}/`)[1];
    if (path) await supabase.storage.from(bucket).remove([path]);
  } catch (e) {
    console.warn('Storage delete warning:', e);
  }
}

// ── Submit form  (optimistic update) ─────────────────────
const submitBtn = wishForm.querySelector('.btn-submit');

wishForm.addEventListener('submit', async e => {
  e.preventDefault();

  const sender   = document.getElementById('sender').value.trim();
  const receiver = 'Lớp 12A5';
  const message  = document.getElementById('message').value.trim();
  const color    = document.querySelector('input[name="cardColor"]:checked')?.value || 'pink';

  if (!sender) return;
  if (message.length > 500) { showToast('⚠ Lời chúc tối đa 500 ký tự!', 'warn'); return; }

  // ── 1. Tạo preview URL cục bộ để hiển thị ngay ──────────
  const localPhotoUrl = (mediaType === 'photo' && photoFile)
    ? URL.createObjectURL(photoFile) : null;
  const localVideoUrl = (mediaType === 'video' && videoFile)
    ? URL.createObjectURL(videoFile) : null;

  // ── 2. Tạo object tạm với id giả ────────────────────────
  const tempId = '_tmp_' + Date.now();
  const tempWish = {
    id: tempId,
    sender, receiver, message, color,
    photo_url: localPhotoUrl,
    video_url: localVideoUrl,
    created_at: new Date().toISOString(),
    _uploading: true,   // đang upload ngầm
  };

  // ── 3. Đưa lên UI ngay lập tức ──────────────────────────
  wishes.unshift(tempWish);
  renderGallery();
  modalOverlay.classList.remove('open');
  showToast('💌 Đã lưu! Đang đồng bộ lên server…', 'info');

  // ── 4. Upload ngầm ───────────────────────────────────────
  try {
    let photo_url = null;
    let video_url = null;

    if (mediaType === 'photo' && photoFile) {
      photo_url = await uploadFile(photoFile, PHOTO_BUCKET);
    }
    if (mediaType === 'video' && videoFile) {
      video_url = await uploadFile(videoFile, VIDEO_BUCKET);
    }

    // Insert vào DB
    const { data, error } = await supabase
      .from('wishes')
      .insert([{ sender, receiver, message, color, photo_url, video_url }])
      .select()
      .single();

    if (error) throw error;

    // ── 5. Thay thế item tạm bằng data thật từ DB ─────────
    const idx = wishes.findIndex(w => w.id === tempId);
    if (idx !== -1) wishes[idx] = data;
    else wishes.unshift(data);

    // Giải phóng object URL cục bộ
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);

    renderGallery();
    showToast('✅ Đồng bộ hoàn tất!', 'success');

  } catch (err) {
    console.error('Submit error:', err);

    // Rollback: xoá item tạm khỏi UI
    wishes = wishes.filter(w => w.id !== tempId);
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    renderGallery();

    showToast('❌ Lỗi đồng bộ: ' + (err.message || 'Thử lại nhé!'), 'error');
  }
});

// ── Delete wish ───────────────────────────────────────────
async function deleteWish(id, cardEl) {
  const wish = wishes.find(w => w.id === id);
  if (!wish) return;

  // Animate card out
  if (cardEl) {
    cardEl.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
    cardEl.style.transform  = 'scale(0.85)';
    cardEl.style.opacity    = '0';
  }

  try {
    // Delete from DB
    const { error } = await supabase.from('wishes').delete().eq('id', id);
    if (error) throw error;

    // Delete media files
    await Promise.all([
      deleteFile(wish.photo_url, PHOTO_BUCKET),
      deleteFile(wish.video_url, VIDEO_BUCKET),
    ]);

    wishes = wishes.filter(w => w.id !== id);
    setTimeout(() => renderGallery(), 280);
    showToast('🗑 Đã xoá lời chúc', 'info');

  } catch (err) {
    console.error('Delete error:', err);
    // Restore card
    if (cardEl) { cardEl.style.transform = ''; cardEl.style.opacity = ''; }
    showToast('❌ Xoá thất bại: ' + (err.message || ''), 'error');
  }

  if (viewingId === id) {
    const vEl = document.querySelector('#viewContent video');
    if (vEl) { vEl.pause(); }
    viewOverlay.classList.remove('open');
    viewingId = null;
  }
}

// ── Realtime subscription ─────────────────────────────────
supabase
  .channel('wishes-changes')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes' }, payload => {
    // Chỉ thêm nếu chưa có (tránh duplicate khi chính mình vừa thêm)
    if (!wishes.find(w => w.id === payload.new.id)) {
      wishes.unshift(payload.new);
      renderGallery();
      showToast('🌸 Có lời chúc mới vừa được thêm!', 'info');
    }
  })
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'wishes' }, payload => {
    if (wishes.find(w => w.id === payload.old.id)) {
      wishes = wishes.filter(w => w.id !== payload.old.id);
      renderGallery();
    }
  })
  .subscribe();

// ── Skeleton loader ───────────────────────────────────────
function showSkeletons() {
  gallery.innerHTML = Array(6).fill(0).map(() => `
    <div class="card-skeleton">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line sk-short"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-mid"></div>
      </div>
    </div>`).join('');
  emptyState.classList.remove('visible');
}

// ── Filtered list ─────────────────────────────────────────
function getFiltered() {
  return wishes
    .filter(w => activeFilter === 'all' || w.color === activeFilter)
    .filter(w => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return w.sender.toLowerCase().includes(q) ||
             w.receiver.toLowerCase().includes(q) ||
             w.message.toLowerCase().includes(q);
    });
}

// ── Render gallery ────────────────────────────────────────
const colorMap = {
  pink:     'linear-gradient(135deg,#ffe0ee,#ffc8de)',
  peach:    'linear-gradient(135deg,#ffe5cc,#ffcfaa)',
  mint:     'linear-gradient(135deg,#ccf5e4,#a8edcf)',
  sky:      'linear-gradient(135deg,#cfe8ff,#b0d8ff)',
  lavender: 'linear-gradient(135deg,#e8d3ff,#d4b0ff)',
  yellow:   'linear-gradient(135deg,#fff5b8,#ffec85)',
};

function renderGallery() {
  updateStats();
  const list = getFiltered();
  gallery.innerHTML = '';

  if (list.length === 0) { emptyState.classList.add('visible'); return; }
  emptyState.classList.remove('visible');

  list.forEach((w, idx) => {
    const card = document.createElement('div');
    card.className = `card ${w.color || 'pink'}`;
    card.dataset.id = w.id;
    card.style.animationDelay = `${idx * 0.055}s`;

    const av = initials(w.sender);

    let mediaHtml = '';
    if (w.video_url) {
      mediaHtml = `
        <div class="card-video-wrap">
          <div class="card-video-badge">▶ Video</div>
          <video class="card-video-thumb" src="${esc(w.video_url)}"
            muted playsinline preload="metadata" style="display:block"></video>
          <div class="card-play-btn">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>`;
    } else if (w.photo_url) {
      mediaHtml = `
        <div class="card-photo-wrap">
          <img class="card-photo" src="${esc(w.photo_url)}" alt="Ảnh" loading="lazy"/>
        </div>`;
    }

    card.innerHTML = `
      <button class="card-delete-btn" title="Xoá" aria-label="Xoá lời chúc">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </button>
      ${mediaHtml}
      <div class="card-body">
        <div class="card-message">${esc(w.message)}</div>
        <div class="card-footer">
          <div class="card-sender">
            <div class="card-sender-avatar">${av}</div>
            ${esc(w.sender)}
          </div>
          <div class="card-date">${fmt(w.created_at)}</div>
        </div>
      </div>
      ${w._uploading ? '<div class="card-syncing"><span class="syncing-dot"></span> Đang đồng bộ…</div>' : ''}
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.card-delete-btn')) return;
      openView(w.id);
    });
    card.querySelector('.card-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteWish(w.id, card);
    });

    gallery.appendChild(card);
  });
}

// ── Open add modal ────────────────────────────────────────
function openAddModal() {
  wishForm.reset();
  clearPhoto(); clearVideo();
  charCount.textContent = '0 / 500';
  document.querySelector('input[name="cardColor"][value="pink"]').checked = true;
  switchMediaTab('photo');
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>💌</span> Lưu Lời Chúc';
  modalOverlay.classList.add('open');
  setTimeout(() => document.getElementById('sender').focus(), 200);
}

btnOpen.addEventListener('click', openAddModal);
btnOpenEmpty.addEventListener('click', openAddModal);
btnClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
btnCancelForm.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });

// ── View modal ────────────────────────────────────────────
function openView(id) {
  const w = wishes.find(x => x.id === id);
  if (!w) return;
  viewingId = id;
  const av     = initials(w.sender);
  const accent = colorMap[w.color] || colorMap.pink;

  let mediaHtml = '';
  if (w.video_url) {
    mediaHtml = `<video class="view-video-full" src="${esc(w.video_url)}" controls playsinline
      preload="metadata" controlslist="nodownload"></video>`;
  } else if (w.photo_url) {
    mediaHtml = `<img class="view-photo-full" src="${esc(w.photo_url)}" alt="Ảnh kỷ niệm" />`;
  } else {
    mediaHtml = `<div style="height:14px;background:${accent};border-radius:var(--radius-xl) var(--radius-xl) 0 0;"></div>`;
  }

  document.getElementById('viewContent').innerHTML = `
    ${mediaHtml}
    <div class="view-body">
      <span class="view-quote-mark">"</span>
      <div class="view-message">${esc(w.message)}"</div>
    </div>
    <div class="view-footer">
      <div class="view-sender">
        <div class="view-avatar">${av}</div>
        <div>
          <div style="font-size:.72rem;color:#b07090;font-weight:400;margin-bottom:1px">Người gửi</div>
          ${esc(w.sender)}
        </div>
      </div>
      <div class="view-date">${fmt(w.created_at)}</div>
    </div>`;

  viewOverlay.classList.add('open');
}

function closeViewModal() {
  const vEl = document.querySelector('#viewContent video');
  if (vEl) vEl.pause();
  viewOverlay.classList.remove('open');
}

btnViewClose.addEventListener('click', closeViewModal);
viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) closeViewModal(); });

btnDelete.addEventListener('click', () => {
  if (!viewingId) return;
  const id = viewingId;
  closeViewModal();
  setTimeout(() => {
    deleteWish(id, document.querySelector(`.card[data-id="${id}"]`));
    viewingId = null;
  }, 180);
});

// ── Search ────────────────────────────────────────────────
searchBox.addEventListener('input', () => {
  searchQuery = searchBox.value.trim();
  renderGallery();
});

// ── Filter tabs ───────────────────────────────────────────
filterTabs.addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeFilter = tab.dataset.filter;
  renderGallery();
});

// ── Init ──────────────────────────────────────────────────
loadWishes();
