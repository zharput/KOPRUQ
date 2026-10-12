package com.kopruq.materials;

import java.util.Set;
import java.util.OptionalInt;

/**
 * The concrete strength-class identifiers the platform offers ({@code "C30/37"} style, EN 1992-1-1 Table 3.1) and
 * the parsing of the characteristic cylinder strength {@code fck} out of such an identifier.
 */
public final class ConcreteStrengthClasses {

    private static final Set<String> SUPPORTED_MATERIAL_IDS = Set.of("C12/15", "C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50", "C45/55", "C50/60", "C55/67", "C60/75", "C70/85", "C80/95", "C90/105");

    private ConcreteStrengthClasses() {
    }

    /**
     * @param materialId a strength-class identifier such as {@code "C30/37"}
     * @return {@code fck} in MPa (the number between the leading letter and the slash), or empty when the
     *         identifier is not one of the supported classes
     */
    public static OptionalInt characteristicStrengthMpa(String materialId) {
        int separator = materialId.indexOf('/');
        if (!SUPPORTED_MATERIAL_IDS.contains(materialId)) {
            return OptionalInt.empty();
        }
        try {
            return OptionalInt.of(Integer.parseInt(materialId.substring(1, separator)));
        } catch (NumberFormatException error) {
            return OptionalInt.empty();
        }
    }
}
