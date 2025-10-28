namespace TerminalLanBattler.Shared.Messages;

/// <summary>
/// Base class for all network messages. Ensures type safety and versioning.
/// </summary>
public abstract class MessageBase
{
    /// <summary>
    /// Message type identifier (e.g., "Connect", "PlayerAction", "StateUpdate").
    /// Used for deserialization routing on both client and server.
    /// </summary>
    public abstract string MessageType { get; }

    /// <summary>
    /// Timestamp when the message was created (server time).
    /// Helps detect stale messages and synchronize clocks.
    /// </summary>
    public long CreatedAtUtcTicks { get; set; } = DateTime.UtcNow.Ticks;
}

/// <summary>
/// Connect message: client initiates connection to server.
/// </summary>
public class ConnectMessage : MessageBase
{
    public override string MessageType => "Connect";
    public required string PlayerName { get; set; }
    public required string ChosenClass { get; set; }
    public string ClientVersion { get; set; } = "1.0.0";
}

/// <summary>
/// ConnectResponse message: server acknowledges connection, assigns player ID.
/// </summary>
public class ConnectResponseMessage : MessageBase
{
    public override string MessageType => "ConnectResponse";
    public required string PlayerId { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Disconnect message: player intentionally leaves the match.
/// </summary>
public class DisconnectMessage : MessageBase
{
    public override string MessageType => "Disconnect";
    public required string PlayerId { get; set; }
    public string Reason { get; set; } = "Player left";
}

/// <summary>
/// JoinLobby message: player joins the waiting lobby before a match starts.
/// </summary>
public class JoinLobbyMessage : MessageBase
{
    public override string MessageType => "JoinLobby";
    public required string PlayerId { get; set; }
}

/// <summary>
/// LobbyState message: server broadcasts current lobby status (players ready, match state).
/// </summary>
public class LobbyStateMessage : MessageBase
{
    public override string MessageType => "LobbyState";
    public List<PlayerLobbyInfo> Players { get; set; } = new();
    public bool MatchStarted { get; set; }
    public int MaxPlayers { get; set; } = 6;
}

public class PlayerLobbyInfo
{
    public required string PlayerId { get; set; }
    public required string PlayerName { get; set; }
    public required string Class { get; set; }
    public bool IsReady { get; set; }
}

/// <summary>
/// StartMatch message: server notifies all clients that the match has begun.
/// </summary>
public class StartMatchMessage : MessageBase
{
    public override string MessageType => "StartMatch";
    public int StateVersion { get; set; }
    public required GameStateSnapshot GameState { get; set; }
}

/// <summary>
/// PlayerAction message: client sends intended action to server for validation and processing.
/// </summary>
public class PlayerActionMessage : MessageBase
{
    public override string MessageType => "PlayerAction";
    public required string PlayerId { get; set; }
    public required string ActionType { get; set; }
    public string? AbilityName { get; set; }
    public string? TargetPlayerId { get; set; }
}

/// <summary>
/// StateUpdate message: server broadcasts updated game state to all clients.
/// </summary>
public class StateUpdateMessage : MessageBase
{
    public override string MessageType => "StateUpdate";
    public int StateVersion { get; set; }
    public required GameStateSnapshot GameState { get; set; }
    public List<ActionLogEntry> ActionLog { get; set; } = new();
}

public class ActionLogEntry
{
    public required string ActorId { get; set; }
    public required string Action { get; set; }
    public int DamageDealt { get; set; }
    public int HealingDone { get; set; }
    public string? TargetId { get; set; }
}

/// <summary>
/// GameStateSnapshot: authoritative snapshot of game state sent from server to clients.
/// </summary>
public class GameStateSnapshot
{
    public required string MatchId { get; set; }
    public List<PlayerSnapshot> Players { get; set; } = new();
    public int TurnIndex { get; set; }
    public string? CurrentTurnPlayerId { get; set; }
    public string MatchStatus { get; set; } = "InProgress";
    public string? WinnerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PlayerSnapshot
{
    public required string PlayerId { get; set; }
    public required string PlayerName { get; set; }
    public required string Class { get; set; }
    public int CurrentHp { get; set; }
    public int MaxHp { get; set; }
    public int CurrentMana { get; set; }
    public int MaxMana { get; set; }
    public int Defense { get; set; }
    public int Attack { get; set; }
    public int Speed { get; set; }
    public bool IsAlive { get; set; } = true;
    public int ShieldValue { get; set; }
    public Dictionary<string, int> AbilityCooldowns { get; set; } = new();
}

/// <summary>
/// Heartbeat message: periodic ping to detect connection drops.
/// </summary>
public class HeartbeatMessage : MessageBase
{
    public override string MessageType => "Heartbeat";
    public required string SenderId { get; set; }
}

/// <summary>
/// ReconnectAttempt message: client tries to rejoin after temporary disconnect.
/// </summary>
public class ReconnectAttemptMessage : MessageBase
{
    public override string MessageType => "ReconnectAttempt";
    public required string PlayerId { get; set; }
    public int LastKnownStateVersion { get; set; }
}

/// <summary>
/// ReconnectResponse message: server confirms or rejects reconnection.
/// </summary>
public class ReconnectResponseMessage : MessageBase
{
    public override string MessageType => "ReconnectResponse";
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int? CurrentStateVersion { get; set; }
    public GameStateSnapshot? GameState { get; set; }
}

/// <summary>
/// Error message: server notifies client of an error condition.
/// </summary>
public class ErrorMessage : MessageBase
{
    public override string MessageType => "Error";
    public required string ErrorCode { get; set; }
    public required string Details { get; set; }
    public bool Fatal { get; set; } = false;
}

/// <summary>
/// MatchResult message: server notifies all clients of the match outcome.
/// </summary>
public class MatchResultMessage : MessageBase
{
    public override string MessageType => "MatchResult";
    public required string WinnerId { get; set; }
    public required string WinnerName { get; set; }
    public List<PlayerRankInfo> FinalRanking { get; set; } = new();
}

public class PlayerRankInfo
{
    public required string PlayerId { get; set; }
    public required string PlayerName { get; set; }
    public int Rank { get; set; }
    public int FinalHp { get; set; }
    public int DamageDealt { get; set; }
}
