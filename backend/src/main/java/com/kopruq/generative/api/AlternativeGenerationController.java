package com.kopruq.generative.api;

import com.kopruq.bridge.api.KernelStateRequest;
import com.kopruq.generative.domain.EvaluatedAlternativeGenerator;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * P03 (spec section 20): generates feasible span-layout/girder
 * alternatives from the same 9-field request P02 introduced, and
 * returns them as a flat table-ready list.
 *
 * <p>P04 (spec section 11): the {@link EvaluatedAlternativeGenerator} runs each
 * alternative through the rule engine; the result feeds {@link AlternativeRow#feasible()}.
 * The engine holds NO rules yet (none approved by the engineer) - this wires
 * real infrastructure ahead of the first real rule, it does not add any
 * engineering judgment of its own.
 */
@RestController
@RequestMapping("/api/alternatives")
public class AlternativeGenerationController {

    private final EvaluatedAlternativeGenerator generator;

    public AlternativeGenerationController(EvaluatedAlternativeGenerator generator) {
        this.generator = generator;
    }

    @PostMapping
    public List<AlternativeRow> generate(@RequestBody KernelStateRequest request) {
        var bridge = request.toBridge();
        var designSpace = request.toDesignSpace();

        return generator.generate(bridge, designSpace)
                .stream()
                .map(evaluated -> AlternativeRow.from(evaluated.alternative(), evaluated.feasible()))
                .toList();
    }
}
