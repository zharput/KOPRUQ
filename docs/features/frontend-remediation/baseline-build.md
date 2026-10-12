# Baseline: npm run build (Faz 0)

Komut: `npm run build` (frontend/), exit 0. Yalnızca chunk-size uyarısı.

```
vite v8.2.2 building client environment for production...
transforming...
✓ 3367 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.46 kB │ gzip:   0.30 kB
dist/assets/index-BvH4qe3X.css    279.91 kB │ gzip:  39.71 kB
dist/assets/index-fGQv2ZKN.js   2,762.51 kB │ gzip: 785.33 kB

✓ built in 3.29s
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
