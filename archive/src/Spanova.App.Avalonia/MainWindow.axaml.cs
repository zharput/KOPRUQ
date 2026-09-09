using Avalonia.Controls;
using Avalonia.Input;

namespace Spanova.App.Avalonia;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainViewModel(this);
    }

    /// <summary>
    /// Sidebar nav items are anchors into the single scrollable page (no
    /// top tabs, per the user's request) - clicking one scrolls the
    /// matching section into view instead of switching pages.
    /// </summary>
    private void OnNavItemClick(object? sender, PointerPressedEventArgs e)
    {
        if (sender is not Control control || control.Tag is not string sectionName)
        {
            return;
        }

        if (this.FindControl<Control>(sectionName) is { } target)
        {
            target.BringIntoView();
        }
    }
}
