using System.Globalization;
using Avalonia.Data.Converters;

namespace Spanova.App.Avalonia;

/// <summary>
/// Decorative-only dual-thumb range slider support (see the Design Space
/// card in MainWindow.axaml). The actual min/max values are still edited
/// via plain-text inline TextBoxes; these converters only compute where
/// to draw the thumb/fill graphics so they visually track the typed
/// values.
///
/// ConverterParameter format: "scaleMin,scaleMax,trackWidth" (invariant
/// culture doubles). scaleMin/scaleMax are a fixed, illustrative axis
/// chosen per field (e.g. 0-80 m for span length) - not derived from any
/// engineering rule.
/// </summary>
public sealed class ValueToTrackXConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (!TryToDouble(value, out var v))
        {
            return 0.0;
        }

        var (scaleMin, scaleMax, trackWidth) = ParseParameter(parameter);

        var fraction = (v - scaleMin) / (scaleMax - scaleMin);
        fraction = Math.Clamp(fraction, 0, 1);

        return fraction * trackWidth;
    }

    internal static bool TryToDouble(object? value, out double result)
    {
        if (value is double d) { result = d; return true; }
        if (value is int i) { result = i; return true; }
        if (value is IConvertible) { result = System.Convert.ToDouble(value, CultureInfo.InvariantCulture); return true; }
        result = 0;
        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture) =>
        throw new NotSupportedException();

    internal static (double ScaleMin, double ScaleMax, double TrackWidth) ParseParameter(object? parameter)
    {
        var parts = ((string)parameter!).Split(',');
        return (
            double.Parse(parts[0], CultureInfo.InvariantCulture),
            double.Parse(parts[1], CultureInfo.InvariantCulture),
            double.Parse(parts[2], CultureInfo.InvariantCulture));
    }
}

/// <summary>Width of the filled segment between the min and max thumbs. See <see cref="ValueToTrackXConverter"/>.</summary>
public sealed class RangeToTrackWidthConverter : IMultiValueConverter
{
    public object? Convert(IList<object?> values, Type targetType, object? parameter, CultureInfo culture)
    {
        if (values.Count < 2 ||
            !ValueToTrackXConverter.TryToDouble(values[0], out var minValue) ||
            !ValueToTrackXConverter.TryToDouble(values[1], out var maxValue))
        {
            return 0.0;
        }

        var (scaleMin, scaleMax, trackWidth) = ValueToTrackXConverter.ParseParameter(parameter);

        var minFraction = Math.Clamp((minValue - scaleMin) / (scaleMax - scaleMin), 0, 1);
        var maxFraction = Math.Clamp((maxValue - scaleMin) / (scaleMax - scaleMin), 0, 1);

        return Math.Max(0, (maxFraction - minFraction) * trackWidth);
    }
}
