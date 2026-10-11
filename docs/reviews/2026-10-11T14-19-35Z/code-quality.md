# Kod Kalitesi — Birleşik Rapor (`frontend`)

Kaynak: `batches/001.md`…`016.md` (project-reviewer, phase=code) ve `architecture.md`. Bu dosya bulguları **kök nedene göre** gruplar ve tekrarları birleştirir; her bulgunun tam kanıtı (path:line, tetikleyici, onarım) ilgili batch dosyasındadır. Önem/güven değerleri batch'lerden aynen alınmıştır. Sayısal kalite skoru, borç süresi veya coverage yüzdesi üretilmemiştir.

## 1. Proje dosyası, kalıcılık ve durum sahipliği
Kök neden: proje kapsamlı veri tek bir sahipte değil; ~20 modül doğrudan `localStorage`'a yazıyor, `window` olaylarıyla senkronize oluyor ve `.kopruq` dosyası bu verinin yalnızca bir kısmını taşıyor.

| ID | Önem | Özet |
|---|---|---|
| A-01 | CRITICAL | Proje dosyası girder library, span kuralları, seismic/wind/temperature girdileri, cross-section, self-weight'i taşımıyor; projeler arası sızıntı ve kayıp |
| C-013-02 | MAJOR | Açma yarıda hata verirse `ref` eski dosyada kalıyor; Save yeni projeyi önceki dosyanın üzerine yazabiliyor |
| C-013-01 | MAJOR | `.kopruq` yalnızca zarf düzeyinde doğrulanıyor; bozuk içerik depoya yazılıp render'da çöküyor |
| C-013-03 | MAJOR | Son projeler dosya adıyla anahtarlı; aynı adlı farklı dosya yanlış handle ile açılıyor |
| A-07 | MAJOR | Repository ve dirty takibi atlanıyor; anahtar/olay adları tekrarlı |
| C-010-03 | MAJOR | Sekme değişince Self Weight ve LM1 override'ları kayboluyor |
| C-010-04 | MAJOR | Wind sonucu girdilerden kopuk; rapor yeni girdi + eski sonuç |
| C-011-06 | MAJOR | Preferred Span kuralları varyant değişince kalıcı siliniyor |
| C-011-07 | MAJOR | Dashboard'da sabit gerçek proje kimliği; proje durumundan kopuk |
| C-012-02 | MAJOR | Edit modunda birim değişikliği Save ile geri alınıyor |
| C-001-05, C-013-04, C-014-01 | MINOR | New Project atomik değil; download yedeği doğrulanmadan "kaydedildi"; Save sırasında dirty yanlış temizleniyor |
| C-003-03, C-004-08, C-007-07 | MINOR | Render/mount/gezinme sırasında depoya yazma ve sahte dirty |
| C-003-05, C-013-05 | MINOR | Seçili köprü / aks koordinatları dış değişimde senkronlanmıyor |

## 2. Köprü kimliği (`no` vs `id`)
| ID | Önem | Özet |
|---|---|---|
| A-02 | MAJOR | Bridge Definition ve family referansları görünen `no` ile anahtarlı; yeniden adlandırmada tanım siliniyor |
| C-011-02 | MAJOR | Excel import tabloyu onaysız değiştiriyor; tekrar eden `no` kontrol edilmiyor |
| C-003-02 | MAJOR | Span metni yalnızca `no` değişince senkronlanıyor; dış değişiklik ezilebiliyor |
| C-012-09 | MINOR | Manuel Add/Edit formunda doğrulama yok, aynı `no` kabul |

## 3. Mühendislik hesabı doğruluğu (mühendis teyidi gerekir; değerler uydurulmamalı)
| ID | Önem | Özet |
|---|---|---|
| C-005-01 | MAJOR | Precast `Wy` = `Iy/(2·bmax)`, steel `Iy/(bmax/2)`: 4 kat fark (işlem önceliği) |
| C-006-01 | MAJOR | Oval pier Wx/Wy yer değiştirmiş |
| C-004-01 | MAJOR | Bearing dönme rijitlikleri öteleme gibi dönüştürülüyor (mm'de 1000 kat) |
| A-05 + C-005-02 | MAJOR | Precast anahtar sözlüğü uyumsuz → NaN kesit özellikleri, yine de `VALID` |
| C-005-03 | MAJOR | Assembly bileşen durumlarını yok sayıyor; A2 sessizce A1 kopyası |
| C-005-04 | MAJOR | Abutment eksik alt flanş için üst flanş/0; steel'de NaN |
| C-008-02 | MAJOR | Superstructure canvas'ta e kuralı kopya, hata mesajı ters ("e yeterli"), birim yok sayılıyor |
| C-008-03 | MAJOR | Box pier şeması olmayan `w` anahtarını okuyor, t hep 0,30 m |
| C-016-01 | MAJOR | `generateValues` 0,01 ızgarasına yuvarlıyor (0,125 → 0,13 m), küçük deltada yinelenen aday |
| C-004-05, C-006-08 | MINOR | B = D oval çizilmiyor; span istasyonları kayan nokta birikimi |
| C-004-06, C-012-06 | MINOR | Temel Lx/Ly ekseni tutarsız; overhang ölçüsü s/2 farklı |

## 4. Bayat sonuçların geçerli gösterilmesi
| ID | Önem | Özet |
|---|---|---|
| C-006-02 | MAJOR | Parmak izi proje birimlerini içermiyor |
| C-006-03 | MAJOR | Düğüm SUCCESS durumu yukarı akış/bağlantı değişikliklerini yok sayıyor |
| C-006-04 | MAJOR | Family snapshot tazeliği uygulanmıyor/gösterilmiyor (H-08 doğrulandı) |
| C-008-01 | MAJOR | Düzenlemeden sonra son Run çıktıları geçersizleşmiyor (Abutment eski sismik durum) |
| C-007-04 | MAJOR | Inspector FAMILY aday durumunu yok sayıyor, önizleme hatası yutuluyor |
| C-008-05, C-008-06 | MINOR | Başlık/alt durum çelişkisi; Run sırasında graf değişince eski sonuç yazılıyor |

## 5. Birim tutarlılığı
| ID | Önem | Özet |
|---|---|---|
| C-003-01 | MAJOR | Family parametre tablosu metre değerini yerel birim etiketiyle gösteriyor |
| C-007-03 | MAJOR | Range editörü kanonik olmayan birimde iki kez dönüştürüyor |
| C-012-01 | MAJOR | Proje birim varsayılanları etiket (`kN·m`); Inspector dönme rijitliği girişi istisna atıyor |
| A-10 | MAJOR | Girder library cm, bearing mm saklıyor (SI kuralı) |
| C-004-04, C-007-10, C-006-06, C-014-07 | MINOR | Birimsiz başlıklar, sabit "m", tutarsız hassasiyet politikası |

## 6. Tekrarlanan domain kuralları ve kaynaksız mühendislik sabitleri
| ID | Önem | Özet |
|---|---|---|
| A-03 | MAJOR | Lx/Ly, sweep ve B/D yönü Graph ile Family Tables'ta ayrı/ters |
| A-04 | MAJOR | `nodeRegistry.ts` god object; önizleme ve executor ayrışmış |
| A-06 | MAJOR | Eşikler/sabitler frontend'de ve kaynaksız (ek kanıt 005/006/007/010/015) |
| C-004-02 | MAJOR | Girder Library aralıkları "mühendisin verdiği tek değerler" dokümanıyla çelişiyor |
| C-011-03 | MAJOR | Import/yeni köprülere kaynaksız varsayılanlar işaretsiz atanıyor |
| C-007-01 | MAJOR | Girder span/family parametreleri UI'dan düzenlenemiyor (belgesiz varsayılanlar kalıyor) |
| C-007-02 | MAJOR | Port uyumluluğu eksik; Span Arrangement/Abutment/Assembly bağlanamıyor |
| C-005-05, C-005-06, C-004-07, C-007-05, C-007-06 | MINOR | Önizleme döngüsü 4 kez, Kartezyen üreteç 6 kez, malzeme çözümleme 9 kez kopya |

## 7. Girdi doğrulama
| ID | Önem | Özet |
|---|---|---|
| C-011-01 | MAJOR | Excel import sayısal alanları sessizce bozuyor ("13,8" → 13, geçersiz → 0) |
| C-012-05 | MAJOR | Kesit girdileri doğrulanmıyor; negatif carriageway yüke akıyor |
| C-010-02 | MAJOR | LM1 α ondalık yazılamıyor, boş → α=0 override |
| C-011-04, C-011-05 | MAJOR | Boş katalogda Pier Cap eklenemiyor; iki kolon aralığı girilemiyor |
| C-002-04 | MAJOR | Bearing panelinde sınırsız Kartezyen üretim render'da (H-02) |
| C-003-06, C-009-02, C-009-04, C-011-11, C-015-05, C-002-05 | MINOR | Sayısal sağlık kontrolleri, görünmeyen hata, tekrar eden ID, virgül reddi |

## 8. HTTP ve hata yönetimi
| ID | Önem | Özet |
|---|---|---|
| A-09 | MAJOR | Ortak HTTP katmanı yok; `localhost:8080` 9+ modülde, `ok`/iptal/şema yok |
| C-010-01 | MAJOR | Seismic/Temperature yanıt yarışı, hata ve boş girdide eski sonuç (H-04 doğrulandı) |
| C-012-04 | MAJOR | AlignmentOverlay her nokta için istek, hata yutuluyor |
| C-009-01, C-012-03 | MAJOR | LandXML CRS etiketi eziliyor; DTM yolunda projectId/CRS/alignment kayboluyor |
| C-001-01 | MAJOR | Save/Save As hatası gösterilmiyor |
| C-010-05 | MINOR | Render'da try/catch'siz `JSON.parse`, ErrorBoundary yok (H-06 doğrulandı) |
| C-001-03, C-002-06, C-002-07, C-009-03 | MINOR | Yanlış diyalog, yutulan kayıt hatası, yanıltıcı "backend running?" mesajı |

## 9. Katman ihlalleri ve ölü kod
A-08 (MAJOR, shared → features, features → app), A-13, C-001-04, C-001-06, C-001-07, C-002-03, C-002-08, C-003-04, C-003-07, C-008-04, C-011-08, C-011-09, C-011-10, C-012-07, C-012-08, C-012-10, C-014-02, C-014-03, C-014-04, C-014-05, C-015-01, C-015-02, C-015-03, C-015-04, C-015-06 (MINOR); INFO: C-001-09, C-002-09, C-003-08, C-004-09, C-005-07, C-006-09, C-007-12, C-008-08, C-009-05, C-010-07, C-012-11, C-013-06, C-015-07, A-16. Ölü dosyalar silinmeden önce kullanıcı kararı gerekir (doküman bazılarını "bilerek tutuldu" diyor).

## 10. Stil
A-14 (MINOR) ve C-002-01 (MAJOR): `App.css` 325 KB, aynı seçiciler 3–12 kez yeniden tanımlı, özgüllük tırmanması; C-002-02 (MAJOR): global `.spn-card *` !important doğrulama hata metinlerini griye çeviriyor; C-002-03 ölü seçiciler.

## 11. Okunabilirlik
C-001-08 ve tekrar eden kanıtlar: birçok bileşen/registry tanımı tek satıra sıkıştırılmış (diff/blame/oxlint konumları kolon numarasıyla); A-12 `strict` kapalı; A-15 kullanıcıya görünen mojibake (en az 10 dosya).

## 12. Testler
Başarısız 26 testin kök nedenleri (batch 001, 007, 008):

| Grup | Kök neden | Sınıf |
|---|---|---|
| `App.test.tsx` Family Workspace | UI değişmiş, beklenti güncellenmemiş (C-001-02) | Bayat test |
| BaseNode (3), EditableNumericInput (3), NodeInspector (1), EngineeringNodeShell circular (1) | `type="number"` → `spinbutton` ve sayısal değer (C-007-11) | Bayat test |
| NodeInspector (7), ListOutputNode (4) | Varsayılan uzunluk hassasiyeti m→4, mm→0 ondalık (`quantities.ts:28`, C-006-06); H-section'da etiket adı | Bayat test (hassasiyet politikası ürün kararı) |
| EngineeringNodeShell B/D semantic (3) | Detay butonu ve `data-dimension` artık üretilmiyor (C-008-04) | Bayat test |
| EngineeringNodeShell rectangular/box/h_section units (3) | Registry "Longitudinal Length (B)", test ve doküman "B - Transverse" | **Sözleşme çelişkisi (A-03)** — mühendis kararı |

Ek test kalitesi sorunları: C-014-06 (totolojik testler), testlerin hatalı sözleşmeyi sabitlemesi (`girderCandidates.test.ts`, `nodeRegistry.test.ts:56`, `abutmentCandidates.test.ts:15-16`, `registry.test.ts:14-18`), test izolasyonu (HC-001-d + batch 016 kanıtı). Testi olmayan alanlar: `loads/`, `landxml-import`, `GraphWorkspace`, `BridgeDefinitionWorkspace`, `excelImport`, proje dosyası A-01 round-trip, `legacyStorageMigration`.
