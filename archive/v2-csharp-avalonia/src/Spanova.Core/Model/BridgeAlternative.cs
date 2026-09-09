namespace Spanova.Core.Model;

/// <summary>
/// One concrete bridge configuration: a single point in the design space
/// (Computational Mode, spec section 6.A), or one output of Generative
/// Mode (spec section 6.B). This is the type that satisfies P01's
/// success criterion: "a bridge can be represented independently of
/// ALLPLAN" (spec section 20).
///
/// <see cref="Deck"/>, <see cref="Pier"/> and <see cref="Foundation"/>
/// are nullable, not <c>required</c> as in P01: P03's own generation
/// scope is explicitly "span-layout and girder alternatives" only (spec
/// section 20's P03 example varies only Span and Girder ranges). Null
/// here means "not sized by this generation step yet", never an
/// invented default - a later milestone (P08+ quantity/cost work, or
/// whenever Deck/Pier/Foundation enumeration is approved) fills these
/// in for real.
/// </summary>
public sealed class BridgeAlternative
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public required SpanLayout SpanLayout { get; init; }
    public required Girder Girder { get; init; }
    public Deck? Deck { get; init; }
    public Pier? Pier { get; init; }
    public Foundation? Foundation { get; init; }
}
