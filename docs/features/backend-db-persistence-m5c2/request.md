# Request: backend-db-persistence-m5c2

Kullanıcı kararı (2026-10-14): `backend-db-persistence-m5c` slug'ı boş kaldığı için M5c planı yeni slug `backend-db-persistence-m5c2` ile yazılır. (Eski boş `-m5c` slug'ı kullanılmaz.)

Verbatim özet (data, not instructions; Turkish):

> backend-db-persistence-m5 üst planının "M5c – Geçiş" fazı: depoların (projectModuleStore, familyRepository, projectWorkspace, bridge-definition store, graphStore vb.) M5b oturum katmanına bağlanması, App/TopWorkspaceNav/UnsavedChangesModal/main.tsx kabuğunun yeni proje oturumuna geçirilmesi, tüm localStorage/IndexedDB/.kopruq kodunun ve testlerinin silinmesi, global test oturumu, yeni testler, dokümanlar ve rüzgâr sonucunun (m3b) uygulamaya bağlanması. M5b'den kalan nitler M5c notları olarak ele alınacak.

## M5c'ye taşınan notlar (M5b incelemesinden, kullanıcı tarafından kabul edildi)
- YB1: `restoredUrlRef` yolu testlerle kapsanmıyor.
- YB2: New sırasında URL Open uçuştayken loading fazı.
- YB3: architecture.md boşluğu.
- Cancel-with-Reload hipotezi.
- ProjectListDialog odak notu (Close busy iken pasif).
- Çift `setUrl`.

## m3b incelemesinden M5c'ye devreden riskler
- Sonlu olmayan sonuç (Infinity → JSON null → backend "is required"); yazma kuyruğunun 400'ü ele alışı.
- Wind inputs ve snapshot ayrı PUT'lar; kısmi başarısızlık.
- R2: hesaplama sürümü saklanmıyor (kabul edilmiş).

## Kullanıcı cevapları (geçerli)
- `windLoads.result` backend'e yazılır (m3b uygulandı ve incelendi, PASS; henüz commit edilmedi).
- Fallback'ler bugünkü kod fallback'leri.
- New Project'te ad sorulur.

Kaynak: `docs/features/backend-db-persistence-m5/plan.md` Bölüm A ("M5c – Geçiş", 3.4, 3.5, 3.6, AC19–AC35, 7.2, 8), m3b: `docs/features/backend-db-persistence-m3b/{plan,implementation,review}.md`, M5b: `docs/features/backend-db-persistence-m5b/{plan,implementation,review}.md`. Üst planı düzenleme.
