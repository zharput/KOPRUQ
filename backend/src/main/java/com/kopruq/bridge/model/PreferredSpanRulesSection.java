package com.kopruq.bridge.model;

import java.util.List;

/** The preferred span rules; a null {@code rules} list means "cleared / not set" (an empty list is a written []). */
public record PreferredSpanRulesSection(List<PreferredSpanRule> rules) implements ProjectSection {

    public PreferredSpanRulesSection {
        rules = SectionInvariants.copyNonNullOrNull("rules", rules);
    }
}
