package com.kopruq.analysis;

/** MIDAS "Value" section, shape "SB". Used by MIDAS-P01's hand-built test beam. */
public record SolidRectangleSection(int id, String name, double heightM, double widthM) implements AnalysisSection {

    /** A section needs a real, finite, positive size: 0 or NaN would silently give a zero-area / singular element. */
    public SolidRectangleSection {
        if (!Double.isFinite(heightM) || heightM <= 0 || !Double.isFinite(widthM) || widthM <= 0) {
            throw new IllegalArgumentException("SolidRectangleSection \"" + name + "\": heightM and widthM must be finite and > 0, got "
                    + heightM + " x " + widthM);
        }
    }
}
