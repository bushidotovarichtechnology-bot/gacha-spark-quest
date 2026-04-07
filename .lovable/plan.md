## Phase 1: Database Setup
1. **Tabel `user_roles`** — role system (admin/user) dengan security definer function
2. **Tabel `campaigns`** — data kampanye (title, image_url, price, description, is_active)
3. **Tabel `campaign_tiers`** — tier per kampanye (label S/A/B/C, name, remaining, total, probability_weight)
4. **Tabel `tier_prizes`** — hadiah per tier (name)
5. RLS policies untuk semua tabel

## Phase 2: Admin Authentication
- Halaman login admin terpisah (`/admin/login`)
- Cek role admin via `has_role()` security definer function
- Protected admin routes

## Phase 3: Admin Dashboard
- **Dashboard stats** — total users, total draws, total campaigns
- **User management** — lihat daftar user, assign/remove admin role
- **Campaign CRUD** — tambah, edit, hapus kampanye + tier + hadiah
- **Probability settings** — atur probability_weight per tier di setiap kampanye

## Phase 4: Frontend Migration
- Update halaman Index dan CampaignDetail untuk mengambil data dari database
- Tetap backward-compatible dengan data yang sudah ada di localStorage

## Catatan
- Admin pertama perlu di-assign manual via database (SQL insert)
- Semua akses admin diverifikasi server-side via RLS + security definer function