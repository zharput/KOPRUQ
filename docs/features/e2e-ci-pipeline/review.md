# Review: e2e-ci-pipeline

Bağımsız feature-reviewer raporu (salt-okunur, komut çalıştırmadı). Kapsam: baseline HEAD `870c2d5` = güncel HEAD; `review-input-full.diff` (5 doküman) ve izlenmeyen `.github/workflows/ci.yml`. Koordinatör inceleme sonrası `git status`'u karşılaştırdı: çalışma alanı inceleme sırasında değişmedi (rapor güncel).

## Sınırlar
Reviewer hiçbir komut çalıştırmadı. Linux runner'da gerçek koşu, action etiketlerinin varlığı ve artifact yükleme/indirme doğrulanmadı. Yerel Windows simülasyonu (19/19) ve mvn/npm sonuçları implementer/koordinatör raporlarına dayanır. Bu rapor feature'ın hatasız olduğu anlamına gelmez.

## Bulgular
Engelleyici (P0-P2) bulgu yok.

**F1 - P3 - `.github/workflows/ci.yml:125`:** Sağlık döngüsündeki `curl -fsS http://localhost:8080/actuator/health` çağrısında `--max-time`/`--connect-timeout` yok. Backend bağlantıyı kabul edip yanıt vermezse (kilitlenme, Flyway kilidi) tek bir curl süresiz bekler, `kill -0` kontrolü çalışmaz, job ancak 30 dk `timeout-minutes` dolunca düşer (AC6'daki "süre sınırıyla bekler" zayıflar, CI dakikası boşa gider). Öneri: `curl -fsS --max-time 5 ...`.

## Doğrulanan noktalar (kaynak okumasıyla)
- Jar glob'u `kopruq-backend-*.jar` yalnız `kopruq-backend-0.1.0-SNAPSHOT.jar` ile eşleşir (`.jar.original` ile değil); indirme yolu `${{ runner.temp }}/backend-jar` ile `ls` doğru dosyayı bulur.
- `DB_PASSWORD` (GITHUB_ENV) sonraki step'lerde görünür; job düzeyi `DB_URL`/`DB_USERNAME` ile birlikte `nohup java` sürecine miras kalır; compose `${DB_PASSWORD:?}` çözülür; port 5433 uyumlu.
- `::add-mask::` kullanımdan önce; `set -x` yok; hex değer `GITHUB_ENV` için güvenli; `secrets.*` ve sabit parola yok (AC8).
- Sağlık döngüsü: curl `if` içinde olduğu için `-e` devre dışı, `pipefail` doğru, `kill -0` ölü süreci yakalar, `{"status":"UP"}` grep ile eşleşir.
- Playwright Vite'ı 5173'te başlatır, API varsayılanı 8080, CORS varsayılanı `http://localhost:5173`: uyumlu.
- `if: failure()` adımları `|| true` ve `if-no-files-found: ignore` ile ikincil hata üretmez; yollar yazma yollarıyla aynı.
- `contents: read` yeterli; push ve PR farklı concurrency gruplarına düşer (çift koşu, kabul edilmiş maliyet); `cache-dependency-path` checkout köküne göre çözülür.
- Kapsam dışı dosyalarda diff yok; `.github/modernize/**` `.gitignore` (`**/*`) ile git dışında.
- Dokümanlar workflow ile tutarlı (job adları, artifact adları, saklama süreleri); roadmap GitHub doğrulamasını açık bırakır, abartılı iddia yok.

## Belirsiz hipotezler (bulgu değil)
- **H1 - locale/saat dilimi:** Argümansız `toLocaleString()` kullanımları (`LandXmlImportPanel.tsx:85,106`, `TerrainDtmPanel.tsx:120`, `ProjectWorkspace.tsx:86`, `EngineeringNodeShell.tsx:37`). Linux Chromium locale'i farklıysa binlik ayırıcı bekleyen bir spec kırılabilir; e2e'de locale ayarı yok. Specler ayrıntılı taranmadı. Kaynak düzeltmesi bu feature'ın kapsamı dışı.
- **H2 - action etiketleri:** `checkout@v7`, `setup-java@v6`, `setup-node@v7`, `upload-artifact@v7`, `download-artifact@v8` repodan doğrulanamaz (implementer GitHub API ile doğruladığını raporladı). Biri yoksa workflow ilk adımda düşer.

## AC değerlendirmesi
AC1, AC2, AC3, AC7, AC8, AC9: karşılandı. AC4, AC5: kaynakta karşılandı, sonuçlar raporlanan. AC6: kaynakta karşılandı, F1 nedeniyle süre sınırı kısmen zayıf, Linux'ta koşulmadı. AC10: yalnız raporlanan (Windows simülasyonu 19/19). AC11: açık, kullanıcı doğrulayacak.

## Kullanıcının GitHub'da doğrulaması gerekenler
1. Push koşusunda üç job (`Backend (mvn package)`, `Frontend (lint, test, build)`, `E2E (Playwright)`) yeşil.
2. PR koşusu da yeşil (AC11).
3. Action etiketleri çözülüyor (H2).
4. "Start backend and wait for health" adımında "Backend is UP" ve backend sonraki step'te ayakta.
5. Log çıktısında parola `***` olarak görünüyor.
6. İsteğe bağlı: bilinçli bir hatayla hata artifact'larının oluştuğunu görmek.
7. Locale kaynaklı spec farkı yok (H1); lint/vitest Linux'ta temiz, büyük/küçük harf duyarlı import sorunu yok.

## Verdict
**PASS (APPROVED).** Engelleyici bulgu yok; F1 (P3) isteğe bağlı küçük iyileştirme. Sonuç kaynak incelemesine dayanır; gerçek CI koşusu (AC11) doğrulanmadı.

## Sonradan uygulanan düzeltme

F1 kullanıcı isteğiyle giderildi (2026-10-20): `ci.yml:125` health `curl` çağrısına `--max-time 5` eklendi. YAML ayrıştırması geçerli (`backend`, `frontend`, `e2e`), plan hash eşleşmesi korundu. Düzeltme sonrası yeniden review yapılmadı ve workflow GitHub'da koşulmadı.
