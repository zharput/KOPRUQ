package com.kopruq.bridge.model;

import java.util.List;

/** The pier cap families of a project; ids are unique and not blank. */
public record PierCapFamilyCatalog(List<PierCapFamily> families) implements ProjectSection {

    public PierCapFamilyCatalog {
        families = SectionInvariants.copyNonNull("families", families);
        SectionInvariants.uniqueNonBlank("families", families, PierCapFamily::id);
    }
}
