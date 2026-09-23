# Sistem Pembuatan Struktur Organisasi Otomatis

## Ringkasan

Web app mandiri untuk input data pegawai (Nama, Jabatan, Divisi, Foto, Jobdesk,
Atasan) yang otomatis menghasilkan diagram struktur organisasi (org chart)
interaktif, dengan kemampuan export ke PNG/PDF.

## Tujuan & Batasan

- Satu struktur organisasi (bukan multi-tenant/multi-perusahaan).
- Hierarki ditentukan eksplisit lewat field "melapor ke" (atasan), bukan
  disimpulkan dari nama jabatan.
- Divisi/Departemen adalah field informasi saja — tidak mempengaruhi bentuk
  pohon hierarki.
- Multi-user dengan dua role: Admin (kelola data) dan Viewer (lihat & export
  saja).
- Data disimpan permanen sendiri (database + file storage lokal), tidak
  tergantung akun/layanan eksternal.

## Arsitektur

- **Next.js 14+ (App Router, TypeScript)** — satu aplikasi untuk UI dan API
  routes (route handlers).
- **SQLite via Prisma ORM** — file database lokal (`prisma/dev.db`).
- **NextAuth (Auth.js), credentials provider** — login email/password, role
  disimpan di session (`ADMIN` | `VIEWER`).
- **Foto**: disimpan sebagai file di `/public/uploads/`, path-nya disimpan di
  kolom `fotoUrl` pada tabel `Person`.
- **Chart**: komponen React di atas `react-organizational-chart`, menyusun
  data flat `Person[]` menjadi struktur pohon bersarang berdasarkan
  `atasanId`.
- **Export**: `html-to-image` untuk render chart jadi PNG; PNG tersebut
  dimasukkan ke `jsPDF` untuk menghasilkan PDF.

## Data Model

### `Person`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string (cuid) | primary key |
| `nama` | string | wajib |
| `jabatan` | string | wajib |
| `divisi` | string? | opsional, label saja |
| `jobdesk` | text? | opsional |
| `fotoUrl` | string? | opsional, path ke `/uploads/...` |
| `atasanId` | string? (FK ke `Person.id`) | null = posisi puncak |
| `createdAt` / `updatedAt` | datetime | |

### `User`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string (cuid) | primary key |
| `email` | string | unik |
| `passwordHash` | string | |
| `role` | enum `ADMIN` \| `VIEWER` | |

## Halaman & Rute

- `/login` — form login.
- `/` — halaman chart. Tampilkan struktur organisasi sebagai pohon, tombol
  Export PNG dan Export PDF. Bisa diakses Admin & Viewer.
- `/orang` — daftar orang dalam bentuk tabel. Admin lihat tombol
  tambah/edit/hapus; Viewer read-only (tombol tidak ditampilkan).
- `/orang/baru` — form tambah orang. Admin only.
- `/orang/[id]/edit` — form edit orang. Admin only.

## API

- `GET /api/orang` — daftar semua orang.
- `POST /api/orang` — tambah orang baru (Admin only).
- `PATCH /api/orang/[id]` — update orang (Admin only).
- `DELETE /api/orang/[id]` — hapus orang (Admin only).
- `POST /api/upload` — upload foto, kembalikan path tersimpan (Admin only).

Semua endpoint tulis (`POST`/`PATCH`/`DELETE`) memvalidasi session role
`ADMIN` di server; request dari Viewer atau tanpa session ditolak dengan
403.

## Alur Kerja & Penanganan Error

- **Tambah/edit orang**: validasi wajib `nama` dan `jabatan` (client + server).
  `divisi`, `jobdesk`, `fotoUrl`, `atasanId` opsional.
- **Cegah siklus atasan**: sebelum menyimpan `atasanId`, server menelusuri
  rantai atasan dari kandidat atasan tersebut; jika rantai itu sampai ke
  orang yang sedang diedit, tolak dengan pesan error (agar tidak membuat
  loop di pohon hierarki).
- **Hapus orang yang punya bawahan**: tampilkan konfirmasi di UI; setelah
  konfirmasi, orang tersebut dihapus dan seluruh bawahan langsungnya
  (`atasanId` yang menunjuk ke dia) di-set `atasanId = null` (naik jadi
  posisi puncak), bukan ikut terhapus.
- **Upload foto**: validasi tipe file (`image/jpeg`, `image/png`) dan ukuran
  maksimal 5MB, di client (sebelum upload) dan server (sebelum simpan).
- **Akses ditolak**: Viewer yang mengakses halaman/endpoint Admin-only
  di-redirect ke `/` (halaman) atau menerima 403 (API).
- **Export gagal**: tangkap error dari `html-to-image`/`jsPDF`, tampilkan
  pesan error di UI tanpa membuat halaman crash.

## Testing

- **Unit test (Vitest)**:
  - Deteksi siklus saat set `atasanId` (fungsi murni, terpisah dari
    database).
  - Fungsi transformasi `Person[]` (flat, dengan `atasanId`) menjadi struktur
    pohon bersarang untuk komponen chart.
- **Manual/smoke test** sebelum dianggap selesai: login sebagai Admin dan
  Viewer, tambah/edit/hapus orang, upload foto, cek hak akses Viewer
  (tidak bisa tulis), export PNG, export PDF — dicek langsung di browser.
- Tidak menggunakan framework e2e (Playwright dll) untuk scope awal ini;
  bisa ditambahkan nanti jika diperlukan (YAGNI).

## Di Luar Scope (untuk versi ini)

- Multi-organisasi/multi-tenant.
- Pengelompokan visual per divisi di chart (divisi murni label).
- Role selain Admin/Viewer (mis. Editor bertingkat).
- Import massal via Excel/CSV (bisa jadi permintaan terpisah nanti).
