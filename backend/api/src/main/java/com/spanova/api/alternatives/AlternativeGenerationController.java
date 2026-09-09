package com.spanova.api.alternatives;

import com.spanova.api.kernel.KernelStateRequest;
import com.spanova.generative.AlternativeGenerator;
import com.spanova.rules.RuleEngine;
import org.springframework.web.bind.annotation.CrossOrigin;
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
 * <p>P04 (spec section 11): each alternative is additionally run through
 * a {@link RuleEngine} to compute {@link AlternativeRow#feasible()}. The
 * engine holds NO rules yet (none approved by the engineer) - this wires
 * real infrastructure ahead of the first real rule, it does not add any
 * engineering judgment of its own.
 */
@RestController
@RequestMapping("/api/alternatives")
@CrossOrigin(origins = "http://localhost:5173")
public class AlternativeGenerationController {

    private final AlternativeGenerator generator = new AlternativeGenerator();
    private final RuleEngine ruleEngine = new RuleEngine();

    @PostMapping
    public List<AlternativeRow> generate(@RequestBody KernelStateRequest request) {
        var bridge = request.toBridge();
        var designSpace = request.toDesignSpace();

        return generator.generate(bridge, designSpace)
                .stream()
                .map(alternative -> AlternativeRow.from(
                        alternative,
                        ruleEngine.evaluate(alternative, bridge, designSpace).feasible()))
                .toList();
    }
}
