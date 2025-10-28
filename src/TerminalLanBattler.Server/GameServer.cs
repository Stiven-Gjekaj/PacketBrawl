using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using TerminalLanBattler.Shared.Game;
using TerminalLanBattler.Shared.Messages;
using TerminalLanBattler.Shared.Serialization;

namespace TerminalLanBattler.Server;

/// <summary>
/// Main server class handling connections, game state, and message routing.
/// Uses a background game loop to process turns and broadcast state.
/// Thread-safe: uses locks for shared state (gameState, connections).
/// </summary>
public class GameServer
{
    private readonly int _port;
    private readonly string _bindAddress;
    private readonly TcpListener _listener;
    private CancellationTokenSource _cancellationTokenSource = new();

    private GameState? _gameState;
    private readonly object _gameStateLock = new();

    private readonly ConcurrentDictionary<string, ClientConnection> _connections = new();

    private readonly HashSet<string> _lobbyPlayers = new();
    private readonly object _lobbyLock = new();

    private const int HeartbeatIntervalMs = 5000;
    private const int ReconnectWindowSec = 30;
    private const int MatchMinPlayers = 2;
    private const int MatchMaxPlayers = 6;

    public GameServer(int port, string bindAddress = "0.0.0.0")
    {
        _port = port;
        _bindAddress = bindAddress;
        _listener = new TcpListener(IPAddress.Parse(bindAddress), port);
    }

    /// <summary>
    /// Start the server: accept connections, run game loop.
    /// </summary>
    public async Task StartAsync()
    {
        try
        {
            _listener.Start();
            Console.WriteLine($"[Server] Listening on {_bindAddress}:{_port}");

            var acceptTask = AcceptConnectionsAsync(_cancellationTokenSource.Token);
            var gameLoopTask = GameLoopAsync(_cancellationTokenSource.Token);
            var heartbeatTask = HeartbeatLoopAsync(_cancellationTokenSource.Token);

            Console.WriteLine("[Server] Type 'quit' to stop.");
            while (true)
            {
                var input = Console.ReadLine();
                if (input?.Equals("quit", StringComparison.OrdinalIgnoreCase) == true)
                {
                    _cancellationTokenSource.Cancel();
                    break;
                }
            }

            await Task.WhenAll(acceptTask, gameLoopTask, heartbeatTask);
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("[Server] Shutdown initiated.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Server] Fatal error: {ex.Message}");
        }
        finally
        {
            _listener.Stop();
            _cancellationTokenSource.Dispose();
        }
    }

    /// <summary>
    /// Accept incoming client connections.
    /// </summary>
    private async Task AcceptConnectionsAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var tcpClient = await _listener.AcceptTcpClientAsync(ct);
                _ = HandleClientAsync(tcpClient, ct);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.WriteLine($"[AcceptConnections] Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Handle a single client connection: read messages, route to handlers.
    /// </summary>
    private async Task HandleClientAsync(TcpClient tcpClient, CancellationToken ct)
    {
        string? playerId = null;
        var clientConnection = new ClientConnection(tcpClient);

        try
        {
            var json = await clientConnection.ReadMessageAsync(ct);
            if (json == null)
            {
                Console.WriteLine("[HandleClient] Connection closed before Connect message.");
                return;
            }

            if (!MessageSerializer.ValidatePayloadSize(json))
            {
                await SendErrorAsync(clientConnection, "PayloadTooLarge", "Message exceeds size limit.");
                return;
            }

            var message = MessageSerializer.Deserialize(json);
            if (message is not ConnectMessage connectMsg)
            {
                await SendErrorAsync(clientConnection, "InvalidFirstMessage", "First message must be Connect.");
                return;
            }

            if (!CharacterClass.GetAllClassNames().Contains(connectMsg.ChosenClass))
            {
                await SendErrorAsync(clientConnection, "InvalidClass", $"Unknown class: {connectMsg.ChosenClass}");
                return;
            }

            playerId = Guid.NewGuid().ToString();
            clientConnection.PlayerId = playerId;
            clientConnection.PlayerName = connectMsg.PlayerName;
            clientConnection.CharacterClass = connectMsg.ChosenClass;

            _connections.TryAdd(playerId, clientConnection);
            lock (_lobbyLock)
            {
                _lobbyPlayers.Add(playerId);
            }

            await clientConnection.SendMessageAsync(new ConnectResponseMessage
            {
                PlayerId = playerId,
                Success = true
            }, ct);

            Console.WriteLine($"[Server] Player {connectMsg.PlayerName} ({playerId}) connected as {connectMsg.ChosenClass}");

            BroadcastLobbyState();

            while (!ct.IsCancellationRequested)
            {
                json = await clientConnection.ReadMessageAsync(ct);
                if (json == null)
                {
                    HandlePlayerDisconnect(playerId);
                    break;
                }

                if (!MessageSerializer.ValidatePayloadSize(json))
                {
                    await SendErrorAsync(clientConnection, "PayloadTooLarge", "Message exceeds size limit.");
                    continue;
                }

                var msg = MessageSerializer.Deserialize(json);
                if (msg == null) continue;

                await RouteMessageAsync(msg, playerId, clientConnection, ct);
            }
        }
        catch (OperationCanceledException) { }
        catch (IOException)
        {
            if (playerId != null)
                HandlePlayerDisconnect(playerId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[HandleClient] Error: {ex.Message}");
            if (playerId != null)
                HandlePlayerDisconnect(playerId);
        }
        finally
        {
            clientConnection.Dispose();
        }
    }

    /// <summary>
    /// Route incoming message to appropriate handler.
    /// </summary>
    private async Task RouteMessageAsync(
        MessageBase message,
        string playerId,
        ClientConnection clientConnection,
        CancellationToken ct)
    {
        try
        {
            switch (message)
            {
                case JoinLobbyMessage:
                    HandleJoinLobby(playerId);
                    break;

                case PlayerActionMessage actionMsg:
                    await HandlePlayerActionAsync(actionMsg, playerId, clientConnection, ct);
                    break;

                case HeartbeatMessage:
                    clientConnection.LastHeartbeat = DateTime.UtcNow;
                    break;

                case ReconnectAttemptMessage reconnectMsg:
                    await HandleReconnectAsync(reconnectMsg, clientConnection, ct);
                    break;

                case DisconnectMessage:
                    HandlePlayerDisconnect(playerId);
                    break;

                default:
                    await SendErrorAsync(clientConnection, "UnknownMessage", "Message type not recognized.");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RouteMessage] Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Handle join lobby request.
    /// </summary>
    private void HandleJoinLobby(string playerId)
    {
        lock (_lobbyLock)
        {
            _lobbyPlayers.Add(playerId);
        }
        BroadcastLobbyState();
        Console.WriteLine($"[Server] Player {playerId} joined lobby. ({_lobbyPlayers.Count}/{MatchMaxPlayers})");

        lock (_gameStateLock)
        {
            if (_gameState == null || _gameState.Status == MatchStatus.Completed)
            {
                if (_lobbyPlayers.Count >= MatchMinPlayers)
                {
                    StartMatch();
                }
            }
        }
    }

    /// <summary>
    /// Handle player action during match.
    /// </summary>
    private async Task HandlePlayerActionAsync(
        PlayerActionMessage actionMsg,
        string playerId,
        ClientConnection clientConnection,
        CancellationToken ct)
    {
        lock (_gameStateLock)
        {
            if (_gameState == null || _gameState.Status != MatchStatus.InProgress)
            {
                _ = SendErrorAsync(clientConnection, "MatchNotInProgress", "No match in progress.");
                return;
            }

            var processor = new ActionProcessor();
            var result = processor.ProcessAction(
                _gameState,
                playerId,
                actionMsg.ActionType,
                actionMsg.AbilityName,
                actionMsg.TargetPlayerId);

            if (!result.Success)
            {
                _ = SendErrorAsync(clientConnection, "ActionFailed", result.ErrorMessage ?? "");
                return;
            }

            _gameState.AdvanceToNextTurn();
            Console.WriteLine($"[Game] {result.Message}");

            if (_gameState.IsMatchOver())
            {
                var winner = _gameState.GetWinner();
                if (winner != null)
                {
                    _gameState.Status = MatchStatus.Completed;
                    _gameState.WinnerId = winner.PlayerId;
                    Console.WriteLine($"[Game] Match over! Winner: {winner.PlayerName}");
                }
            }
        }

        BroadcastGameState();
    }

    /// <summary>
    /// Handle reconnection attempt.
    /// </summary>
    private async Task HandleReconnectAsync(
        ReconnectAttemptMessage msg,
        ClientConnection clientConnection,
        CancellationToken ct)
    {
        lock (_gameStateLock)
        {
            if (_gameState == null)
            {
                _ = SendErrorAsync(clientConnection, "NoMatch", "No match in progress.");
                return;
            }

            var player = _gameState.Players.FirstOrDefault(p => p.PlayerId == msg.PlayerId);
            if (player == null)
            {
                _ = SendErrorAsync(clientConnection, "PlayerNotFound", "Player not found in match.");
                return;
            }

            _connections[msg.PlayerId] = clientConnection;
            clientConnection.PlayerId = msg.PlayerId;

            var response = new ReconnectResponseMessage
            {
                Success = true,
                CurrentStateVersion = _gameState.StateVersion,
                GameState = _gameState.CreateSnapshot()
            };

            _ = clientConnection.SendMessageAsync(response, ct);
        }
    }

    /// <summary>
    /// Handle player disconnect.
    /// </summary>
    private void HandlePlayerDisconnect(string playerId)
    {
        _connections.TryRemove(playerId, out _);

        lock (_lobbyLock)
        {
            _lobbyPlayers.Remove(playerId);
        }

        lock (_gameStateLock)
        {
            if (_gameState != null)
            {
                var player = _gameState.Players.FirstOrDefault(p => p.PlayerId == playerId);
                if (player != null)
                {
                    player.IsAlive = false;
                }
            }
        }

        Console.WriteLine($"[Server] Player {playerId} disconnected.");
        BroadcastLobbyState();
    }

    /// <summary>
    /// Game loop: processes turns at a fixed rate.
    /// </summary>
    private async Task GameLoopAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(100, ct);
            }
        }
        catch (OperationCanceledException) { }
    }

    /// <summary>
    /// Heartbeat loop: detect stale connections.
    /// </summary>
    private async Task HeartbeatLoopAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(HeartbeatIntervalMs, ct);

                var now = DateTime.UtcNow;
                var staleConnections = _connections
                    .Where(kvp => (now - kvp.Value.LastHeartbeat).TotalSeconds > 15)
                    .Select(kvp => kvp.Key)
                    .ToList();

                foreach (var id in staleConnections)
                {
                    Console.WriteLine($"[Server] Heartbeat timeout for player {id}");
                    HandlePlayerDisconnect(id);
                }

                var heartbeat = new HeartbeatMessage { SenderId = "Server" };
                var heartbeatJson = MessageSerializer.Serialize(heartbeat);

                foreach (var (_, connection) in _connections)
                {
                    _ = connection.SendRawAsync(heartbeatJson, ct);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.WriteLine($"[HeartbeatLoop] Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Start a match with players from the lobby.
    /// </summary>
    private void StartMatch()
    {
        lock (_lobbyLock)
        {
            if (_lobbyPlayers.Count < MatchMinPlayers) return;

            var selectedPlayers = _lobbyPlayers.Take(Math.Min(MatchMaxPlayers, _lobbyPlayers.Count)).ToList();
            _lobbyPlayers.Clear();

            var matchId = Guid.NewGuid().ToString();
            _gameState = new GameState { MatchId = matchId };

            foreach (var pid in selectedPlayers)
            {
                if (!_connections.TryGetValue(pid, out var conn)) continue;

                var charClass = CharacterClass.Get(conn.CharacterClass);
                var playerState = new PlayerState
                {
                    PlayerId = pid,
                    PlayerName = conn.PlayerName,
                    CharacterClass = conn.CharacterClass,
                    MaxHp = charClass.BaseHp,
                    CurrentHp = charClass.BaseHp,
                    MaxMana = charClass.BaseMana,
                    CurrentMana = charClass.BaseMana,
                    Attack = charClass.BaseAttack,
                    Defense = charClass.BaseDefense,
                    Speed = charClass.BaseSpeed
                };

                _gameState.Players.Add(playerState);
            }

            var turnQueue = _gameState.Players.OrderByDescending(p => p.Speed).Select(p => p.PlayerId).ToList();
            _gameState.TurnQueue = turnQueue;
            _gameState.Status = MatchStatus.InProgress;
            _gameState.StateVersion = 1;

            Console.WriteLine($"[Server] Match {matchId} started with {selectedPlayers.Count} players");
        }

        BroadcastGameState();
    }

    /// <summary>
    /// Broadcast lobby state to all connected clients.
    /// </summary>
    private void BroadcastLobbyState()
    {
        lock (_lobbyLock)
        {
            var lobbyInfo = new List<PlayerLobbyInfo>();
            foreach (var pid in _lobbyPlayers)
            {
                if (_connections.TryGetValue(pid, out var conn))
                {
                    lobbyInfo.Add(new PlayerLobbyInfo
                    {
                        PlayerId = pid,
                        PlayerName = conn.PlayerName,
                        Class = conn.CharacterClass,
                        IsReady = true
                    });
                }
            }

            var message = new LobbyStateMessage
            {
                Players = lobbyInfo,
                MatchStarted = false,
                MaxPlayers = MatchMaxPlayers
            };

            BroadcastToAll(message);
        }
    }

    /// <summary>
    /// Broadcast game state to all connected clients.
    /// </summary>
    private void BroadcastGameState()
    {
        lock (_gameStateLock)
        {
            if (_gameState == null) return;

            var snapshot = _gameState.CreateSnapshot();
            var message = new StateUpdateMessage
            {
                StateVersion = _gameState.StateVersion,
                GameState = snapshot,
                ActionLog = new()
            };

            BroadcastToAll(message);

            if (_gameState.Status == MatchStatus.Completed && _gameState.WinnerId != null)
            {
                var winner = _gameState.Players.FirstOrDefault(p => p.PlayerId == _gameState.WinnerId);
                if (winner != null)
                {
                    var resultMsg = new MatchResultMessage
                    {
                        WinnerId = winner.PlayerId,
                        WinnerName = winner.PlayerName,
                        FinalRanking = _gameState.Players
                            .OrderByDescending(p => p.CurrentHp)
                            .Select((p, i) => new PlayerRankInfo
                            {
                                PlayerId = p.PlayerId,
                                PlayerName = p.PlayerName,
                                Rank = i + 1,
                                FinalHp = p.CurrentHp
                            })
                            .ToList()
                    };

                    BroadcastToAll(resultMsg);
                }
            }
        }
    }

    /// <summary>
    /// Send a message to all connected clients.
    /// </summary>
    private void BroadcastToAll(MessageBase message)
    {
        var json = MessageSerializer.Serialize(message);
        var ct = CancellationToken.None;

        foreach (var (_, connection) in _connections)
        {
            _ = connection.SendRawAsync(json, ct);
        }
    }

    /// <summary>
    /// Send an error message to a single client.
    /// </summary>
    private async Task SendErrorAsync(ClientConnection connection, string errorCode, string details)
    {
        var errorMsg = new ErrorMessage
        {
            ErrorCode = errorCode,
            Details = details,
            Fatal = false
        };

        await connection.SendMessageAsync(errorMsg, CancellationToken.None);
    }
}

/// <summary>
/// Represents a connected client's TCP connection and state.
/// Thread-safe for read operations; call SendMessage under client thread.
/// </summary>
public class ClientConnection : IDisposable
{
    private readonly TcpClient _tcpClient;
    private readonly NetworkStream _networkStream;
    private readonly StreamReader _reader;
    private readonly StreamWriter _writer;
    private readonly SemaphoreSlim _writeSemaphore = new(1, 1);

    public string PlayerId { get; set; } = "";
    public string PlayerName { get; set; } = "";
    public string CharacterClass { get; set; } = "";
    public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;

    public ClientConnection(TcpClient tcpClient)
    {
        _tcpClient = tcpClient;
        _networkStream = tcpClient.GetStream();
        _reader = new StreamReader(_networkStream);
        _writer = new StreamWriter(_networkStream) { AutoFlush = true };
    }

    /// <summary>
    /// Read a message line from the client (assumes newline-delimited JSON).
    /// </summary>
    public async Task<string?> ReadMessageAsync(CancellationToken ct)
    {
        try
        {
            return await _reader.ReadLineAsync(ct);
        }
        catch (OperationCanceledException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
    }

    /// <summary>
    /// Send a message (serialized to JSON) to the client.
    /// </summary>
    public async Task SendMessageAsync(MessageBase message, CancellationToken ct)
    {
        var json = MessageSerializer.Serialize(message);
        await SendRawAsync(json, ct);
    }

    /// <summary>
    /// Send raw JSON line to client.
    /// </summary>
    public async Task SendRawAsync(string json, CancellationToken ct)
    {
        try
        {
            await _writeSemaphore.WaitAsync(ct);
            try
            {
                await _writer.WriteLineAsync(json);
                LastHeartbeat = DateTime.UtcNow;
            }
            finally
            {
                _writeSemaphore.Release();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ClientConnection.SendRaw] Error: {ex.Message}");
        }
    }

    public void Dispose()
    {
        _reader?.Dispose();
        _writer?.Dispose();
        _networkStream?.Dispose();
        _tcpClient?.Dispose();
        _writeSemaphore?.Dispose();
    }
}
