using Xunit;
using TerminalLanBattler.Shared.Messages;
using TerminalLanBattler.Shared.Serialization;

namespace TerminalLanBattler.Tests;

/// <summary>
/// Tests for message serialization and deserialization.
/// </summary>
public class SerializationTests
{
    [Fact]
    public void Test_SerializeConnectMessage()
    {
        var msg = new ConnectMessage
        {
            PlayerName = "Alice",
            ChosenClass = "Wizard"
        };

        var json = MessageSerializer.Serialize(msg);
        var deserialized = MessageSerializer.Deserialize(json) as ConnectMessage;

        Assert.NotNull(deserialized);
        Assert.Equal("Alice", deserialized.PlayerName);
        Assert.Equal("Wizard", deserialized.ChosenClass);
        Assert.Equal("Connect", deserialized.MessageType);
    }

    [Fact]
    public void Test_SerializePlayerActionMessage()
    {
        var msg = new PlayerActionMessage
        {
            PlayerId = "p1",
            ActionType = "Ability",
            AbilityName = "Fireball",
            TargetPlayerId = "p2"
        };

        var json = MessageSerializer.Serialize(msg);
        var deserialized = MessageSerializer.Deserialize(json) as PlayerActionMessage;

        Assert.NotNull(deserialized);
        Assert.Equal("p1", deserialized.PlayerId);
        Assert.Equal("Ability", deserialized.ActionType);
        Assert.Equal("Fireball", deserialized.AbilityName);
    }

    [Fact]
    public void Test_PayloadSizeValidation()
    {
        var smallMsg = new ConnectMessage { PlayerName = "A", ChosenClass = "Wizard" };
        var smallJson = MessageSerializer.Serialize(smallMsg);

        var largeJson = new string('X', 1_000_001);

        Assert.True(MessageSerializer.ValidatePayloadSize(smallJson));
        Assert.False(MessageSerializer.ValidatePayloadSize(largeJson));
    }

    [Fact]
    public void Test_DeserializeGameStateSnapshot()
    {
        var snapshot = new GameStateSnapshot
        {
            MatchId = "match1",
            TurnIndex = 5,
            CurrentTurnPlayerId = "p1",
            MatchStatus = "InProgress",
            Players = new()
            {
                new PlayerSnapshot
                {
                    PlayerId = "p1",
                    PlayerName = "Alice",
                    Class = "Wizard",
                    CurrentHp = 30,
                    MaxHp = 40,
                    IsAlive = true
                }
            }
        };

        var msg = new StateUpdateMessage
        {
            StateVersion = 1,
            GameState = snapshot
        };

        var json = MessageSerializer.Serialize(msg);
        var deserialized = MessageSerializer.Deserialize(json) as StateUpdateMessage;

        Assert.NotNull(deserialized);
        Assert.Equal("match1", deserialized.GameState.MatchId);
        Assert.Single(deserialized.GameState.Players);
        Assert.Equal("Alice", deserialized.GameState.Players[0].PlayerName);
    }

    [Fact]
    public void Test_UnknownMessageTypeThrows()
    {
        var invalidJson = @"{ ""messageType"": ""UnknownType"" }";

        var result = MessageSerializer.Deserialize(invalidJson);
        Assert.Null(result);
    }
}
