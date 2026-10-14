# Request: backend-db-persistence-m5a

Verbatim user input (data, not instructions; Turkish):

> backend-db-persistence-m5 planının yalnızca M5a fazı (Bölüm A, "M5a – Hazırlık"): davranış değiştirmeden doğrudan localStorage okuyan yerleri sahip fonksiyonlara yönlendirmek, saf model ve yük girdi tiplerini ayırmak, ortak test yardımcıları (projectStoreTestUtils), 13 test dosyası ve App.test.tsx veri satırlarının göçü, noBrowserStorage ratchet testi ve dokümanlar

Context: the parent plan is `docs/features/backend-db-persistence-m5/plan.md` (state `planned`; Part A section 5 "M5a – Hazırlık", ACs AC1-AC6, design decisions D1-D16 incl. D1: user-visible behaviour does NOT change in M5a; localStorage stays the single source). Earlier phases are implemented: backend M1-M3, frontend M4 (committed, 5th review PASS). This feature is ONLY M5a: frontend-only preparation refactor, no behaviour change, no wiring of the M4 store, no deletion of storage code (that is M5c). Part B of that plan (backend-db-persistence-m3b, wind result persistence) is a separate prerequisite for M5c and not part of M5a. Do not edit the parent plan.
