package com.kopruq.midas;

import com.kopruq.analysis.LoadCaseKind;
import com.kopruq.analysis.MaterialKind;

/**
 * The MIDAS Civil NX vocabulary for the port enums. MIDAS codes live only in this adapter; a kind that has not been
 * verified against a live MIDAS is refused instead of guessed.
 */
final class MidasVocabulary {

    private MidasVocabulary() {
    }

    /** MIDAS material TYPE code (verified at MIDAS-P01). */
    static String materialType(MaterialKind kind) {
        return switch (kind) {
            case CONCRETE -> "CONC";
        };
    }

    /**
     * MIDAS static load-case TYPE code. DEAD is verified at MIDAS-P01.
     *
     * @throws UnsupportedOperationException for a kind not verified against MIDAS yet (live verification: P07)
     */
    static String loadCaseType(LoadCaseKind kind) {
        return switch (kind) {
            case DEAD -> "D";
            case WIND -> throw new UnsupportedOperationException("load case kind WIND: not verified against MIDAS");
        };
    }
}
