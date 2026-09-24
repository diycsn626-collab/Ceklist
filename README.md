# BKSI Audit App

Aplikasi PWA untuk checklist audit teknis SOP ASKON Engineering & HSE. Data master diambil dari workbook `Checklist_Audit_SOP_ASKON_Engineering_HSE(1).xlsx`.

## Fitur versi ini

- 29 SOP dan 59 butir audit dari file Excel sumber.
- Audit baru wajib memiliki judul.
- Judul audit dapat diedit setelah audit dibuat.
- Audit dapat ditambah dan dihapus.
- Scope Engineering, HSE, atau gabungan.
- Setiap butir `a / b / c / d` collapsed secara default. Klik panah/baris untuk membuka form.
- Hasil: Ada/Sesuai, Tidak Ada/Tidak Sesuai, atau N/A.
- Temuan/keterangan, PIC, dan catatan per butir.
- Evidence foto per butir. Maksimal 5 foto, 8 MB per foto.
- Evidence tersimpan di IndexedDB sehingga tetap ada saat offline.
- PWA/service worker untuk penggunaan offline setelah aplikasi pernah dibuka.
- Dashboard progress dan tingkat kesesuaian.
- Ekspor audit ke CSV yang dapat dibuka dengan Excel.
- Supabase opsional untuk login dan sinkronisasi HP/laptop, termasuk evidence Storage.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka alamat yang tampil di terminal, biasanya `http://localhost:5173`.

## Build production

```bash
npm run build
npm run preview
```

Folder hasil build: `dist/`.


## Deploy langsung ke GitHub Pages

Repo ini sudah dilengkapi workflow `.github/workflows/deploy-pages.yml`.

1. Buat repository GitHub kosong, misalnya `bksi-audit-app`.
2. Upload/push seluruh isi project ke branch `main`.
3. Buka `Settings > Pages` pada repository.
4. Pada `Build and deployment`, pilih **GitHub Actions**.
5. Push ke `main`. Workflow akan build dan publish otomatis.
6. URL akan berbentuk `https://USERNAME.github.io/NAMA-REPO/`.

Konfigurasi Vite membaca nama repository dari environment GitHub Actions, sehingga base path GitHub Pages menyesuaikan otomatis.

> Catatan: bila sinkronisasi Supabase diaktifkan, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` sebagai repository variables/secrets dan expose ke langkah Build sesuai kebutuhan deployment internal. Untuk deployment publik, tetap gunakan RLS dan hanya publishable/anon key pada frontend.

## Deploy GitHub -> Vercel

1. Buat repository GitHub private, misalnya `bksi-audit-app`.
2. Upload seluruh isi folder project ini ke repository.
3. Di Vercel pilih `Add New > Project` lalu import repository tersebut.
4. Framework akan terdeteksi sebagai Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Deploy.

Tanpa Supabase, aplikasi tetap dapat dipakai online dan offline tetapi data hanya tersimpan pada perangkat/browser yang digunakan.

## Mengaktifkan sinkronisasi Supabase

1. Buat project Supabase.
2. Jalankan `supabase/schema.sql` di SQL Editor.
3. Di Authentication, buat user internal atau aktifkan metode auth sesuai kebijakan perusahaan.
4. Tambahkan Environment Variables di Vercel:

```text
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=xxxxx
```

5. Redeploy Vercel.
6. Buka menu `Cloud & Sync`, login, lalu tekan `Sinkronkan Sekarang`.

## Bagian yang mudah diedit manual

### Warna BKSI
Edit variable di `src/styles.css`:

```css
--green: #24513c;
--brown: #8a6748;
```

### Logo
Ganti file `public/logo-bksi.svg` dengan logo resmi. Pertahankan nama file tersebut agar tidak perlu mengubah kode.

### Nama aplikasi / menu
Edit `src/App.tsx`.

### Master checklist
Data hasil ekstraksi Excel berada di `src/data/checklist.json`.

### Batas evidence
Edit di bagian atas `src/App.tsx`:

```ts
const MAX_FILES = 5
const MAX_FILE_SIZE = 8 * 1024 * 1024
```

## Catatan keamanan

- Jangan commit file `.env` atau Supabase service role key ke GitHub.
- Frontend hanya menggunakan Supabase publishable/anon key dan Row Level Security.
- Gunakan repository private untuk proyek internal.
- Bucket evidence dibuat private pada schema Supabase.

## Struktur utama

```text
src/
  App.tsx
  styles.css
  types.ts
  data/checklist.json
  lib/db.ts
  lib/supabase.ts
  lib/utils.ts
public/
  logo-bksi.svg
  manifest.webmanifest
  sw.js
supabase/
  schema.sql
```
