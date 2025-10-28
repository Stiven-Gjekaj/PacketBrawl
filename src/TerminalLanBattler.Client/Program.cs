using TerminalLanBattler.Client;

var builder = new CommandLineArgumentBuilder(args);
string host = builder.GetArgument("--host", "127.0.0.1");
int port = builder.GetIntArgument("--port", 7777);
string playerName = builder.GetArgument("--name", "Player");
string characterClass = builder.GetArgument("--class", "Wizard");

Console.WriteLine($"Connecting to {host}:{port} as {playerName} ({characterClass})");

var client = new GameClient(host, port, playerName, characterClass);
await client.RunAsync();
