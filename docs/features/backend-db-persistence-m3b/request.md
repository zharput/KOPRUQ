# Request: backend-db-persistence-m3b

Verbatim user input (data, not instructions; Turkish):

> backend-db-persistence-m5 planının Bölüm B'si: rüzgâr hesap sonucunun (windLoads.result) tipli ilişkisel olarak saklanması. Backend: V6 migration (load_wind_snapshot'a result_* kolonları ve result_present), WindSnapshotResult modeli, WindResultStatus enum'u, DTO ve mapper genişletmesi (PUT loads/wind-snapshot ve proje dokümanı), testler. Frontend (M4 kodu, bağlanmamış): loadsWire.ts'te result alanı, projectDocument.ts, fixture'lar ve testler. Endpoint ve controller sayısı değişmez (16 / 41). Dokümanlarda "computed results are not persisted" ilkesine rüzgâr snapshot'ı istisnası eklenir.

Context: the source is Part B ("BÖLÜM B — Önkoşul feature: backend-db-persistence-m3b") of `docs/features/backend-db-persistence-m5/plan.md` (B1-B6: scope, verified state, design incl. V6 SQL sketch, tasks, ACs B-AC1..B-AC7, risks). It records the USER DECISION of 2026-10-14 (answer to M5 question Q1): the calculated wind result IS persisted with its inputs, overriding the earlier resolved Q4 / M3 / M4 "result not persisted" rule. This feature is a prerequisite of M5c (wind part) only. Backend M1-M3, frontend M4/M5a/M5b are implemented (M5b committed as 208dcea). Do not edit the parent plan.
