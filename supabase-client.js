// ============================================================
// mottool — Supabase 공유 클라이언트
// ============================================================
// index.html / admin.html 양쪽에서 로드.
// supabase-js v2 CDN 이 먼저 로드되어 있어야 함.
// ============================================================

(function () {
  if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || window.SUPABASE_CONFIG.url.includes('YOUR-PROJECT-REF')) {
    console.warn('[mottool] supabase-config.js 가 설정되지 않았습니다. books.json 로 폴백합니다.');
    window.MOTTOOL_DB = null;
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[mottool] supabase-js CDN 이 먼저 로드되어야 합니다.');
    window.MOTTOOL_DB = null;
    return;
  }

  const sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey,
    {
      auth: { persistSession: true, autoRefreshToken: true }
    }
  );

  // ── DB row → 사이트가 쓰던 책 객체 형태로 변환 ───────────
  function rowToBook(r) {
    const cover = r.cover_type === 'image'
      ? { type: 'image', src: r.cover_src }
      : { type: 'color', value: r.cover_value || '#eee', ...(r.cover_border ? { border: r.cover_border } : {}) };
    return {
      id:           r.id,
      slug:         r.slug,
      title:        r.title,
      author:       r.author_name,
      authorMeta:   r.author_meta,
      category:     r.category,
      categorySlug: r.category_slug,
      publisher:    r.publisher_name,
      year:         r.year,
      piece:        r.piece,
      price:        r.price,
      priceKrw:     r.price_krw,
      sold:         r.sold,
      visible:      r.visible,
      featured:     r.featured,
      cover,
      detail:       r.detail || null,
      position:     r.position
    };
  }

  // ── 사이트용 책 객체 → DB row ────────────────────────────
  function bookToRow(b) {
    const cover = b.cover || { type: 'color', value: '#eee' };
    return {
      id:             b.id,
      slug:           b.slug || null,
      title:          b.title,
      author_name:    b.author || null,
      author_meta:    b.authorMeta || null,
      publisher_name: b.publisher || null,
      category:       b.category || null,
      category_slug:  b.categorySlug || null,
      year:           b.year || null,
      piece:          Number.isFinite(b.piece) ? b.piece : 0,
      price:          b.price || 'price soon',
      price_krw:      b.priceKrw || null,
      sold:           !!b.sold,
      visible:        b.visible !== false,
      featured:       !!b.featured,
      cover_type:     cover.type || 'color',
      cover_value:    cover.value || null,
      cover_src:      cover.src || null,
      cover_border:   cover.border || null,
      detail:         b.detail || {},
      position:       Number.isFinite(b.position) ? b.position : 0
    };
  }

  window.MOTTOOL_DB = {
    sb,

    // ── 책 ─────────────────────────────────────────
    async listBooks({ all = false } = {}) {
      let q = sb.from('books').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
      if (!all) q = q.eq('visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return data.map(rowToBook);
    },

    async getBook(id) {
      const { data, error } = await sb.from('books').select('*').eq('id', id).single();
      if (error) throw error;
      return rowToBook(data);
    },

    async upsertBook(book) {
      const row = bookToRow(book);
      const { data, error } = await sb.from('books').upsert(row, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return rowToBook(data);
    },

    async deleteBook(id) {
      const { error } = await sb.from('books').delete().eq('id', id);
      if (error) throw error;
    },

    async adjustPiece(id, delta) {
      const { data: cur, error: e1 } = await sb.from('books').select('piece, sold').eq('id', id).single();
      if (e1) throw e1;
      const next = Math.max(0, (cur.piece || 0) + delta);
      const sold = next === 0 ? true : cur.sold;
      const { error: e2 } = await sb.from('books').update({ piece: next, sold }).eq('id', id);
      if (e2) throw e2;
      return next;
    },

    // ── 카테고리 ────────────────────────────────────
    async listCategories() {
      const { data, error } = await sb.from('categories').select('*').order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
    async upsertCategory(c) {
      const { data, error } = await sb.from('categories').upsert(c, { onConflict: 'slug' }).select().single();
      if (error) throw error;
      return data;
    },
    async deleteCategory(slug) {
      const { error } = await sb.from('categories').delete().eq('slug', slug);
      if (error) throw error;
    },
    async moveBookToCategory(bookId, categorySlug) {
      const { error } = await sb.from('books').update({ category_slug: categorySlug || null }).eq('id', bookId);
      if (error) throw error;
    },
    async reorderCategories(slugs) {
      // slugs is array in desired order
      const updates = slugs.map((slug, position) =>
        sb.from('categories').update({ position }).eq('slug', slug)
      );
      await Promise.all(updates);
    },

    // ── 출판사 / 저자 ──────────────────────────────
    async listPublishers() {
      const { data, error } = await sb.from('publishers').select('*').order('name');
      if (error) throw error;
      return data;
    },
    async upsertPublisher(p) {
      const { data, error } = await sb.from('publishers').upsert(p, { onConflict: 'name' }).select().single();
      if (error) throw error;
      return data;
    },
    async deletePublisher(id) {
      const { error } = await sb.from('publishers').delete().eq('id', id);
      if (error) throw error;
    },
    async listAuthors() {
      const { data, error } = await sb.from('authors').select('*').order('name');
      if (error) throw error;
      return data;
    },
    async upsertAuthor(a) {
      const { data, error } = await sb.from('authors').upsert(a, { onConflict: 'name' }).select().single();
      if (error) throw error;
      return data;
    },
    async deleteAuthor(id) {
      const { error } = await sb.from('authors').delete().eq('id', id);
      if (error) throw error;
    },

    // ── 주문 ────────────────────────────────────────
    async listOrders({ status } = {}) {
      let q = sb.from('orders').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async upsertOrder(o) {
      const { data, error } = await sb.from('orders').upsert(o).select().single();
      if (error) throw error;
      return data;
    },
    async updateOrderStatus(id, status, extra = {}) {
      const patch = { status, ...extra };
      if (status === 'paid' && !extra.paid_at) patch.paid_at = new Date().toISOString();
      if (status === 'shipped' && !extra.shipped_at) patch.shipped_at = new Date().toISOString();
      const { error } = await sb.from('orders').update(patch).eq('id', id);
      if (error) throw error;
    },
    async deleteOrder(id) {
      const { error } = await sb.from('orders').delete().eq('id', id);
      if (error) throw error;
    },

    // ── 문의 ────────────────────────────────────────
    async listInquiries({ status } = {}) {
      let q = sb.from('inquiries').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async upsertInquiry(i) {
      const { data, error } = await sb.from('inquiries').upsert(i).select().single();
      if (error) throw error;
      return data;
    },
    async deleteInquiry(id) {
      const { error } = await sb.from('inquiries').delete().eq('id', id);
      if (error) throw error;
    },

    // ── 대기 리스트 ────────────────────────────────
    async listWaitlist(book_id) {
      let q = sb.from('waitlist').select('*').order('created_at', { ascending: true });
      if (book_id) q = q.eq('book_id', book_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async addWaitlist(w) {
      const { data, error } = await sb.from('waitlist').insert(w).select().single();
      if (error) throw error;
      return data;
    },
    async deleteWaitlist(id) {
      const { error } = await sb.from('waitlist').delete().eq('id', id);
      if (error) throw error;
    },

    // ── 사이트 설정 ────────────────────────────────
    async getConfig(key) {
      const { data, error } = await sb.from('site_config').select('value').eq('key', key).maybeSingle();
      if (error) throw error;
      return data ? data.value : null;
    },
    async setConfig(key, value) {
      const { error } = await sb.from('site_config').upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async listConfig() {
      const { data, error } = await sb.from('site_config').select('*');
      if (error) throw error;
      const obj = {};
      data.forEach(r => { obj[r.key] = r.value; });
      return obj;
    },

    // ── Storage (book-images 버킷) ─────────────────
    async uploadImage(file, path) {
      // 파일명에서 한글/특수문자 제거 (Storage 호환성)
      const safeName = (file.name || 'image')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // 악센트 제거
        .replace(/[^a-zA-Z0-9._-]/g, '_')                   // 영숫자·점·언더바·하이픈만 허용
        .replace(/_+/g, '_')
        .toLowerCase();
      const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
      const base = safeName.replace(/\.[^.]+$/, '').slice(0, 40) || 'img';
      const key = path
        ? path.replace(/[^a-zA-Z0-9._/-]/g, '_').replace(/_+/g, '_')
        : `${Date.now()}-${base}.${ext}`;
      const { data: up, error } = await sb.storage.from('book-images').upload(key, file, {
        upsert: true,
        contentType: file.type || `image/${ext}`,
        cacheControl: '3600'
      });
      if (error) {
        console.error('[uploadImage] error', error);
        throw new Error(error.message || '업로드 실패');
      }
      const { data } = sb.storage.from('book-images').getPublicUrl(up?.path || key);
      return data.publicUrl;
    },
    async deleteImage(path) {
      const { error } = await sb.storage.from('book-images').remove([path]);
      if (error) throw error;
    },

    // ── Web Push 구독 ───────────────────────────────
    async savePushSubscription(sub, userEmail) {
      const json = sub.toJSON();
      const row = {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_email: userEmail || null,
        device_info: navigator.userAgent.slice(0, 200)
      };
      const { error } = await sb.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
      if (error) throw error;
    },
    async deletePushSubscription(endpoint) {
      const { error } = await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) throw error;
    },

    // ── 인증 ────────────────────────────────────────
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async getUser() {
      const { data } = await sb.auth.getUser();
      return data.user;
    },
    onAuthChange(cb) {
      return sb.auth.onAuthStateChange((_evt, session) => cb(session?.user || null));
    }
  };
})();
