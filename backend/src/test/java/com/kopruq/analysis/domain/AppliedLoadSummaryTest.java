package com.kopruq.analysis.domain;

import com.kopruq.analysis.enums.LoadCaseKind;
import com.kopruq.analysis.enums.MaterialKind;
import com.kopruq.analysis.model.AnalysisElement;
import com.kopruq.analysis.model.AnalysisMaterial;
import com.kopruq.analysis.model.AnalysisNode;
import com.kopruq.analysis.model.AnalysisRequest;
import com.kopruq.analysis.model.ISection;
import com.kopruq.analysis.model.LoadCase;
import com.kopruq.analysis.model.SelfWeight;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AppliedLoadSummaryTest {

    @Test
    void fiveSpanExample_matchesTheContractSnapshotTotal() {
        // 96025.0 kN is the total of the existing FastSolverContractTest snapshot (not a new engineering value).
        AnalysisRequest request = new FrameBridgeModelBuilder().build(FrameBridgeModelBuilderTest.fiveSpan()).analysisRequest();
        double expected = 96025.0;
        assertEquals(expected, AppliedLoadSummary.totalAppliedLoadKn(request), Math.max(1e-9, expected * 1e-9));
    }

    @Test
    void selfWeightOfANonRectangularSectionIsRefusedInsteadOfCountingZero() {
        AnalysisRequest request = new AnalysisRequest(
                List.of(new AnalysisNode(1, 0, 0, 0), new AnalysisNode(2, 10, 0, 0)),
                List.of(new AnalysisElement(1, 1, 1, 1, 2)),
                List.of(),
                List.of(new AnalysisMaterial(1, MaterialKind.CONCRETE, "C30", 3.0e7, 0.2, 1e-5, 25.0, 2.5)),
                List.of(new ISection(1, "I", 1.0, 0.5, 0.1, 0.5, 0.1, 0.2)),
                List.of(),
                List.of(new LoadCase("Service", LoadCaseKind.DEAD)),
                List.of(new SelfWeight("Service", 0, 0, -1)),
                List.of());
        assertThrows(IllegalArgumentException.class, () -> AppliedLoadSummary.totalAppliedLoadKn(request));
    }
}
