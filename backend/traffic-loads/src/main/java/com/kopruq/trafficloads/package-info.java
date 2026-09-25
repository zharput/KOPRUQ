/**
 * Road-bridge traffic loads, EN 1991-2 - TRAFFIC-P01 (docs/roadmap.md).
 * Scope: notional lane generation (confirmed 3.00 m/lane rule), LM1
 * (active, EN 1991-2 Table 4.2 characteristic values left unconfirmed
 * pending the engineer - spec section 22), LM2 (deliberately not
 * implemented - see {@code frontend/src/features/loads/components/
 * traffic/Lm2Disabled.tsx}), and Load Groups (architecture only, no
 * membership populated).
 *
 * <p><b>Explicitly NOT here</b>: EN 1990 load combinations (gammaG,
 * gammaQ, psi factors, ULS/SLS/accidental/seismic combinations) - a
 * separate, future KOPRUQ module. Pedestrian bridge design - out of
 * scope entirely for this module. Braking/acceleration, centrifugal
 * force, LM3/LM4 real calculations - placeholders in the frontend for
 * TRAFFIC-P01, deferred to TRAFFIC-P02/P03.
 *
 * <p>No dependency on Spring.
 */
package com.kopruq.trafficloads;
