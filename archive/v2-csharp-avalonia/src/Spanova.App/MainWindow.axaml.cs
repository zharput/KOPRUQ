using Avalonia.Controls;
using Avalonia.Controls.Shapes;
using Avalonia.Media;

namespace Spanova.App;

public partial class MainWindow : Window
{
    private readonly MainViewModel _viewModel;

    public MainWindow()
    {
        InitializeComponent();

        _viewModel = new MainViewModel();
        DataContext = _viewModel;

        // Wired directly to the DataGrid's own selection event rather than
        // routed through MainViewModel.SelectedRow's binding: this is
        // purely a view-layer concern (P05's rendering), so it does not
        // need to round-trip through the ViewModel to work, and it avoids
        // depending on DataGrid.SelectedItem's binding-mode default.
        ResultsGrid.SelectionChanged += (_, _) => DrawElevation(ResultsGrid.SelectedItem as AlternativeRow);

        // Draw the initial (no-selection) placeholder immediately, so a
        // blank canvas is never ambiguous with "nothing has run yet".
        DrawElevation(null);
    }

    /// <summary>
    /// P05 (spec section 20): a simple, schematic elevation of the
    /// selected alternative - deck line, span-boundary markers, and a
    /// girder-depth block. Deliberately not photorealistic or
    /// dimensionally exact in both axes at once (see the caption in
    /// MainWindow.axaml for what is and isn't to scale).
    /// </summary>
    private void DrawElevation(AlternativeRow? row)
    {
        ElevationCanvas.Children.Clear();

        if (row is null)
        {
            AddCanvasMessage("Select a row above to see its elevation.", Brushes.Gray);
            return;
        }

        try
        {
            DrawElevationCore(row);
        }
        catch (Exception ex)
        {
            // Surface the failure instead of leaving a silently blank canvas.
            AddCanvasMessage($"Could not draw elevation: {ex.Message}", Brushes.Red);
        }
    }

    private void AddCanvasMessage(string text, IBrush brush)
    {
        var message = new TextBlock { Text = text, FontSize = 12, Foreground = brush, TextWrapping = Avalonia.Media.TextWrapping.Wrap, Width = 560 };
        Canvas.SetLeft(message, 10);
        Canvas.SetTop(message, 10);
        ElevationCanvas.Children.Add(message);
    }

    private void DrawElevationCore(AlternativeRow row)
    {
        if (row.TotalLengthM <= 0)
        {
            AddCanvasMessage("Selected alternative has zero total length - nothing to draw.", Brushes.Gray);
            return;
        }

        const double canvasWidth = 600;
        const double deckY = 70;
        const double pierMarkerLength = 50;
        const double girderDepthPxPerMeter = 15; // exaggerated on purpose - see caption

        var horizontalScale = canvasWidth / row.TotalLengthM;
        var girderDepthPx = Math.Max(row.GirderDepthM * girderDepthPxPerMeter, 3);

        // Deck line (girder soffit-to-top block).
        var deckRect = new Rectangle { Width = canvasWidth, Height = girderDepthPx, Fill = Brushes.SteelBlue };
        Canvas.SetLeft(deckRect, 0);
        Canvas.SetTop(deckRect, deckY);
        ElevationCanvas.Children.Add(deckRect);

        // Span-boundary markers (piers/abutments) - position only, no height (Pier is not modeled yet).
        for (var i = 0; i <= row.SpanCount; i++)
        {
            var x = i * row.SpanLengthM * horizontalScale;

            var marker = new Line
            {
                StartPoint = new Avalonia.Point(x, deckY + girderDepthPx),
                EndPoint = new Avalonia.Point(x, deckY + girderDepthPx + pierMarkerLength),
                Stroke = Brushes.Gray,
                StrokeThickness = 2,
            };
            ElevationCanvas.Children.Add(marker);

            if (i < row.SpanCount)
            {
                var label = new TextBlock
                {
                    Text = $"{row.SpanLengthM:0.#} m",
                    FontSize = 11,
                    Foreground = Brushes.Black,
                };
                Canvas.SetLeft(label, x + (row.SpanLengthM * horizontalScale / 2) - 15);
                Canvas.SetTop(label, deckY - 20);
                ElevationCanvas.Children.Add(label);
            }
        }

        var totalLabel = new TextBlock
        {
            Text = $"Total: {row.TotalLengthM:0.#} m | {row.SpanCount} span(s) | girder depth {row.GirderDepthM:0.##} m",
            FontSize = 11,
            FontWeight = FontWeight.SemiBold,
            Foreground = Brushes.Black, // Canvas.Background is White regardless of app theme - do not rely on inherited (theme-dependent) foreground here.
        };
        Canvas.SetLeft(totalLabel, 0);
        Canvas.SetTop(totalLabel, deckY + girderDepthPx + pierMarkerLength + 8);
        ElevationCanvas.Children.Add(totalLabel);
    }
}
