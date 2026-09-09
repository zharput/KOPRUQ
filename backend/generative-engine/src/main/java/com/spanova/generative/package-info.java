/**
 * Generative Engine - design-space combination, pruning, and
 * alternative identity (spec section 6.B, 7, 10). Deterministic and
 * repeatable: the same DesignSpace + Bridge must always produce the
 * same set of alternatives in the same order.
 *
 * <p>P03: {@link com.spanova.generative.AlternativeGenerator} -
 * uniform-span-layout x girder-count x girder-depth enumeration,
 * ported from the archived C#/Avalonia build's generator (same reading
 * of the spec, same open assumption about uniform spans - see the
 * class's own Javadoc).
 */
package com.spanova.generative;
