package com.kopruq.bridge.model;

import java.util.List;

/** The material assignments of a project; ids are unique and not blank. */
public record MaterialAssignmentCatalog(List<MaterialAssignment> assignments) implements ProjectSection {

    public MaterialAssignmentCatalog {
        assignments = SectionInvariants.copyNonNull("assignments", assignments);
        SectionInvariants.uniqueNonBlank("assignments", assignments, MaterialAssignment::id);
    }
}
