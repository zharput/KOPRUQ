package com.kopruq.generative;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.DesignSpace;
import com.kopruq.rules.RuleEngine;

import java.util.List;

/**
 * Generates the alternatives of a design space ({@link AlternativeGenerator}, unchanged) and runs each of them
 * through the {@link RuleEngine} (spec section 11, P04), in generation order. The rule engine holds no approved rule
 * yet, so every alternative is feasible today; this class does not add any engineering judgment of its own.
 */
public final class EvaluatedAlternativeGenerator {

    private final AlternativeGenerator generator;
    private final RuleEngine ruleEngine;

    public EvaluatedAlternativeGenerator(AlternativeGenerator generator, RuleEngine ruleEngine) {
        this.generator = generator;
        this.ruleEngine = ruleEngine;
    }

    public List<EvaluatedAlternative> generate(Bridge bridge, DesignSpace designSpace) {
        return generator.generate(bridge, designSpace).stream()
                .map(alternative -> new EvaluatedAlternative(alternative,
                        ruleEngine.evaluate(alternative, bridge, designSpace)))
                .toList();
    }
}
