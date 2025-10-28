namespace TerminalLanBattler.Server;

/// <summary>
/// Simple command-line argument parser.
/// Usage: GetArgument("--name", "default") or GetIntArgument("--port", 7777)
/// </summary>
public class CommandLineArgumentBuilder
{
    private readonly string[] _args;

    public CommandLineArgumentBuilder(string[] args)
    {
        _args = args;
    }

    public string GetArgument(string flag, string defaultValue)
    {
        var index = Array.IndexOf(_args, flag);
        return index >= 0 && index + 1 < _args.Length ? _args[index + 1] : defaultValue;
    }

    public int GetIntArgument(string flag, int defaultValue)
    {
        var strValue = GetArgument(flag, defaultValue.ToString());
        return int.TryParse(strValue, out var intValue) ? intValue : defaultValue;
    }
}
