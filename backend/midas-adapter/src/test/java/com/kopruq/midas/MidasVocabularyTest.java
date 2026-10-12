package com.kopruq.midas;

import com.kopruq.analysis.LoadCaseKind;
import com.kopruq.analysis.MaterialKind;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MidasVocabularyTest {

    @Test
    void concreteMapsToTheVerifiedMidasMaterialCode() {
        assertEquals("CONC", MidasVocabulary.materialType(MaterialKind.CONCRETE));
    }

    @Test
    void deadMapsToTheVerifiedMidasLoadCaseCode() {
        assertEquals("D", MidasVocabulary.loadCaseType(LoadCaseKind.DEAD));
    }

    @Test
    void windIsRefusedUntilItIsVerifiedAgainstMidas() {
        assertThrows(UnsupportedOperationException.class, () -> MidasVocabulary.loadCaseType(LoadCaseKind.WIND));
    }
}
