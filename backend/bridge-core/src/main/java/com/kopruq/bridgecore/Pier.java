package com.kopruq.bridgecore;

/**
 * Substructure pier sizing for one bridge alternative (spec section 9).
 *
 * <p>{@code pierType} is a free-text label rather than an enum: the
 * master specification names "Pier Type" as a design-space parameter
 * but does not enumerate specific categories anywhere (e.g. circular /
 * wall / hammerhead) - inventing that taxonomy would violate spec
 * section 22 ("never invent ... structural assumptions"). Replace this
 * with a real enum once the engineer specifies the allowed pier types.
 */
public record Pier(double diameterM, double heightM, String pierType) {
}
