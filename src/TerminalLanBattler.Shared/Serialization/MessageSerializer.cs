using System.Text.Json;
using System.Text.Json.Serialization;
using TerminalLanBattler.Shared.Messages;

namespace TerminalLanBattler.Shared.Serialization;

/// <summary>
/// Handles JSON serialization/deserialization of network messages.
/// Uses polymorphic deserialization based on MessageType field.
/// </summary>
public class MessageSerializer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Serialize a message to JSON.
    /// </summary>
    public static string Serialize(MessageBase message)
    {
        return JsonSerializer.Serialize(message, message.GetType(), JsonOptions);
    }

    /// <summary>
    /// Deserialize a message from JSON.
    /// Routes to correct type based on MessageType field.
    /// </summary>
    public static MessageBase? Deserialize(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("messageType", out var msgTypeElement))
                throw new JsonException("Message missing 'messageType' field.");

            string messageType = msgTypeElement.GetString() ?? throw new JsonException("messageType is null");

            var targetType = messageType switch
            {
                "Connect" => typeof(ConnectMessage),
                "ConnectResponse" => typeof(ConnectResponseMessage),
                "Disconnect" => typeof(DisconnectMessage),
                "JoinLobby" => typeof(JoinLobbyMessage),
                "LobbyState" => typeof(LobbyStateMessage),
                "StartMatch" => typeof(StartMatchMessage),
                "PlayerAction" => typeof(PlayerActionMessage),
                "StateUpdate" => typeof(StateUpdateMessage),
                "Heartbeat" => typeof(HeartbeatMessage),
                "ReconnectAttempt" => typeof(ReconnectAttemptMessage),
                "ReconnectResponse" => typeof(ReconnectResponseMessage),
                "Error" => typeof(ErrorMessage),
                "MatchResult" => typeof(MatchResultMessage),
                _ => throw new JsonException($"Unknown message type: {messageType}")
            };

            return (MessageBase?)JsonSerializer.Deserialize(json, targetType, JsonOptions);
        }
        catch (JsonException ex)
        {
            Console.Error.WriteLine($"[Deserialization Error] {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Validates JSON payload size to prevent DoS.
    /// Maximum 1 MB per message.
    /// </summary>
    public static bool ValidatePayloadSize(string json)
    {
        const int maxBytes = 1_000_000;
        return System.Text.Encoding.UTF8.GetByteCount(json) <= maxBytes;
    }
}
