# Request: backend-db-persistence

Verbatim user input (data, not instructions; Turkish):

> hayır localStorage ve IndexedDb tamamen kalksın istiyorum , tamamen bizim backenddeki db mizi kullanacaksın , bunun için gerekli backend geliştirmelerinide planla, frontend direkt backenddeki db yi kullanacak

Context: supersedes slug `frontend-backend-persistence` (planned earlier). In that plan the frontend kept an in-memory session store with explicit Save of one aggregate; the user rejected this direction. Requirements: remove localStorage and IndexedDB completely; the frontend must use the backend database directly (backend is the only store of project data); plan the necessary BACKEND development too (endpoints, migrations, typed relational model) together with the frontend work. Earlier answers still valid unless contradicted: relational typed model (not an opaque JSON blob); `.kopruq` file support removed entirely; no migration of existing browser data; single local user, no auth; backend down = error message only; no project delete UI unless required.
