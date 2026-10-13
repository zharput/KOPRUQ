package com.kopruq.bridge.model;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Structural checks shared by the design-system sections: present, finite, non-blank, unique. Never an engineering
 * rule or range. A violation is an {@link IllegalArgumentException}.
 */
final class SectionInvariants {

    private SectionInvariants() {
    }

    static double finite(String what, double value) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(what + " must be a finite number");
        }
        return value;
    }

    /** Null is allowed; a non-null value must be finite. */
    static Double finiteOrNull(String what, Double value) {
        if (value != null && !Double.isFinite(value)) {
            throw new IllegalArgumentException(what + " must be a finite number");
        }
        return value;
    }

    static <T> T required(String what, T value) {
        if (value == null) {
            throw new IllegalArgumentException(what + " is required");
        }
        return value;
    }

    static String notBlank(String what, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(what + " must not be blank");
        }
        return value;
    }

    /** Immutable copy of a required list without null elements. */
    static <T> List<T> copyNonNull(String what, List<T> list) {
        required(what, list);
        for (T element : list) {
            if (element == null) {
                throw new IllegalArgumentException(what + " must not contain null");
            }
        }
        return List.copyOf(list);
    }

    /** Like {@link #copyNonNull} but a null list stays null (null and empty differ). */
    static <T> List<T> copyNonNullOrNull(String what, List<T> list) {
        return list == null ? null : copyNonNull(what, list);
    }

    static <T> void uniqueNonBlank(String what, List<T> items, Function<T, String> key) {
        Set<String> seen = new HashSet<>();
        for (T item : items) {
            String k = notBlank(what + " key", key.apply(item));
            if (!seen.add(k)) {
                throw new IllegalArgumentException(what + " key is duplicated: " + k);
            }
        }
    }
}
