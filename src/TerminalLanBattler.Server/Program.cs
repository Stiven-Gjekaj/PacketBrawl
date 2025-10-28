using TerminalLanBattler.Server;

var builder = new CommandLineArgumentBuilder(args);
int port = builder.GetIntArgument("--port", 7777);
string bindAddress = builder.GetArgument("--bind", "0.0.0.0");

Console.WriteLine($"Starting TerminalLanBattler Server on {bindAddress}:{port}");

var server = new GameServer(port, bindAddress);
await server.StartAsync();
