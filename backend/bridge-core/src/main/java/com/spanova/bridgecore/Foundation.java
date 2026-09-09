package com.spanova.bridgecore;

/**
 * Substructure foundation sizing for one bridge alternative (spec
 * section 9).
 *
 * <p>Only pile-foundation dimensions are modelled ({@code pileCount},
 * {@code pileDiameterM}) because those are the only foundation
 * dimensions the master specification names. Spread-footing sizing
 * (width/length/depth) is not modelled yet - the spec does not specify
 * which parameters describe one, and inventing them would violate spec
 * section 22. Ask the engineer before adding spread-footing fields.
 *
 * @param pileCount     only meaningful when {@code type} is {@link FoundationType#PILE}; null otherwise
 * @param pileDiameterM pile diameter in meters; only meaningful when {@code type} is {@link FoundationType#PILE}; null otherwise
 */
public record Foundation(FoundationType type, Integer pileCount, Double pileDiameterM) {
}
