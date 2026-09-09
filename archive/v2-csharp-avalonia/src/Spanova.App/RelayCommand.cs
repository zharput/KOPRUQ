using System.Windows.Input;

namespace Spanova.App;

/// <summary>Minimal ICommand implementation - avoids an external MVVM library for this milestone.</summary>
public sealed class RelayCommand : ICommand
{
    private readonly Action _execute;

    public RelayCommand(Action execute) => _execute = execute;

    public bool CanExecute(object? parameter) => true;

    public void Execute(object? parameter) => _execute();

#pragma warning disable CS0067 // required by ICommand; this milestone's GENERATE button is always enabled
    public event EventHandler? CanExecuteChanged;
#pragma warning restore CS0067
}
