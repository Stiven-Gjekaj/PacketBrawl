namespace TerminalLanBattler.Shared.Game;

/// <summary>
/// Defines character classes and their base stats.
/// Each class has unique abilities, scaling, and resources.
/// </summary>
public abstract class CharacterClass
{
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required int BaseHp { get; init; }
    public required int BaseAttack { get; init; }
    public required int BaseDefense { get; init; }
    public required int BaseSpeed { get; init; }
    public required int BaseMana { get; init; }
    public abstract List<Ability> GetAbilities();

    public static CharacterClass Get(string className)
    {
        return className switch
        {
            "Wizard" => new WizardClass(),
            "Knight" => new KnightClass(),
            "Archer" => new ArcherClass(),
            "Rogue" => new RogueClass(),
            _ => throw new ArgumentException($"Unknown class: {className}")
        };
    }

    public static List<string> GetAllClassNames() => new() { "Wizard", "Knight", "Archer", "Rogue" };
}

/// <summary>
/// Wizard: Mana-based caster with AoE and single-target spells.
/// High mana pool, moderate attack, low HP, low defense.
/// </summary>
public class WizardClass : CharacterClass
{
    public WizardClass()
    {
        Name = "Wizard";
        Description = "Mana-based spellcaster with AoE and single-target damage.";
        BaseHp = 40;
        BaseAttack = 6;
        BaseDefense = 2;
        BaseSpeed = 7;
        BaseMana = 100;
    }

    public override List<Ability> GetAbilities() => new()
    {
        new Ability
        {
            Name = "Fireball",
            Description = "Single-target fire spell dealing 20 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 30,
            Cooldown = 1,
            BaseEffect = 20
        },
        new Ability
        {
            Name = "Inferno",
            Description = "AoE spell damaging all enemies for 12 damage each.",
            Type = AbilityType.Aoe,
            ManaCost = 50,
            Cooldown = 2,
            BaseEffect = 12
        },
        new Ability
        {
            Name = "Arcane Shield",
            Description = "Grant self 15 shield points.",
            Type = AbilityType.Shield,
            ManaCost = 25,
            Cooldown = 2,
            BaseEffect = 15
        }
    };
}

/// <summary>
/// Knight: Tank with high HP, defense, and crowd control.
/// Low attack, low speed, melee-focused.
/// </summary>
public class KnightClass : CharacterClass
{
    public KnightClass()
    {
        Name = "Knight";
        Description = "Tank with high HP and defense. Good at protecting allies.";
        BaseHp = 100;
        BaseAttack = 8;
        BaseDefense = 6;
        BaseSpeed = 4;
        BaseMana = 50;
    }

    public override List<Ability> GetAbilities() => new()
    {
        new Ability
        {
            Name = "Shield Bash",
            Description = "Melee attack dealing 15 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 20,
            Cooldown = 1,
            BaseEffect = 15
        },
        new Ability
        {
            Name = "Guardian's Stance",
            Description = "Gain 8 defense for 2 turns.",
            Type = AbilityType.Buff,
            ManaCost = 30,
            Cooldown = 3,
            BaseEffect = 8
        },
        new Ability
        {
            Name = "Taunt",
            Description = "Force all enemies to target you for next turn.",
            Type = AbilityType.Taunt,
            ManaCost = 25,
            Cooldown = 2,
            BaseEffect = 0
        }
    };
}

/// <summary>
/// Archer: Ranged attacker with critical hits and target marking.
/// Medium HP, medium attack, high speed.
/// </summary>
public class ArcherClass : CharacterClass
{
    public ArcherClass()
    {
        Name = "Archer";
        Description = "Ranged attacker with critical strikes and marking abilities.";
        BaseHp = 60;
        BaseAttack = 10;
        BaseDefense = 3;
        BaseSpeed = 8;
        BaseMana = 70;
    }

    public override List<Ability> GetAbilities() => new()
    {
        new Ability
        {
            Name = "Quick Shot",
            Description = "Fast ranged attack dealing 12 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 15,
            Cooldown = 1,
            BaseEffect = 12
        },
        new Ability
        {
            Name = "Piercing Arrow",
            Description = "Powerful shot dealing 18 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 35,
            Cooldown = 2,
            BaseEffect = 18
        },
        new Ability
        {
            Name = "Mark Target",
            Description = "Mark a target for 2 turns.",
            Type = AbilityType.Debuff,
            ManaCost = 20,
            Cooldown = 2,
            BaseEffect = 0
        }
    };
}

/// <summary>
/// Rogue: High evasion, single-target burst damage, cooldown-based.
/// Medium HP, high attack, high speed, low defense.
/// </summary>
public class RogueClass : CharacterClass
{
    public RogueClass()
    {
        Name = "Rogue";
        Description = "Quick and deadly, with burst damage and evasion.";
        BaseHp = 55;
        BaseAttack = 12;
        BaseDefense = 2;
        BaseSpeed = 9;
        BaseMana = 60;
    }

    public override List<Ability> GetAbilities() => new()
    {
        new Ability
        {
            Name = "Backstab",
            Description = "Quick strike dealing 14 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 15,
            Cooldown = 1,
            BaseEffect = 14
        },
        new Ability
        {
            Name = "Assassination",
            Description = "Devastating attack dealing 25 damage.",
            Type = AbilityType.SingleTarget,
            ManaCost = 40,
            Cooldown = 3,
            BaseEffect = 25
        },
        new Ability
        {
            Name = "Shadow Dance",
            Description = "Gain evasion for 2 turns.",
            Type = AbilityType.Buff,
            ManaCost = 30,
            Cooldown = 3,
            BaseEffect = 0
        }
    };
}

public enum AbilityType
{
    SingleTarget,
    Aoe,
    Buff,
    Debuff,
    Shield,
    Taunt,
    Heal
}

public class Ability
{
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required AbilityType Type { get; set; }
    public required int ManaCost { get; set; }
    public required int Cooldown { get; set; }
    public required int BaseEffect { get; set; }
}
