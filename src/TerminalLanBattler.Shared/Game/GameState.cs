namespace TerminalLanBattler.Shared.Game;

/// <summary>
/// Authoritative game state, maintained only on the server.
/// All state mutations happen here, then broadcast as snapshots to clients.
/// NOT thread-safe by itself; wrap in synchronization on server.
/// </summary>
public class GameState
{
    public required string MatchId { get; init; }
    public List<PlayerState> Players { get; set; } = new();
    public int StateVersion { get; set; } = 0;
    public int TurnIndex { get; set; } = 0;
    public List<string> TurnQueue { get; set; } = new();
    public int CurrentTurnQueueIndex { get; set; } = 0;
    public MatchStatus Status { get; set; } = MatchStatus.Lobby;
    public string? WinnerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Get the player whose turn it is now.
    /// </summary>
    public PlayerState? GetCurrentPlayer()
    {
        if (TurnQueue.Count == 0 || CurrentTurnQueueIndex >= TurnQueue.Count)
            return null;

        var playerId = TurnQueue[CurrentTurnQueueIndex];
        return Players.FirstOrDefault(p => p.PlayerId == playerId);
    }

    /// <summary>
    /// Advance to the next player's turn, skipping dead players.
    /// </summary>
    public void AdvanceToNextTurn()
    {
        CurrentTurnQueueIndex++;

        if (CurrentTurnQueueIndex >= TurnQueue.Count)
        {
            CurrentTurnQueueIndex = 0;
            TurnIndex++;
        }

        int attempts = 0;
        while (attempts < TurnQueue.Count)
        {
            var current = GetCurrentPlayer();
            if (current?.IsAlive == true)
                break;

            CurrentTurnQueueIndex++;
            if (CurrentTurnQueueIndex >= TurnQueue.Count)
            {
                CurrentTurnQueueIndex = 0;
                TurnIndex++;
            }
            attempts++;
        }
    }

    /// <summary>
    /// Check for match completion (only one player alive).
    /// </summary>
    public bool IsMatchOver()
    {
        var alivePlayers = Players.Count(p => p.IsAlive);
        return alivePlayers <= 1;
    }

    /// <summary>
    /// Get the winning player if match is over.
    /// </summary>
    public PlayerState? GetWinner()
    {
        if (!IsMatchOver()) return null;
        return Players.FirstOrDefault(p => p.IsAlive);
    }

    /// <summary>
    /// Create a snapshot for broadcast to clients.
    /// </summary>
    public GameStateSnapshot CreateSnapshot()
    {
        return new GameStateSnapshot
        {
            MatchId = MatchId,
            Players = Players.Select(p => new PlayerSnapshot
            {
                PlayerId = p.PlayerId,
                PlayerName = p.PlayerName,
                Class = p.CharacterClass,
                CurrentHp = p.CurrentHp,
                MaxHp = p.MaxHp,
                CurrentMana = p.CurrentMana,
                MaxMana = p.MaxMana,
                Defense = p.Defense,
                Attack = p.Attack,
                Speed = p.Speed,
                IsAlive = p.IsAlive,
                ShieldValue = p.ShieldValue,
                AbilityCooldowns = new Dictionary<string, int>(p.AbilityCooldowns)
            }).ToList(),
            TurnIndex = TurnIndex,
            CurrentTurnPlayerId = GetCurrentPlayer()?.PlayerId,
            MatchStatus = Status.ToString(),
            WinnerId = WinnerId,
            CreatedAt = DateTime.UtcNow
        };
    }
}

public enum MatchStatus
{
    Lobby,
    InProgress,
    Completed
}

/// <summary>
/// Represents a single player's state during a match.
/// Mutable, server-authoritative.
/// </summary>
public class PlayerState
{
    public required string PlayerId { get; init; }
    public required string PlayerName { get; init; }
    public required string CharacterClass { get; init; }
    public int MaxHp { get; set; }
    public int CurrentHp { get; set; }
    public int MaxMana { get; set; }
    public int CurrentMana { get; set; }
    public int Attack { get; set; }
    public int Defense { get; set; }
    public int Speed { get; set; }
    public bool IsAlive { get; set; } = true;
    public int ShieldValue { get; set; } = 0;
    public Dictionary<string, int> AbilityCooldowns { get; set; } = new();

    /// <summary>
    /// Applies damage to the player, accounting for shield and defense.
    /// </summary>
    public int TakeDamage(int rawDamage)
    {
        if (!IsAlive) return 0;

        int shieldAbsorbed = Math.Min(ShieldValue, rawDamage);
        ShieldValue -= shieldAbsorbed;
        rawDamage -= shieldAbsorbed;

        int mitigated = (int)Math.Ceiling(Defense * 0.5);
        int actualDamage = Math.Max(1, rawDamage - mitigated);

        CurrentHp -= actualDamage;
        if (CurrentHp <= 0)
        {
            CurrentHp = 0;
            IsAlive = false;
        }

        return actualDamage + shieldAbsorbed;
    }

    /// <summary>
    /// Restore mana, capped at max.
    /// </summary>
    public void RestoreMana(int amount)
    {
        CurrentMana = Math.Min(MaxMana, CurrentMana + amount);
    }

    /// <summary>
    /// Spend mana (assumes validation already done).
    /// </summary>
    public bool SpendMana(int amount)
    {
        if (CurrentMana < amount) return false;
        CurrentMana -= amount;
        return true;
    }

    /// <summary>
    /// Add shield (stacks, no cap).
    /// </summary>
    public void AddShield(int amount)
    {
        ShieldValue += amount;
    }

    /// <summary>
    /// Decrement all cooldowns by 1 turn.
    /// </summary>
    public void DecrementCooldowns()
    {
        var cooldownsToDecrement = AbilityCooldowns.Where(kvp => kvp.Value > 0).ToList();
        foreach (var (abilityName, cooldown) in cooldownsToDecrement)
        {
            AbilityCooldowns[abilityName] = cooldown - 1;
        }
    }

    /// <summary>
    /// Check if an ability is available (off cooldown and enough mana).
    /// </summary>
    public bool CanUseAbility(Ability ability)
    {
        if (CurrentMana < ability.ManaCost) return false;
        if (!AbilityCooldowns.ContainsKey(ability.Name)) return true;
        return AbilityCooldowns[ability.Name] == 0;
    }

    /// <summary>
    /// Start an ability's cooldown.
    /// </summary>
    public void StartAbilityCooldown(Ability ability)
    {
        AbilityCooldowns[ability.Name] = ability.Cooldown;
    }
}
