# Implementation: save-status-toast

Sonuç: IMPLEMENTED (frontend; backend ve bağımlılıklar değişmedi, commit yok).

## Dosyalar
Yeni (`frontend/src/app/project-session/`): `saveToastTracker.ts` (+ `.test.ts`, 7 test), `useSaveToast.ts` (+ `.test.tsx`, 6 test, fake timers), `SaveToast.tsx`.

Değişen: `SaveStatusIndicator.tsx` (idle -> null) ve testi, `App.tsx` (`useSaveToast` + `<SaveToast/>`), `styles/app/18-project-session.css` (`.spn-save-toast`, top 64px, right 16px, z-index 1500, pointer-events none; yeşil #6fbf8a, kırmızı #d97878), `layout/TopWorkspaceNav.test.tsx`, `AppSession.test.tsx` (güncellemeler + yeni Units & Preferences testi).

Docs: `docs/e2e/README.md`, `02`, `03`, `04`, `05`, `06`, `07`, `12`, `13`, `14`, `15`, `18`; `docs/architecture.md`; `docs/roadmap.md`. `02`'deki "Kanıt/Sonuç" notu korundu.

## Kabul ölçütleri
- AC1: SaveStatusIndicator, TopWorkspaceNav ve AppSession testlerinde idle iken status öğesi yok.
- AC2: AppSession "Add bridge": yeşil toast çıkar ve kalkar.
- AC3: Yeni AppSession testi: Length `mm` -> tek `workspace` PUT -> yeşil toast -> kalkar.
- AC4: AppSession 500 testi ("Kaydedilemedi" toast + kalıcı blok); tracker testleri error/rejected/conflict; kalkma `useSaveToast.test`. `reportLocalRejection` için ayrı test yok (aynı geçişi kullanır).
- AC5: New'de toast yok (hemen ve 1 sn sonra); Yeniden yükle/discard'da "Kaydedildi" yok; epoch/discard/revizyon kuralları tracker testlerinde. Open, Exit ve bekleyen yazmasız Ctrl+S doğrudan assert edilmedi.
- AC6: `useSaveToast.test` "replaces the toast on a new save and restarts the timer".
- AC7: Mevcut Tekrar dene / Değişiklikleri at / Yeniden yükle ve "Kaydediliyor…" testleri değişmeden geçer.
- AC8: aşağıdaki kontroller.

## Kontroller (frontend/)
- Hedefli test: 18 dosya, 185 test geçti (uygulayıcı raporu).
- `npm test`: 1116/1116 geçti (koordinatör yeniden çalıştırdı).
- `npm run lint`: hata yok; mevcut uyarılar yeni dosyalarda değil (koordinatör doğruladı).
- `npm run build`: başarılı (koordinatör doğruladı; yalnızca chunk boyutu uyarısı).
- Çalıştırılmadı: backend `mvn` (değişmedi), `02-proje-kalici-veri.md` elle e2e yürütmesi.

## Sapmalar ve kalan iş
- Toast konumu `top: 64px` tahmini; nav yüksekliği ölçülmedi, tarayıcıda görsel kontrol yapılmadı.
- Bazı e2e satırları planın harfi harfine metninden biraz daha geniş yeniden yazıldı (örn. `03`).
- Kalan: elle e2e yürütmesi ve toast'un görsel kontrolü.
