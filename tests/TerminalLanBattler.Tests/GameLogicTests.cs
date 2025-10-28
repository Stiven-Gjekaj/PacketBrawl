using Xunit;
using TerminalLanBattler.Shared.Game;
using TerminalLanBattler.Shared.Messages;

namespace TerminalLanBattler.Tests;

/// <summary>
/// Unit tests for game logic: class abilities, state mutations, action validation.
/// </summary>
public class GameLogicTests
{
    [Fact]
    public void Test_WizardFireballDamage()
    {
        var wizard = new PlayerState
        {
            PlayerId = "p1",
            PlayerName = "Merlin",
            CharacterClass = "Wizard",
            MaxHp = 40,
            CurrentHp = 40,
            MaxMana = 100,
            CurrentMana = 100,
            Attack = 6,
            Defense = 2,
            Speed = 7
        };

        var target = new PlayerState
        {
            PlayerId = "p2",
            PlayerName = "Enemy",
            CharacterClass = "Knight",
            MaxHp = 100,
            CurrentHp = 100,
            Attack = 8,
            Defense = 6,
            Speed = 4
        };

        var gameState = new GameState { MatchId = "match1" };
        gameState.Players.Add(wizard);
        gameState.Players.Add(target);

        var processor = new ActionProcessor();
        var charClass = CharacterClass.Get("Wizard");
        var fireball = charClass.GetAbilities().First(a => a.Name == "Fireball");

        var result = processor.ProcessAction(gameState, "p1", "Ability", "Fireball", "p2");

        Assert.True(result.Success);
        Assert.True(target.CurrentHp < 100);
        Assert.True(wizard.CurrentMana < 100);
    }

    [Fact]
    public void Test_ShieldAbsorbesDamage()
    {
        var player = new PlayerState
        {
            PlayerId = "p1",
            PlayerName = "Knight",
            CharacterClass = "Knight",
            MaxHp = 100,
            CurrentHp = 100,
            MaxMana = 50,
            CurrentMana = 50,
            Defense = 6,
            Speed = 4
        };

        player.AddShield(15);

        int damageToTake = 20;
        int actualDamage = player.TakeDamage(damageToTake);

        Assert.True(actualDamage <= damageToTake);
        Assert.Equal(0, player.ShieldValue);
    }

    [Fact]
    public void Test_PlayerDeadWhenHpZero()
    {
        var player = new PlayerState
        {
            PlayerId = "p1",
            PlayerName = "Weak",
            CharacterClass = "Wizard",
            MaxHp = 10,
            CurrentHp = 10,
            Defense = 0
        };

        player.TakeDamage(15);

        Assert.Equal(0, player.CurrentHp);
        Assert.False(player.IsAlive);
    }

    [Fact]
    public void Test_TurnOrderBySpeed()
    {
        var gameState = new GameState { MatchId = "match1" };
        gameState.Players.Add(new PlayerState { PlayerId = "p1", Speed = 4, CharacterClass = "Knight", PlayerName = "Knight", MaxHp = 100, CurrentHp = 100 });
        gameState.Players.Add(new PlayerState { PlayerId = "p2", Speed = 9, CharacterClass = "Rogue", PlayerName = "Rogue", MaxHp = 55, CurrentHp = 55 });
        gameState.Players.Add(new PlayerState { PlayerId = "p3", Speed = 7, CharacterClass = "Wizard", PlayerName = "Wizard", MaxHp = 40, CurrentHp = 40 });

        gameState.TurnQueue = gameState.Players.OrderByDescending(p => p.Speed).Select(p => p.PlayerId).ToList();

        Assert.Equal("p2", gameState.TurnQueue[0]);
        Assert.Equal("p3", gameState.TurnQueue[1]);
        Assert.Equal("p1", gameState.TurnQueue[2]);
    }

    [Fact]
    public void Test_CooldownDecrement()
    {
        var player = new PlayerState
        {
            PlayerId = "p1",
            PlayerName = "Caster",
            CharacterClass = "Wizard",
            MaxHp = 40,
            CurrentHp = 40,
            Defense = 2,
            Speed = 7
        };

        player.AbilityCooldowns["Fireball"] = 2;

        player.DecrementCooldowns();
        player.DecrementCooldowns();

        Assert.Equal(0, player.AbilityCooldowns["Fireball"]);
    }

    [Fact]
    public void Test_MatchOverWhenOnlyOneAlive()
    {
        var gameState = new GameState { MatchId = "match1" };
        gameState.Players.Add(new PlayerState { PlayerId = "p1", CharacterClass = "Wizard", PlayerName = "P1", MaxHp = 40, CurrentHp = 0, IsAlive = false });
        gameState.Players.Add(new PlayerState { PlayerId = "p2", CharacterClass = "Knight", PlayerName = "P2", MaxHp = 100, CurrentHp = 50, IsAlive = true });
        gameState.Players.Add(new PlayerState { PlayerId = "p3", CharacterClass = "Archer", PlayerName = "P3", MaxHp = 60, CurrentHp = 0, IsAlive = false });

        bool isOver = gameState.IsMatchOver();
        var winner = gameState.GetWinner();

        Assert.True(isOver);
        Assert.Equal("p2", winner?.PlayerId);
    }

    [Fact]
    public void Test_AbilityManaRequirement()
    {
        var player = new PlayerState
        {
            PlayerId = "p1",
            PlayerName = "Wizard",
            CharacterClass = "Wizard",
            MaxHp = 40,
            CurrentHp = 40,
            MaxMana = 100,
            CurrentMana = 20
        };

        var charClass = CharacterClass.Get("Wizard");
        var fireball = charClass.GetAbilities().First(a => a.Name == "Fireball");

        bool canUse = player.CanUseAbility(fireball);

        Assert.False(canUse);
    }

    [Fact]
    public void Test_AllClassesHaveAbilities()
    {
        var classes = CharacterClass.GetAllClassNames();

        foreach (var className in classes)
        {
            var charClass = CharacterClass.Get(className);
            var abilities = charClass.GetAbilities();
            Assert.NotEmpty(abilities);
            Assert.True(abilities.Count >= 2, $"{className} should have at least 2 abilities");
        }
    }

    [Fact]
    public void Test_TurnAdvancement()
    {
        var gameState = new GameState { MatchId = "match1" };
        var p1 = new PlayerState { PlayerId = "p1", CharacterClass = "Wizard", PlayerName = "P1", MaxHp = 40, CurrentHp = 40, Speed = 5 };
        var p2 = new PlayerState { PlayerId = "p2", CharacterClass = "Knight", PlayerName = "P2", MaxHp = 100, CurrentHp = 100, Speed = 3 };
        gameState.Players.Add(p1);
        gameState.Players.Add(p2);
        gameState.TurnQueue = new() { "p1", "p2" };
        gameState.CurrentTurnQueueIndex = 0;

        var current = gameState.GetCurrentPlayer();
        Assert.Equal("p1", current?.PlayerId);

        gameState.AdvanceToNextTurn();
        current = gameState.GetCurrentPlayer();
        Assert.Equal("p2", current?.PlayerId);

        gameState.AdvanceToNextTurn();
        current = gameState.GetCurrentPlayer();
        Assert.Equal("p1", current?.PlayerId);
    }

    [Fact]
    public void Test_ActionInvalidOutOfTurn()
    {
        var gameState = new GameState { MatchId = "match1" };
        gameState.Players.Add(new PlayerState { PlayerId = "p1", CharacterClass = "Knight", PlayerName = "P1", MaxHp = 100, CurrentHp = 100, Speed = 5 });
        gameState.Players.Add(new PlayerState { PlayerId = "p2", CharacterClass = "Wizard", PlayerName = "P2", MaxHp = 40, CurrentHp = 40, Speed = 3 });
        gameState.TurnQueue = new() { "p1", "p2" };
        gameState.CurrentTurnQueueIndex = 0;

        var processor = new ActionProcessor();
        var result = processor.ProcessAction(gameState, "p2", "Attack", targetPlayerId: "p1");

        Assert.False(result.Success);
        Assert.Contains("not your turn", result.ErrorMessage?.ToLower() ?? "");
    }
}
