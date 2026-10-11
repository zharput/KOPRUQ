# Kod Kalitesi — Birleşik Rapor (`backend`)

Kaynak: `architecture.md` (F-01…F-19) ve `batches/001.md`…`012.md` (C-0NN-xx). Bulgular **kök nedene göre** gruplanmış ve tekrarlar birleştirilmiştir; tam kanıt (path:line, tetikleyici, onarım, doğrulama) ilgili dosyadadır. Önem/güven değerleri kaynaktan aynen alınmıştır. Mimari hedef: `docs/architecture/backend-reference.md` (R1–R16). Analyzer çalıştırılmadı; sayısal metrik üretilmedi.

## 1. Girdi doğrulama ve domain değişmezleri (R5, R8)
Kök neden: Bean Validation yok, primitive alanlar eksikse 0 oluyor, domain record'ları ve modeller değişmez taşımıyor, NaN karşılaştırmaları kontrolleri sessizce atlatıyor.

| ID | Önem | Özet |
|---|---|---|
| F-01 | CRITICAL | Eksik primitive JSON alanları 0 olarak hesaplamaya giriyor (FastSolver SDL/fck/bearing) |
| C-005-01 | MAJOR | `Bridge`/`Deck` değişmezsiz; negatif/NaN/sıfır köprü 200 ile kabul |
| C-006-02 | MAJOR | NaN `BridgeSite`/`LayoutDesignSpace`/`NoPierZone` doğrulamayı geçiyor; yasak bölge sessizce devre dışı |
| C-002-02 | MAJOR | Port record'ları ve çözücü geçersiz kesit/rijitlik/kimliği kabul ediyor |
| C-002-04 | MAJOR | `EurocodeConcrete` aralık denetlemiyor; fck=0 makul Ecm üretiyor |
| C-001-01, C-001-05 | MAJOR | `Alignment` ve `VerticalProfile` geometri değişmezleri yok; profil aralık dışında sessiz ekstrapolasyon |
| C-008-03 | MAJOR | LandXML hizalama/profil sayıları `parseDouble` ile; NaN/Infinity kabul, tek token 500 |
| C-012-01 | MAJOR | Rüzgâr/sıcaklık NaN, negatif `ze`, sıfır genişlikte "VALID" |
| C-011-02 | MAJOR | Dar/negatif taşıt yolunda uyarı yok; 1e308 → OOM |
| C-001-02, C-003-02, C-009-05, C-010-03, C-012-04 | MINOR | NaN istasyon/sorgu, yinelenen kimlik, kural sözleşmesi, hata/uyarı karışımı |

## 2. Mühendislik güvenliği ve provenans (R10; CLAUDE.md "never invent")
Kök neden: Sessiz varsayılanlar, kaynaksız sabitler, "değerlendirilmedi" durumunun olmaması; formüller madde/birim/doğrulama örneği/test olmadan.

| ID | Önem | Özet |
|---|---|---|
| F-02 | CRITICAL | Deprem spektrumu tanınmayan/null tipte sessizce Tip 1, "VALID" |
| C-011-01 | MAJOR | Zemin sınıfı `indexOf` alt dizge eşlemesi; `""` → A, "VALID" |
| F-08 | MAJOR | Rüzgâr/deprem/sıcaklık belgesiz uçlar, yanlış modül, testsiz formüller |
| F-09 | MAJOR | LM1 değerleri kod/belge/test çelişkisi |
| F-10 | MAJOR | Kural yokken `feasible=true`; `NOT_EVALUATED` yok (kök `RuleEvaluation` boolean, C-009) |
| C-005-03 | MAJOR | Boş/eksik LM1 satırları "çözümlendi"; istemci provenansı doğrulanmıyor |
| C-012-02, C-012-03 | MAJOR | Rüzgâr örtük varsayımları görünmüyor, `b/d` etkisiz; sıcaklık provenans/durum alanları sabit ve çelişkili |
| C-007-02 | MAJOR | `CrsStatus.RESOLVED` doğrulanmış CRS değil; commit dosya CRS'sini atıyor |
| C-001-04, C-008-02 | MAJOR | `ParaCurve` atlanıyor, `CircCurve` parabol; eğri PVI konumu okunmuyor |
| C-004-01, C-010-01 | MAJOR | XYZ import birimsiz, virgül/BOM/ID sütunu bozuk veri; aynı (x,y) farklı z sessizce eleniyor |
| C-008-05 | MAJOR | Gizli yüzler/`PntList3D` dışı sınırlar kayboluyor; VOID'de kot dönüyor |
| C-007-01, C-004-04, C-011-04, C-002-07 | MINOR | `spacingM=0`, adım varsayılanı belgeleri, provenans kaynağı/birimi, g sabiti kaynaksız |

## 3. Analiz portu ve adapter sözleşmesi (R6, R9)
| ID | Önem | Özet |
|---|---|---|
| F-06 | MAJOR | Port MIDAS sözlüğü taşıyor; `MidasModelBuilder` elastik link ve yayılı yükü sessizce yok sayıyor |
| C-002-03 | MAJOR | Yük durumu native motorda yok sayılıyor, sonuçlar durum anahtarsız (H-002-02 → MIDAS tarafı doğrulandı) |
| C-009-01 | MAJOR | MIDAS sonuçlarında birim/sütun doğrulanmıyor; oturum birimi farklıysa 10³ sapma `COMPLETED` |
| C-009-02 | MAJOR | Tek MIDAS oturumu eşzamanlılığa karşı korunmuyor |
| C-002-01 | MAJOR | Mutlak tekillik eşiği; NaN/Inf sonuç `COMPLETED` |
| F-14 | MAJOR | Port/API sınırında birimler belirsiz |
| F-19, C-003-03, C-009-03, C-009-04, C-002-06 | MINOR | `EurocodeConcrete` port modülünde; eksen süreksizliği; MIDAS zaman aşımı; ham yanıt mesajda; bayat port javadoc'u |

## 4. Kaynak tüketimi ve hesaplama limitleri (R10 `GenerationLimits` karşılığı yok)
| ID | Önem | Özet |
|---|---|---|
| C-005-02 | MAJOR | `feasibleSpanCounts` int taşması → bitmeyen döngü (koordinatör doğruladı) |
| C-006-01 | MAJOR | Kayan noktalı adım döngüleri ilerlemiyor → sonsuz döngü/OOM |
| F-07 | MAJOR | Adım/örnek/açıklık/upload limiti yok |
| F-03, F-11 | MAJOR | Sınırsız job map ve in-memory repository'ler |
| C-008-04 | MAJOR | LandXML sonuç tamamen bellekte; inspect tüm yüzeyleri yüklüyor (H-02 mekanizması) |
| C-005-04 | MINOR | Kullanılmayan JSON `/mesh` ucu tam mesh dizileri üretiyor |

## 5. Katmanlama, sorumluluk ve bağlama (R1, R2, R12)
| ID | Önem | Özet |
|---|---|---|
| F-05 | MAJOR | Yapısal modelleme ve denge kontrolü `api`'de; kontrol çözücüden farklı yorumluyor (C-003 ek kanıt) |
| F-13 | MAJOR | Controller'da orkestrasyon ve tekrar (örnekleme, local-origin, OUTER/VOID); application katmanı yok |
| C-008-01 | MAJOR | Çoklu `ProfAlign` tek profile birleşiyor |
| C-001-03 | MAJOR | `staStart` yok sayılıyor |
| F-15, F-18, F-12, C-007-03, C-007-04, C-011-03, C-006-03, C-008-06, C-010-02 | MINOR | `new` ile servisler, CORS tekrarı, kullanılmayan bağımlılıklar, deterministik olmayan kimlik, koordinat swap'ı, ölü sınıf, `Project` kapsülleme, durum semantiği |

## 6. Hata sözleşmesi ve gözlemlenebilirlik (R7, R14)
| ID | Önem | Özet |
|---|---|---|
| F-04 | MAJOR | Üç hata stili (400/500/200+string); `include-message=always`; aynı bozuk XML inspect'te 400, import'ta 500 |
| F-16 | MAJOR | Logger/correlation yok; stack trace kayboluyor; actuator `health,info` |

## 7. Test kalitesi ve mimari koruma (R3/R4)
| ID | Önem | Özet |
|---|---|---|
| C-002-05 | MAJOR | Rijitlik formüllerine atıf yapılan testler yok |
| C-003-01 | MAJOR | Fast Solver uçtan uca yolu testsiz |
| F-17, C-001-07, C-004-02, C-004-03, C-005-05, C-006-04, C-007-05, C-008-07, C-009-07, C-010-04, C-011-05, C-012-05 | MINOR | Mimari test yok; tautolojik testler; yanlış davranışı sabitleyen testler; sınır/hata yolu testleri eksik; `@WebMvcTest`/`@SpringBootTest` yok |
| C-009-06 | MINOR | Plugin sürümleri sabit değil; `junit-bom` etkisiz; enforcer yok |
| C-001-06 | MINOR | Bayat javadoc'lar |

## 8. Referans uyum özeti
`architecture.md` §6 boşluk tablosu geçerli. Kod fazı ek kanıtı: R3 (framework'süzlük) **sağlanıyor** ama denetlenmiyor; R5/R8 en büyük açık (değişmezler modelde değil); R10 için hesaplama limitleri ve `NOT_EVALUATED` durumu eksik; R7/R14 hiç uygulanmamış; R15/R16 (JPA/PostgreSQL/Compose/Validation/DevTools) milestone kuralı gereği bulgu değil.
