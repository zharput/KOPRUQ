package com.kopruq.bridge.api;

import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Collects the structural problems of one design-system request (present, finite, known enum constant, non-blank and
 * unique id) with their field paths, so one {@code InvalidRequestException} can report all of them. Only structure is
 * checked; no engineering rule, range or default is applied.
 */
final class SectionChecks {

    private final List<FieldViolation> violations = new ArrayList<>();

    int count() {
        return violations.size();
    }

    void add(String path, String message) {
        violations.add(new FieldViolation(path, message));
    }

    void throwIfAny() {
        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
    }

    /** A required string (may be empty, must not be null). */
    String text(String path, String value) {
        if (value == null) {
            add(path, "is required");
        }
        return value;
    }

    /** A required non-blank id. */
    String id(String path, String value) {
        if (value == null) {
            add(path, "is required");
        } else if (value.isBlank()) {
            add(path, "must not be blank");
        }
        return value;
    }

    /** An optional number: null is fine, a non-finite one is not. */
    Double optionalFinite(String path, Double value) {
        if (value != null && !Double.isFinite(value)) {
            add(path, "must be a finite number");
        }
        return value;
    }

    /** A required finite number; returns 0 after recording a violation. */
    double requiredFinite(String path, Double value) {
        if (value == null) {
            add(path, "is required");
            return 0;
        }
        if (!Double.isFinite(value)) {
            add(path, "must be a finite number");
            return 0;
        }
        return value;
    }

    <E extends Enum<E>> E requiredEnum(String path, String raw, Class<E> type) {
        if (raw == null) {
            add(path, "is required");
            return null;
        }
        return enumValue(path, raw, type);
    }

    <E extends Enum<E>> E optionalEnum(String path, String raw, Class<E> type) {
        return raw == null ? null : enumValue(path, raw, type);
    }

    private <E extends Enum<E>> E enumValue(String path, String raw, Class<E> type) {
        for (E constant : type.getEnumConstants()) {
            if (constant.name().equals(raw)) {
                return constant;
            }
        }
        add(path, "must be one of: " + Arrays.stream(type.getEnumConstants()).map(Enum::name)
                .collect(Collectors.joining(", ")));
        return null;
    }

    /** Converts each element; a null element is a violation, a failed conversion (null result) is skipped. */
    <D, M> List<M> list(String path, List<D> dtos, BiFunction<D, String, M> convert) {
        List<M> converted = new ArrayList<>();
        for (int i = 0; i < dtos.size(); i++) {
            String elementPath = path + "[" + i + "]";
            D dto = dtos.get(i);
            if (dto == null) {
                add(elementPath, "is required");
                continue;
            }
            M model = convert.apply(dto, elementPath);
            if (model != null) {
                converted.add(model);
            }
        }
        return converted;
    }

    /** Reports a repeated non-blank key, naming the first occurrence (e.g. {@code duplicates definitions[0].id}). */
    <D> void unique(String listPath, List<D> dtos, Function<D, String> key, String field) {
        String listName = listPath.contains(".") ? listPath.substring(listPath.indexOf('.') + 1) : listPath;
        Map<String, Integer> first = new HashMap<>();
        for (int i = 0; i < dtos.size(); i++) {
            D dto = dtos.get(i);
            String k = dto == null ? null : key.apply(dto);
            if (k == null || k.isBlank()) {
                continue;
            }
            Integer seen = first.putIfAbsent(k, i);
            if (seen != null) {
                add(listPath + "[" + i + "]." + field, "duplicates " + listName + "[" + seen + "]." + field);
            }
        }
    }
}
