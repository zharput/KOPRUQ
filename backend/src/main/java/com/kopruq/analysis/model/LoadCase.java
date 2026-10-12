package com.kopruq.analysis.model;

import com.kopruq.analysis.enums.LoadCaseKind;

/** A static load case: its name and its {@link LoadCaseKind}. The solver adapter maps the kind to its own vocabulary. */
public record LoadCase(String name, LoadCaseKind kind) {
}
