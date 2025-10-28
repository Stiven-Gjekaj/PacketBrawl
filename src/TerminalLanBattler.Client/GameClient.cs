using System.Net.Sockets;
using TerminalLanBattler.Shared.Game;
using TerminalLanBattler.Shared.Messages;
using TerminalLanBattler.Shared.Serialization;

namespace TerminalLanBattler.Client;

/// <summary>
/// Client-side game controller: connects to server, manages local UI and game state.
/// Local state is read-only; server is authoritative. Client receives state snapshots.
/// </summary>
public class GameClient
{
    private readonly string _host;
    private readonly int _port;
    private readonly string _playerName;
    private readonly string _characterClass;

    private TcpClient? _tcpClient;
    private NetworkStream? _networkStream;
    private StreamReader? _reader;
    private StreamWriter? _writer;

    private string? _playerId;
    private GameStateSnapshot? _currentGameState;
    private MatchStatus _matchStatus = MatchStatus.Lobby;
    private CancellationTokenSource _cancellationTokenSource = new();

    public GameClient(string host, int port, string playerName, string characterClass)
    {
        _host = host;
        _port = port;
        _playerName = playerName;
        _characterClass = characterClass;
    }

    /// <summary>
    /// Main entry point: connect and run game loop.
    /// </summary>
    public async Task RunAsync()
    {
        try
        {
            await ConnectAsync();
            Console.WriteLine($"[Client] Connected. Player ID: {_playerId}");

            var receiverTask = ReceiveMessagesAsync(_cancellationTokenSource.Token);
            await InputLoopAsync(_cancellationTokenSource.Token);

            _cancellationTokenSource.Cancel();
            await receiverTask;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Client] Error: {ex.Message}");
        }
        finally
        {
            Disconnect();
        }
    }

    /// <summary>
    /// Connect to server and send initial Connect message.
    /// </summary>
    private async Task ConnectAsync()
    {
        _tcpClient = new TcpClient();
        await _tcpClient.ConnectAsync(_host, _port);
        _networkStream = _tcpClient.GetStream();
        _reader = new StreamReader(_networkStream);
        _writer = new StreamWriter(_networkStream) { AutoFlush = true };

        var connectMsg = new ConnectMessage
        {
            PlayerName = _playerName,
            ChosenClass = _characterClass
        };

        await SendMessageAsync(connectMsg);

        var responseJson = await _reader.ReadLineAsync();
        if (responseJson == null)
            throw new Exception("Server closed connection before sending ConnectResponse.");

        var response = MessageSerializer.Deserialize(responseJson) as ConnectResponseMessage;
        if (response == null || !response.Success)
            throw new Exception($"Connection failed: {response?.ErrorMessage}");

        _playerId = response.PlayerId;

        await SendMessageAsync(new JoinLobbyMessage { PlayerId = _playerId });
    }

    /// <summary>
    /// Receive and handle messages from server.
    /// </summary>
    private async Task ReceiveMessagesAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested && _reader != null)
            {
                var json = await _reader.ReadLineAsync(ct);
                if (json == null)
                {
                    Console.WriteLine("[Client] Server disconnected.");
                    break;
                }

                var message = MessageSerializer.Deserialize(json);
                if (message == null) continue;

                HandleMessage(message);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.WriteLine($"[ReceiveMessages] Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Route incoming message.
    /// </summary>
    private void HandleMessage(MessageBase message)
    {
        switch (message)
        {
            case LobbyStateMessage lobbyMsg:
                HandleLobbyState(lobbyMsg);
                break;

            case StartMatchMessage startMsg:
                HandleMatchStart(startMsg);
                break;

            case StateUpdateMessage stateMsg:
                HandleStateUpdate(stateMsg);
                break;

            case MatchResultMessage resultMsg:
                HandleMatchResult(resultMsg);
                break;

            case ErrorMessage errorMsg:
                HandleError(errorMsg);
                break;

            case HeartbeatMessage:
                break;

            default:
                Console.WriteLine($"[Client] Unknown message type: {message.MessageType}");
                break;
        }
    }

    private void HandleLobbyState(LobbyStateMessage msg)
    {
        Console.WriteLine($"\n=== LOBBY STATE ===");
        Console.WriteLine($"Players ({msg.Players.Count}/{msg.MaxPlayers}):");
        foreach (var p in msg.Players)
        {
            Console.WriteLine($"  - {p.PlayerName} ({p.Class})");
        }
        Console.WriteLine();
    }

    private void HandleMatchStart(StartMatchMessage msg)
    {
        _currentGameState = msg.GameState;
        _matchStatus = MatchStatus.InProgress;
        Console.WriteLine($"\n=== MATCH STARTED ===");
        PrintGameState();
    }

    private void HandleStateUpdate(StateUpdateMessage msg)
    {
        _currentGameState = msg.GameState;
        _matchStatus = msg.GameState.MatchStatus switch
        {
            "InProgress" => MatchStatus.InProgress,
            "Completed" => MatchStatus.Completed,
            _ => MatchStatus.Lobby
        };

        if (msg.ActionLog.Any())
        {
            Console.WriteLine("\n--- Last Action ---");
            foreach (var log in msg.ActionLog.TakeLast(1))
            {
                Console.WriteLine($"{log.Action}");
            }
        }

        PrintGameState();
    }

    private void HandleMatchResult(MatchResultMessage msg)
    {
        Console.WriteLine($"\n=== MATCH RESULT ===");
        Console.WriteLine($"Winner: {msg.WinnerName}!");
        Console.WriteLine("Final Ranking:");
        foreach (var rank in msg.FinalRanking)
        {
            Console.WriteLine($"  {rank.Rank}. {rank.PlayerName} (HP: {rank.FinalHp})");
        }
    }

    private void HandleError(ErrorMessage msg)
    {
        Console.WriteLine($"[ERROR] {msg.ErrorCode}: {msg.Details}");
        if (msg.Fatal)
        {
            _cancellationTokenSource.Cancel();
        }
    }

    /// <summary>
    /// Main input loop: display menu and process user input.
    /// </summary>
    private async Task InputLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                if (_matchStatus == MatchStatus.Lobby)
                {
                    await InputLobbyAsync(ct);
                }
                else if (_matchStatus == MatchStatus.InProgress)
                {
                    if (_currentGameState?.CurrentTurnPlayerId == _playerId)
                    {
                        await InputActionAsync(ct);
                    }
                    else
                    {
                        Console.WriteLine("Waiting for other players...");
                        await Task.Delay(1000, ct);
                    }
                }
                else if (_matchStatus == MatchStatus.Completed)
                {
                    Console.WriteLine("Match is over. Type 'q' to quit.");
                    var input = Console.ReadLine();
                    if (input == "q")
                        _cancellationTokenSource.Cancel();
                    else
                        await Task.Delay(1000, ct);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InputLoop] Error: {ex.Message}");
            }
        }
    }

    private async Task InputLobbyAsync(CancellationToken ct)
    {
        Console.WriteLine("\n[LOBBY] Waiting for match to start... Type 'quit' to exit.");
        var input = Console.ReadLine();
        if (input == "quit")
            _cancellationTokenSource.Cancel();
        await Task.Delay(500, ct);
    }

    private async Task InputActionAsync(CancellationToken ct)
    {
        Console.WriteLine("\n--- YOUR TURN ---");
        var player = _currentGameState?.Players.FirstOrDefault(p => p.PlayerId == _playerId);
        if (player == null) return;

        Console.WriteLine($"HP: {player.CurrentHp}/{player.MaxHp}, Mana: {player.CurrentMana}/{player.MaxMana}");
        Console.WriteLine("Actions: (1) Attack, (2) Ability, (3) Defend, (4) Skip");
        var input = Console.ReadLine();

        string? abilityName = null;
        string? targetId = null;

        switch (input)
        {
            case "1":
                targetId = await SelectTargetAsync();
                await SendActionAsync("Attack", targetId: targetId);
                break;

            case "2":
                abilityName = await SelectAbilityAsync(player.Class);
                targetId = await SelectTargetAsync();
                await SendActionAsync("Ability", abilityName, targetId);
                break;

            case "3":
                await SendActionAsync("Defend");
                break;

            case "4":
                await SendActionAsync("Skip");
                break;

            default:
                Console.WriteLine("Invalid input.");
                break;
        }
    }

    private async Task<string> SelectTargetAsync()
    {
        Console.WriteLine("\nSelect target:");
        var enemies = _currentGameState?.Players
            .Where(p => p.PlayerId != _playerId && p.IsAlive)
            .ToList() ?? new();

        for (int i = 0; i < enemies.Count; i++)
        {
            Console.WriteLine($"{i + 1}. {enemies[i].PlayerName} (HP: {enemies[i].CurrentHp})");
        }

        var input = Console.ReadLine();
        if (int.TryParse(input, out var choice) && choice > 0 && choice <= enemies.Count)
        {
            return enemies[choice - 1].PlayerId;
        }

        return enemies.FirstOrDefault()?.PlayerId ?? "";
    }

    private async Task<string> SelectAbilityAsync(string className)
    {
        var charClass = CharacterClass.Get(className);
        var abilities = charClass.GetAbilities();

        Console.WriteLine("\nSelect ability:");
        for (int i = 0; i < abilities.Count; i++)
        {
            Console.WriteLine($"{i + 1}. {abilities[i].Name} ({abilities[i].ManaCost} mana)");
        }

        var input = Console.ReadLine();
        if (int.TryParse(input, out var choice) && choice > 0 && choice <= abilities.Count)
        {
            return abilities[choice - 1].Name;
        }

        return abilities.First().Name;
    }

    private async Task SendActionAsync(string actionType, string? abilityName = null, string? targetId = null)
    {
        var actionMsg = new PlayerActionMessage
        {
            PlayerId = _playerId!,
            ActionType = actionType,
            AbilityName = abilityName,
            TargetPlayerId = targetId
        };

        await SendMessageAsync(actionMsg);
    }

    private async Task SendMessageAsync(MessageBase message)
    {
        try
        {
            var json = MessageSerializer.Serialize(message);
            await _writer?.WriteLineAsync(json)!;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SendMessage] Error: {ex.Message}");
        }
    }

    private void PrintGameState()
    {
        if (_currentGameState == null) return;

        Console.WriteLine("\n=== GAME STATE ===");
        Console.WriteLine($"Turn: {_currentGameState.TurnIndex}");
        Console.WriteLine($"Current Player: {_currentGameState.CurrentTurnPlayerId}");
        Console.WriteLine("\nPlayers:");

        foreach (var p in _currentGameState.Players)
        {
            var status = p.IsAlive ? "Alive" : "Dead";
            Console.WriteLine($"  {p.PlayerName} ({p.Class}): HP {p.CurrentHp}/{p.MaxHp}, Mana {p.CurrentMana}/{p.MaxMana} - {status}");
        }

        Console.WriteLine();
    }

    private void Disconnect()
    {
        try
        {
            if (_playerId != null)
            {
                var disconnectMsg = new DisconnectMessage
                {
                    PlayerId = _playerId,
                    Reason = "Player left"
                };
                var json = MessageSerializer.Serialize(disconnectMsg);
                _writer?.WriteLineAsync(json);
            }

            _reader?.Dispose();
            _writer?.Dispose();
            _networkStream?.Dispose();
            _tcpClient?.Dispose();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Disconnect] Error: {ex.Message}");
        }
    }
}
