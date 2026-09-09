namespace Spanova.Analysis;

/// <summary>
/// Placeholder. Not implemented in Prototype P01.
/// Spec section 17: "No structural analysis is required for P01."
/// Intended future scope: solver-independent structural result contracts
/// (ULS/SLS/deflection etc.) populated by external adapters such as
/// Spanova.Allplan, per spec section 3/4 - never a solver implementation
/// itself (spec section 3: "SPANOVA shall NOT initially implement its
/// own finite-element solver").
/// </summary>
public static class ModuleStatus
{
    public const string Status = "Not implemented (Prototype P01 explicitly excludes structural analysis).";
}
