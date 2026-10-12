package com.kopruq.api.alternatives.api;

import com.kopruq.api.kernel.api.KernelStateRequest;
import com.kopruq.generative.AlternativeGenerator;
import com.kopruq.generative.EvaluatedAlternativeGenerator;
import com.kopruq.rules.RuleEngine;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlternativeGenerationControllerTest {

    @Test
    void generate_specExample_returnsRowsMatchingTheExpectedSpanCounts() {
        var controller = new AlternativeGenerationController(new EvaluatedAlternativeGenerator(new AlternativeGenerator(), new RuleEngine()));
        var request = new KernelStateRequest("VIA-35", 210.0, 13.80, 30.0, 45.0, 4, 8, 1.8, 2.5);

        List<AlternativeRow> rows = controller.generate(request);

        assertEquals(3 * 5 * 8, rows.size());

        Set<Integer> spanCounts = rows.stream().map(AlternativeRow::spanCount).collect(Collectors.toSet());
        assertEquals(Set.of(5, 6, 7), spanCounts);

        assertTrue(rows.stream().allMatch(r -> Math.abs(r.totalLengthM() - 210) < 1e-3));
    }

    @Test
    void generate_withNoRulesApproved_marksEveryRowFeasible() {
        var controller = new AlternativeGenerationController(new EvaluatedAlternativeGenerator(new AlternativeGenerator(), new RuleEngine()));
        var request = new KernelStateRequest("VIA-35", 210.0, 13.80, 30.0, 45.0, 4, 8, 1.8, 2.5);

        List<AlternativeRow> rows = controller.generate(request);

        assertTrue(rows.stream().allMatch(AlternativeRow::feasible));
    }
}
