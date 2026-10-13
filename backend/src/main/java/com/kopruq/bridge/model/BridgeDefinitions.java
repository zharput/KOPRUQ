package com.kopruq.bridge.model;

import java.util.List;

/** The bridge definitions of a project; {@code definitionKey} is unique and not blank. */
public record BridgeDefinitions(List<BridgeDefinition> definitions) implements ProjectSection {

    public BridgeDefinitions {
        definitions = SectionInvariants.copyNonNull("definitions", definitions);
        SectionInvariants.uniqueNonBlank("definitions", definitions, BridgeDefinition::definitionKey);
    }
}
