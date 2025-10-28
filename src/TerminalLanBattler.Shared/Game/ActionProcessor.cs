namespace TerminalLanBattler.Shared.Game;

/// <summary>
/// Processes player actions on the server side.
/// Validates all action legality and applies state mutations.
/// NOT thread-safe; call from game loop only.
/// </summary>
public class ActionProcessor
{
    /// <summary>
    /// Process a player action and return the result (success, error, or effect).
    /// Updates game state if successful.
    /// </summary>
    public ActionResult ProcessAction(
        GameState gameState,
        string playerId,
        string actionType,
        string? abilityName = null,
        string? targetPlayerId = null)
    {
        var currentPlayer = gameState.GetCurrentPlayer();
        if (currentPlayer?.PlayerId != playerId)
        {
            return new ActionResult
            {
                Success = false,
                ErrorMessage = "It is not your turn."
            };
        }

        return actionType switch
        {
            "Attack" => ProcessAttack(gameState, currentPlayer, targetPlayerId),
            "Ability" => ProcessAbility(gameState, currentPlayer, abilityName, targetPlayerId),
            "Defend" => ProcessDefend(gameState, currentPlayer),
            "Skip" => ProcessSkip(gameState, currentPlayer),
            _ => new ActionResult { Success = false, ErrorMessage = "Unknown action type." }
        };
    }

    private ActionResult ProcessAttack(GameState gameState, PlayerState attacker, string? targetId)
    {
        if (string.IsNullOrEmpty(targetId))
            return new ActionResult { Success = false, ErrorMessage = "No target specified." };

        var target = gameState.Players.FirstOrDefault(p => p.PlayerId == targetId);
        if (target == null)
            return new ActionResult { Success = false, ErrorMessage = "Target not found." };
        if (!target.IsAlive)
            return new ActionResult { Success = false, ErrorMessage = "Target is dead." };
        if (target.PlayerId == attacker.PlayerId)
            return new ActionResult { Success = false, ErrorMessage = "Cannot attack yourself." };

        int baseDamage = attacker.Attack + Random.Shared.Next(-2, 3);
        int actualDamage = target.TakeDamage(baseDamage);

        gameState.StateVersion++;
        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} attacked {target.PlayerName} for {actualDamage} damage.",
            DamageDealt = actualDamage,
            TargetId = targetId
        };
    }

    private ActionResult ProcessAbility(
        GameState gameState,
        PlayerState attacker,
        string? abilityName,
        string? targetId)
    {
        if (string.IsNullOrEmpty(abilityName))
            return new ActionResult { Success = false, ErrorMessage = "No ability specified." };

        var charClass = CharacterClass.Get(attacker.CharacterClass);
        var ability = charClass.GetAbilities().FirstOrDefault(a => a.Name == abilityName);
        if (ability == null)
            return new ActionResult { Success = false, ErrorMessage = "Ability not found." };

        if (!attacker.CanUseAbility(ability))
        {
            if (attacker.CurrentMana < ability.ManaCost)
                return new ActionResult { Success = false, ErrorMessage = "Not enough mana." };
            else
                return new ActionResult { Success = false, ErrorMessage = "Ability on cooldown." };
        }

        attacker.SpendMana(ability.ManaCost);
        attacker.StartAbilityCooldown(ability);

        var result = ability.Type switch
        {
            AbilityType.SingleTarget => ProcessSingleTargetAbility(gameState, attacker, ability, targetId),
            AbilityType.Aoe => ProcessAoeAbility(gameState, attacker, ability),
            AbilityType.Shield => ProcessShieldAbility(gameState, attacker, ability),
            AbilityType.Buff => ProcessBuffAbility(gameState, attacker, ability),
            AbilityType.Heal => ProcessHealAbility(gameState, attacker, ability, targetId),
            _ => new ActionResult { Success = false, ErrorMessage = "Unknown ability type." }
        };

        gameState.StateVersion++;
        return result;
    }

    private ActionResult ProcessSingleTargetAbility(
        GameState gameState,
        PlayerState attacker,
        Ability ability,
        string? targetId)
    {
        if (string.IsNullOrEmpty(targetId))
            return new ActionResult { Success = false, ErrorMessage = "No target specified." };

        var target = gameState.Players.FirstOrDefault(p => p.PlayerId == targetId);
        if (target == null)
            return new ActionResult { Success = false, ErrorMessage = "Target not found." };
        if (!target.IsAlive)
            return new ActionResult { Success = false, ErrorMessage = "Target is dead." };

        int actualDamage = target.TakeDamage(ability.BaseEffect);
        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} cast {ability.Name} on {target.PlayerName} for {actualDamage} damage.",
            DamageDealt = actualDamage,
            TargetId = targetId
        };
    }

    private ActionResult ProcessAoeAbility(GameState gameState, PlayerState attacker, Ability ability)
    {
        var enemies = gameState.Players
            .Where(p => p.IsAlive && p.PlayerId != attacker.PlayerId)
            .ToList();

        if (!enemies.Any())
            return new ActionResult { Success = false, ErrorMessage = "No valid targets." };

        int totalDamage = 0;
        foreach (var enemy in enemies)
        {
            int damage = enemy.TakeDamage(ability.BaseEffect);
            totalDamage += damage;
        }

        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} cast {ability.Name}, hitting {enemies.Count} enemies for {totalDamage} total damage.",
            DamageDealt = totalDamage
        };
    }

    private ActionResult ProcessShieldAbility(GameState gameState, PlayerState attacker, Ability ability)
    {
        attacker.AddShield(ability.BaseEffect);
        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} gained {ability.BaseEffect} shield.",
            TargetId = attacker.PlayerId
        };
    }

    private ActionResult ProcessBuffAbility(GameState gameState, PlayerState attacker, Ability ability)
    {
        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} activated {ability.Name}.",
            TargetId = attacker.PlayerId
        };
    }

    private ActionResult ProcessHealAbility(
        GameState gameState,
        PlayerState attacker,
        Ability ability,
        string? targetId)
    {
        var target = string.IsNullOrEmpty(targetId)
            ? attacker
            : gameState.Players.FirstOrDefault(p => p.PlayerId == targetId);

        if (target == null)
            return new ActionResult { Success = false, ErrorMessage = "Target not found." };

        int healAmount = Math.Min(ability.BaseEffect, target.MaxHp - target.CurrentHp);
        target.CurrentHp += healAmount;

        return new ActionResult
        {
            Success = true,
            Message = $"{attacker.PlayerName} healed {target.PlayerName} for {healAmount} HP.",
            TargetId = targetId ?? attacker.PlayerId
        };
    }

    private ActionResult ProcessDefend(GameState gameState, PlayerState defender)
    {
        defender.Defense += 3;
        return new ActionResult
        {
            Success = true,
            Message = $"{defender.PlayerName} took a defensive stance (+3 Defense).",
            TargetId = defender.PlayerId
        };
    }

    private ActionResult ProcessSkip(GameState gameState, PlayerState player)
    {
        return new ActionResult
        {
            Success = true,
            Message = $"{player.PlayerName} skipped their turn.",
            TargetId = player.PlayerId
        };
    }
}

public class ActionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public string? ErrorMessage { get; set; }
    public int DamageDealt { get; set; }
    public string? TargetId { get; set; }
}
