<div align="center">

![PacketBrawl Logo](PacketBrawl.png)

## Gameplay Guide • Architecture Reference • Developer Documentation

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-gameplay-guide">Gameplay</a> •
  <a href="#-character-abilities">Abilities</a> •
  <a href="#-strategy">Strategy</a> •
  <a href="#-architecture">Architecture</a>
</p>

</div>

---

## 🚀 Quick Start

### Prerequisites

- **.NET 8.0+** installed
- Windows, macOS, or Linux
- 4 terminals (1 server + 3 clients)

### Setup (5 Minutes)

**1. Build**

```bash
dotnet build TerminalLanBattler.sln -c Release
```

**2. Run Server (Terminal 1)**

```bash
dotnet run --project src/TerminalLanBattler.Server -- --port 7777
```

**3. Run Clients (Terminals 2, 3, 4)**

```bash
# Terminal 2: Wizard
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Alice" --class "Wizard"

# Terminal 3: Knight
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Bob" --class "Knight"

# Terminal 4: Archer
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Charlie" --class "Archer"
```

**4. Play!**

- When 2+ players connect, match auto-starts
- Follow on-screen prompts to take turns
- Last player alive wins

**5. Run Tests**

```bash
dotnet test TerminalLanBattler.sln -v normal
```

---

## 🎮 Gameplay Guide

### Lobby Phase

When you connect, you join the lobby waiting for the match to start:

```
=== LOBBY STATE ===
Players (2/6):
  - Alice (Wizard)
  - Bob (Knight)

[LOBBY] Waiting for match to start... Type 'quit' to exit.
```

**Match Requirements:**

- Minimum 2 players required
- Maximum 6 players per match
- Server auto-starts when min players reached
- Players can join any time in lobby

### In-Game: Your Turn

When it's your turn, you'll see:

```
--- YOUR TURN ---
HP: 40/40, Mana: 100/100
Actions: (1) Attack, (2) Ability, (3) Defend, (4) Skip
```

**Action Options:**

1. **Attack** (1)

   - Basic melee/ranged attack
   - Damage: Your Attack stat ± variance (-2 to +2)
   - No mana cost
   - No cooldown
   - Requires target selection

2. **Ability** (2)

   - Class-specific special abilities
   - Costs mana (see ability tables below)
   - Has cooldown (cannot use until cooldown expires)
   - Choose ability, then select target

3. **Defend** (3)

   - Gain +3 defense for this turn
   - Reduces next incoming damage
   - No mana cost
   - No cooldown
   - No target selection

4. **Skip** (4)
   - Pass your turn to next player
   - No effect applied
   - Useful if out of resources

### Target Selection

After choosing an action that needs a target:

```
Select target:
1. Bob (HP: 75)
2. Charlie (HP: 55)
```

- Enter target number (1–N)
- Target must be alive
- Cannot target self
- Dead players automatically skipped

### Game State Display

After each turn, see updated game state:

```
=== GAME STATE ===
Turn: 3
Current Player: Bob

Players:
  Alice (Wizard): HP 35/40, Mana 60/100 - Alive
  Bob (Knight): HP 80/100, Mana 45/50 - Alive
  Charlie (Archer): HP 50/60, Mana 55/70 - Alive
```

**Information Shown:**

- Turn number (increases each round)
- Current player's turn indicator
- All players' HP, mana, status (Alive/Dead)
- Last action performed

---

## 🎮 Character Abilities

### Wizard — Mana-Based Caster

**Stats:** HP 40 | Mana 100 | Attack 6 | Defense 2 | Speed 7

| Ability           | Cost | CD  | Effect                   | Details                               |
| ----------------- | ---- | --- | ------------------------ | ------------------------------------- |
| **Fireball**      | 30   | 1   | 20 single-target damage  | Basic single-target DPS ability       |
| **Inferno**       | 50   | 2   | 12 damage to ALL enemies | AoE damage, hits everyone except self |
| **Arcane Shield** | 25   | 2   | Gain 15 shield points    | Defensive shield, stacks with HP      |

**Strategy:**

- High mana pool enables spell spam
- Low HP makes you vulnerable
- Focus on damage output
- Shield yourself when low HP
- Use Inferno when enemies grouped

### Knight — Tank & Protector

**Stats:** HP 100 | Mana 50 | Attack 8 | Defense 6 | Speed 4

| Ability               | Cost | CD  | Effect                          | Details                                 |
| --------------------- | ---- | --- | ------------------------------- | --------------------------------------- |
| **Shield Bash**       | 20   | 1   | 15 single-target damage         | Melee attack with reduced cooldown      |
| **Guardian's Stance** | 30   | 3   | +8 defense for 2 turns          | Defensive buff, reduces incoming damage |
| **Taunt**             | 25   | 2   | Force all enemies to target you | Takes aggro, protect allies             |

**Strategy:**

- Highest HP (100) absorbs damage
- Tank for team
- Use Taunt to protect vulnerable allies
- Guardian's Stance stacks with Defend action
- Slow speed (4) means you go last

### Archer — Ranged Precision Attacker

**Stats:** HP 60 | Mana 70 | Attack 10 | Defense 3 | Speed 8

| Ability            | Cost | CD  | Effect                  | Details                                 |
| ------------------ | ---- | --- | ----------------------- | --------------------------------------- |
| **Quick Shot**     | 15   | 1   | 12 single-target damage | Fast, low cost ability                  |
| **Piercing Arrow** | 35   | 2   | 18 single-target damage | High damage, medium cost                |
| **Mark Target**    | 20   | 2   | Mark target for 2 turns | Debuff: allies gain +3 damage vs marked |

**Strategy:**

- High speed (8) means you go early
- Medium HP, medium mana
- Use Quick Shot for sustained DPS
- Mark high-damage threats
- Coordinate with allies on marked targets

### Rogue — Burst Damage & Speed

**Stats:** HP 55 | Mana 60 | Attack 12 | Defense 2 | Speed 9

| Ability           | Cost | CD  | Effect                   | Details                     |
| ----------------- | ---- | --- | ------------------------ | --------------------------- |
| **Backstab**      | 15   | 1   | 14 single-target damage  | Fast combo ability          |
| **Assassination** | 40   | 3   | 25 single-target damage  | Burst damage, long cooldown |
| **Shadow Dance**  | 30   | 3   | Gain evasion for 2 turns | Defensive buff, +2 speed    |

**Strategy:**

- Fastest character (Speed 9)
- Highest attack (12)
- Backsta for sustained combo
- Assassination for burst on low-HP targets
- Shadow Dance for survivability

---

## 💡 Strategy

### Class Matchups

| Matchup              | Winner | Why                          |
| -------------------- | ------ | ---------------------------- |
| **Wizard vs Knight** | Knight | Tanky, can absorb spells     |
| **Knight vs Archer** | Archer | Archer faster, kites Knight  |
| **Archer vs Rogue**  | Rogue  | Rogue faster, burst damage   |
| **Rogue vs Wizard**  | Wizard | Wizard AoE hits mobile Rogue |

### Team Strategies

**2 Players:**

- Focus fire priority targets
- Use debuffs to soften defenses
- Manage mana carefully (no support)

**3 Players:**

- Knight tanks, Archer marks, Wizard/Rogue DPS
- Rotate defensives to stay alive
- Predict team comp threats

**4+ Players:**

- Tank leads with Taunt
- Multiple DPS focus marked targets
- Support with shields and healing
- Communication critical

### Mana Management

- **Spam Quick/Cheap:** Fast hits, constant pressure
- **Conserve:** Save mana for key moments
- **Burst:** Combine multiple abilities when vulnerable enemy appears
- **Rotation:** Attack → Ability → Attack cycle

### Defense Tactics

- Use **Defend** action before big hits
- **Shield abilities** (Arcane Shield, Guardian's Stance) stack
- **Positioning:** Stay away from Wizard AoE
- **Taunt:** Knight protects vulnerable allies
- **Evasion:** Rogue Shadow Dance avoids damage

### Cooldown Awareness

| Ability      | Cooldown | Frequency        |
| ------------ | -------- | ---------------- |
| Basic Attack | 0        | Every turn       |
| 1-Turn CD    | 1 turn   | Every other turn |
| 2-Turn CD    | 2 turns  | Every 3 turns    |
| 3-Turn CD    | 3 turns  | Every 4 turns    |

### Damage Calculation

```
Base Damage = Attack Stat + Random(-2 to +2)
Mitigated = Defense * 0.5
Actual = Max(1, Base - Mitigated)
Final = Max(0, Actual - Shield)
```

**Examples:**

- Attack 10 vs Defense 6: 10 + 1 - 3 = 8 damage
- Attack 6 vs Shield 15: Shield absorbs all, 0 HP damage
- Minimum damage: 1 (even heavily armored)

---

## 📜 Sample Gameplay Transcript

### Setup (3-Player Match)

**Terminal 1: Server**

```bash
$ dotnet run --project src/TerminalLanBattler.Server -- --port 7777
Starting TerminalLanBattler Server on 0.0.0.0:7777
[Server] Listening on 0.0.0.0:7777
[Server] Type 'quit' to stop.
```

**Terminal 2: Player 1 (Alice, Wizard)**

```bash
$ dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Alice" --class "Wizard"
Connecting to 127.0.0.1:7777 as Alice (Wizard)
[Client] Connected. Player ID: a1b2c3d4-e5f6-47g8-h9i0

=== LOBBY STATE ===
Players (1/6):
  - Alice (Wizard)
```

**Terminal 3: Player 2 (Bob, Knight)**

```bash
$ dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Bob" --class "Knight"
[Client] Connected. Player ID: b2c3d4e5-f6g7-48h9-i0j1

=== LOBBY STATE ===
Players (2/6):
  - Alice (Wizard)
  - Bob (Knight)
```

**Terminal 4: Player 3 (Charlie, Archer)**

```bash
$ dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Charlie" --class "Archer"
[Client] Connected. Player ID: c3d4e5f6-g7h8-49i0-j1k2

=== LOBBY STATE ===
Players (3/6):
  - Alice (Wizard)
  - Bob (Knight)
  - Charlie (Archer)
```

**Server Output:**

```
[Server] Player Alice (a1b2c3d4...) connected as Wizard
[Server] Player Bob (b2c3d4e5...) connected as Knight
[Server] Player Charlie (c3d4e5f6...) connected as Archer
[Server] Player Alice joined lobby. (1/6)
[Server] Player Bob joined lobby. (2/6)
[Server] Player Charlie joined lobby. (3/6)
[Server] Match match-001 started with 3 players
```

### Round 1 (Turn Order: Charlie 8 → Alice 7 → Bob 4)

**Turn 1: Charlie (Archer, Speed 8)**

```
=== MATCH STARTED ===

=== GAME STATE ===
Turn: 0
Current Player: Charlie

Players:
  Alice (Wizard): HP 40/40, Mana 100/100 - Alive
  Bob (Knight): HP 100/100, Mana 50/50 - Alive
  Charlie (Archer): HP 60/60, Mana 70/70 - Alive

--- YOUR TURN ---
HP: 60/60, Mana: 70/70
Actions: (1) Attack, (2) Ability, (3) Defend, (4) Skip
2

Select ability:
1. Quick Shot (15 mana)
2. Piercing Arrow (35 mana)
3. Mark Target (20 mana)
1

Select target:
1. Alice (HP: 40)
2. Bob (HP: 100)
1
```

**Server:**

```
[Game] Charlie cast Quick Shot on Alice for 12 damage.
```

**Turn 2: Alice (Wizard, Speed 7)**

```
--- Last Action ---
Charlie cast Quick Shot on Alice for 12 damage.

=== GAME STATE ===
Turn: 0
Current Player: Alice

Players:
  Alice (Wizard): HP 28/40, Mana 100/100 - Alive
  Bob (Knight): HP 100/100, Mana 50/50 - Alive
  Charlie (Archer): HP 60/60, Mana 70/70 - Alive

--- YOUR TURN ---
HP: 28/40, Mana: 100/100
Actions: (1) Attack, (2) Ability, (3) Defend, (4) Skip
2

Select ability:
1. Fireball (30 mana)
2. Inferno (50 mana)
3. Arcane Shield (25 mana)
1

Select target:
1. Bob (HP: 100)
2. Charlie (HP: 60)
2
```

**Server:**

```
[Game] Alice cast Fireball on Charlie for 20 damage.
```

**Turn 3: Bob (Knight, Speed 4)**

```
--- Last Action ---
Alice cast Fireball on Charlie for 20 damage.

=== GAME STATE ===
Turn: 0
Current Player: Bob

Players:
  Alice (Wizard): HP 28/40, Mana 70/100 - Alive
  Bob (Knight): HP 100/100, Mana 50/50 - Alive
  Charlie (Archer): HP 40/60, Mana 70/70 - Alive

--- YOUR TURN ---
HP: 100/100, Mana: 50/50
Actions: (1) Attack, (2) Ability, (3) Defend, (4) Skip
1

Select target:
1. Alice (HP: 28)
2. Charlie (HP: 40)
1
```

**Server:**

```
[Game] Bob attacked Alice for 8 damage.
```

**Round 1 End:**

```
=== GAME STATE ===
Turn: 1
Current Player: Charlie

Players:
  Alice (Wizard): HP 20/40, Mana 70/100 - Alive
  Bob (Knight): HP 100/100, Mana 50/50 - Alive
  Charlie (Archer): HP 40/60, Mana 70/70 - Alive
```

### (Continued for Several Rounds...)

After 5 more rounds of strategic combat:

```
=== MATCH RESULT ===
Winner: Charlie!
Final Ranking:
  1. Charlie (HP: 15)
  2. Bob (HP: 0)
  3. Alice (HP: 0)

Match is over. Type 'q' to quit.
```

---

## 🔧 Architecture

### Network Protocol

**Message Format:**

- Single line of valid JSON
- Newline (`\n`) separates messages
- Max payload: 1 MB (validated)
- All timestamps: UTC ticks

**Message Types (13 Total):**

| Type              | Direction | Purpose                          |
| ----------------- | --------- | -------------------------------- |
| Connect           | C→S       | Initiate connection              |
| ConnectResponse   | S→C       | Confirm connection, assign ID    |
| JoinLobby         | C→S       | Ready to play                    |
| LobbyState        | S→C       | Lobby status broadcast           |
| StartMatch        | S→C       | Match begins, initial state      |
| PlayerAction      | C→S       | Send chosen action               |
| StateUpdate       | S→C       | Updated game state broadcast     |
| MatchResult       | S→C       | Final winner + rankings          |
| Heartbeat         | ↔         | Keep-alive ping (5 sec interval) |
| ReconnectAttempt  | C→S       | Rejoin after disconnect          |
| ReconnectResponse | S→C       | Reconnection status              |
| Error             | S→C       | Error notification               |

### Server-Authoritative Design

```
Client sends: {"messageType":"PlayerAction",...}
       ↓
Server validates:
  ✓ Correct turn owner?
  ✓ Has enough mana?
  ✓ Ability off cooldown?
  ✓ Target alive?
       ↓
Server applies:
  - Subtract mana
  - Start cooldown
  - Calculate damage
  - Apply effect
       ↓
Server broadcasts:
  {"messageType":"StateUpdate","gameState":{...}}
       ↓
All clients update local view
```

### Game State Snapshot

Sent via `StateUpdate` message:

```json
{
  "matchId": "match-001",
  "players": [
    {
      "playerId": "abc-123",
      "playerName": "Alice",
      "class": "Wizard",
      "currentHp": 28,
      "maxHp": 40,
      "currentMana": 70,
      "maxMana": 100,
      "defense": 2,
      "attack": 6,
      "speed": 7,
      "isAlive": true,
      "shieldValue": 0,
      "abilityCooldowns": { "Fireball": 0, "Inferno": 2, "Arcane Shield": 1 }
    }
  ],
  "turnIndex": 5,
  "currentTurnPlayerId": "def-456",
  "matchStatus": "InProgress"
}
```

---

## 👨‍💻 Developer Guide

### Project Structure

```
src/
├── TerminalLanBattler.Shared/
│   ├── Messages/
│   │   └── MessageBase.cs          (13 message types, all DTOs)
│   ├── Game/
│   │   ├── CharacterClass.cs       (4 classes, 12+ abilities)
│   │   ├── GameState.cs            (Game state + player state)
│   │   └── ActionProcessor.cs      (Action validation & effects)
│   └── Serialization/
│       └── MessageSerializer.cs    (JSON serialization)
├── TerminalLanBattler.Server/
│   ├── Program.cs                  (Entry point)
│   ├── GameServer.cs               (Main server, game loop)
│   └── CommandLineArgumentBuilder.cs
└── TerminalLanBattler.Client/
    ├── Program.cs                  (Entry point)
    ├── GameClient.cs               (Client UI)
    └── CommandLineArgumentBuilder.cs
```

### Adding a New Character Class

**Step 1:** Create in `CharacterClass.cs`

```csharp
public class PaladinClass : CharacterClass
{
    public PaladinClass()
    {
        Name = "Paladin";
        BaseHp = 90;
        BaseMana = 80;
        BaseAttack = 7;
        BaseDefense = 7;
        BaseSpeed = 5;
    }

    public override List<Ability> GetAbilities() => new()
    {
        new Ability
        {
            Name = "Holy Strike",
            Type = AbilityType.SingleTarget,
            ManaCost = 20,
            Cooldown = 1,
            BaseEffect = 15
        },
        new Ability
        {
            Name = "Divine Shield",
            Type = AbilityType.Shield,
            ManaCost = 25,
            Cooldown = 2,
            BaseEffect = 20
        }
    };
}
```

**Step 2:** Register in `Get()` and `GetAllClassNames()`

```csharp
public static CharacterClass Get(string className)
{
    return className switch
    {
        "Wizard" => new WizardClass(),
        "Knight" => new KnightClass(),
        "Archer" => new ArcherClass(),
        "Rogue" => new RogueClass(),
        "Paladin" => new PaladinClass(),  // ADD THIS
        _ => throw new ArgumentException($"Unknown class: {className}")
    };
}

public static List<string> GetAllClassNames() =>
    new() { "Wizard", "Knight", "Archer", "Rogue", "Paladin" };  // ADD HERE
```

**Step 3:** Test

```csharp
[Fact]
public void Test_PaladinAbilities()
{
    var paladin = CharacterClass.Get("Paladin");
    var abilities = paladin.GetAbilities();
    Assert.Equal(2, abilities.Count);
}
```

Done! Clients can now select Paladin.

### Adding a New Ability Type

1. Create handler in `ActionProcessor.ProcessAction()`
2. Add to `AbilityType` enum
3. Implement effect logic (damage, heal, buff, etc.)
4. Add unit test in `GameLogicTests.cs`

### Network Configuration

Edit `appsettings.json`:

```json
{
  "server": {
    "port": 7777, // TCP port
    "bindAddress": "0.0.0.0", // All interfaces
    "heartbeatIntervalMs": 5000, // Ping every 5 sec
    "heartbeatTimeoutSec": 15, // Disconnect after 15 sec silence
    "reconnectWindowSec": 30, // Allow rejoin within 30 sec
    "minPlayersForMatch": 2, // Minimum players
    "maxPlayersInMatch": 6 // Maximum players
  }
}
```

### Thread Safety

**Protected Resources:**

- `_gameStateLock`: Protects `GameState` mutations
- `_lobbyLock`: Protects lobby player set
- `_connections`: `ConcurrentDictionary` (thread-safe)
- `ClientConnection._writeSemaphore`: Serializes TCP writes

**Async/Await:**

- All I/O uses `async/await`
- `CancellationToken` for graceful shutdown
- No blocking calls in server threads

### Performance

**Current:**

- ~4,500 lines production code
- ~500 lines test code
- Full state snapshots (no delta compression)
- Simple locks on shared state

**Optimize:**

1. **Delta compression:** Only send changed fields
2. **Client-side prediction:** Optimistic UI updates
3. **Batch updates:** Multiple turns → one broadcast
4. **Lock-free:** Use `ConcurrentBag` where possible

### Troubleshooting

| Issue              | Root Cause                  | Fix                            |
| ------------------ | --------------------------- | ------------------------------ |
| Port in use        | Another process using port  | `--port 8888`                  |
| Connection refused | Server not running/firewall | Check server, firewall         |
| Tests fail         | Missing packages/build      | `dotnet clean && dotnet build` |
| JSON error         | Invalid message format      | Verify `messageType`           |
| Desync             | Client modifying state      | Review StateUpdate handling    |
| High latency       | Network/CPU bottleneck      | Profile with `dotnet trace`    |

### Debugging Tips

**Enable Logging:**

```csharp
// In GameServer.cs
Console.WriteLine($"[DEBUG] Processing action: {actionMsg.ActionType}");
```

**Profiling:**

```bash
dotnet trace collect --duration 30 -- dotnet run --project src/TerminalLanBattler.Server
# Analyze with PerfView or speedscope
```

**Monitoring:**

```bash
# Check server CPU/memory
top  # Linux/macOS
# Task Manager  # Windows
```

---

## 📚 Quick Reference

### Command Reference

| Command                                                                                                              | Purpose                                    |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `dotnet build TerminalLanBattler.sln -c Release`                                                                     | Compile all projects                       |
| `dotnet test TerminalLanBattler.sln -v normal`                                                                       | Run 16 unit tests                          |
| `dotnet clean`                                                                                                       | Remove build artifacts                     |
| `dotnet restore`                                                                                                     | Download NuGet packages                    |
| `dotnet run --project src/TerminalLanBattler.Server -- --port 7777`                                                  | Start server on port 7777                  |
| `dotnet run --project src/TerminalLanBattler.Server -- --port 8888`                                                  | Start server on port 8888 (if 7777 in use) |
| `dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Alice" --class "Wizard"` | Connect as Wizard                          |

### Project Structure at a Glance

```
src/
├── TerminalLanBattler.Shared/    (Core logic)
│   ├── Messages/                 (13 message types)
│   ├── Game/                     (Game state, actions, classes)
│   └── Serialization/            (JSON handling)
├── TerminalLanBattler.Server/    (Game server)
│   ├── GameServer.cs             (Main orchestrator)
│   └── Program.cs                (Entry point)
└── TerminalLanBattler.Client/    (Terminal UI)
    ├── GameClient.cs             (Client logic)
    └── Program.cs                (Entry point)
tests/
└── TerminalLanBattler.Tests/     (16 unit tests)
```

### Common Issues & Fixes

| Problem                    | Solution                                                     |
| -------------------------- | ------------------------------------------------------------ |
| Port 7777 already in use   | Use `--port 8888` instead                                    |
| Connection refused         | Ensure server is running, check firewall                     |
| Build fails                | Run `dotnet clean && dotnet restore && dotnet build`         |
| Tests fail                 | Ensure .NET 8.0+, run `dotnet restore` first                 |
| JSON/Deserialization error | Verify message format and `messageType` field case           |
| High latency/freezing      | Check network connection, CPU usage, or run on same machine  |
| Client disconnects         | May be within reconnection window (30 sec), will auto-rejoin |

### Game Features Summary

- **4 Hero Classes:** Wizard, Knight, Archer, Rogue (3+ unique abilities each)
- **Turn-Based Combat:** Speed-based initiative, deterministic turn order
- **Resource Management:** Mana pools, cooldowns, shields
- **Server-Authoritative:** All validation & game logic on server (no cheating)
- **TCP/JSON Networking:** Line-delimited messages, heartbeat detection, reconnection support
- **Fully Tested:** 16 unit tests covering game logic and serialization
- **Thread-Safe:** Proper synchronization, async/await throughout

---

## 🎯 Design Principles

1. **Server-Authoritative:** Server is source of truth, clients never modify state
2. **Stateless Messages:** Each message self-contained, no session state needed
3. **Validation First:** Always validate before applying effect
4. **Deterministic:** Same inputs → same outputs (aids testing & debugging)
5. **Simple Protocol:** Line-delimited JSON, easy to debug
6. **Thread-Safe:** Locks protect shared state, async I/O throughout
7. **Testable:** Game logic separated from networking
8. **Extensible:** Easy to add classes, abilities, message types

---

## 📋 Checklist: Running Your First Match

- [ ] Build: `dotnet build TerminalLanBattler.sln -c Release`
- [ ] Test: `dotnet test TerminalLanBattler.sln` (16 pass)
- [ ] Terminal 1: Start server `--port 7777`
- [ ] Terminal 2: Client 1 `--name Alice --class Wizard`
- [ ] Terminal 3: Client 2 `--name Bob --class Knight`
- [ ] Terminal 4: Client 3 `--name Charlie --class Archer`
- [ ] Wait for match to auto-start (2+ players connected)
- [ ] Follow on-screen prompts to play
- [ ] Battle until 1 player remains
- [ ] See winner announcement + rankings

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**See [README.md](README.md) for quick start & architecture overview.**

</div>
