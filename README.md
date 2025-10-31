<div align="center">

![PacketBrawl Logo](PacketBrawl.png)

## A Turn-Based LAN Battler

_Server-authoritative gameplay: TCP/JSON networking, 4 hero classes, strategic battles_

<p align="center">
  <img src="https://img.shields.io/badge/C%23-12-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#"/>
  <img src="https://img.shields.io/badge/.NET-8.0+-512BD4?style=for-the-badge&logo=.net&logoColor=white" alt=".NET 8.0+"/>
  <img src="https://img.shields.io/badge/TCP-JSON-0071C5?style=for-the-badge" alt="TCP/JSON"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Release-success?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/>
</p>

<p align="center" style="font-weight: bold;">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-character-classes">Classes</a> •
  <a href="MANUAL.md">Gameplay</a>
</p>

</div>

---

## 📖 Overview

**PacketBrawl** is a fast-paced, turn-based LAN multiplayer battler where 2–6 players connect over TCP/IP, choose unique hero classes, and battle in real-time. The server is authoritative and handles all game logic; clients display a terminal UI and send actions. Features include mana-based abilities, defensive mechanics, cooldown systems, and strategic gameplay.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎮 Gameplay

- ✅ **4 Hero Classes** (Wizard, Knight, Archer, Rogue)
- ✅ **Unique Abilities** (3+ per class with cooldowns)
- ✅ **Resource Management** (Mana system)
- ✅ **Strategic Combat** (Defense, shields, positioning)
- ✅ **Speed-Based Turns** (Initiative ordering)

</td>
<td width="50%">

### 🔧 Architecture

- ✅ **Server-Authoritative** (no client-side cheating)
- ✅ **TCP/JSON Protocol** (line-delimited messages)
- ✅ **Real-Time Networking** (heartbeat, reconnection)
- ✅ **Robust Validation** (turn ownership, action legality)
- ✅ **Unit Tested** (16 comprehensive tests)

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **.NET 8.0** or later
- Windows, Linux, or macOS
- 3+ terminals for server + clients

### 1. Build

```bash
dotnet build TerminalLanBattler.sln -c Release
```

### 2. Start Server

```bash
dotnet run --project src/TerminalLanBattler.Server -- --port 7777
```

### 3. Launch Clients (3 separate terminals)

**Player 1: Wizard**

```bash
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Alice" --class "Wizard"
```

**Player 2: Knight**

```bash
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Bob" --class "Knight"
```

**Player 3: Archer**

```bash
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Charlie" --class "Archer"
```

### 4. Play!

When 2+ players join, server auto-starts. Last player alive wins!

### 5. Run Tests

```bash
dotnet test TerminalLanBattler.sln -v normal
```

---

## 🎮 Character Classes

| Class      | Role       | HP  | Mana | Attack | Speed | Signature Ability          |
| ---------- | ---------- | --- | ---- | ------ | ----- | -------------------------- |
| **Wizard** | Ranged DPS | 40  | 100  | 6      | 7     | Inferno (AoE, 50 mana)     |
| **Knight** | Tank       | 100 | 50   | 8      | 6     | Guardian's Stance (+8 def) |
| **Archer** | Ranged DPS | 60  | 70   | 10     | 8     | Piercing Arrow (18 dmg)    |
| **Rogue**  | Burst DPS  | 55  | 60   | 12     | 9     | Assassination (25 dmg)     |

**Full ability tables and strategy in [MANUAL.md](MANUAL.md)**

---

## 📊 Project Statistics

<table>
<tr>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Production-4,500-blue?style=for-the-badge" alt="LOC"/><br/>
<b>Lines of Code</b><br/>
Game + Networking
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Tests-16-green?style=for-the-badge" alt="Tests"/><br/>
<b>Unit Tests</b><br/>
All pass
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Messages-13-orange?style=for-the-badge" alt="Messages"/><br/>
<b>Message Types</b><br/>
Complete protocol
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Modules-3-purple?style=for-the-badge" alt="Components"/><br/>
<b>Components</b><br/>
Server, Client, Shared
</td>
</tr>
</table>

---

## 🎮 Game Flow

```
1. Lobby: Players connect (2+ required)
           ↓
2. Match Start: Turn order by Speed
                ↓
3. Turn Loop:   Current player → Choose action
                Server validates → Apply effect
                Broadcast state → Next player
                ↓
4. End Game:    Winner announced
```

---

## 🌐 Network Protocol

All messages: **line-delimited JSON over TCP**

**13 Message Types:**

- Connection: Connect, ConnectResponse, Disconnect, JoinLobby, LobbyState
- Gameplay: StartMatch, PlayerAction, StateUpdate, MatchResult
- Maintenance: Heartbeat, ReconnectAttempt, ReconnectResponse, Error

Example:

```json
{
  "messageType": "PlayerAction",
  "playerId": "abc",
  "actionType": "Ability",
  "abilityName": "Fireball",
  "targetPlayerId": "def"
}
```

---

## 🏗️ Project Structure

```
PacketBrawl/
├── src/
│   ├── TerminalLanBattler.Shared/    (Messages, game logic, serialization)
│   ├── TerminalLanBattler.Server/    (Game loop, connections)
│   └── TerminalLanBattler.Client/    (Terminal UI)
├── tests/
│   └── TerminalLanBattler.Tests/     (16 unit tests)
├── TerminalLanBattler.sln
├── appsettings.json
├── README.md
└── MANUAL.md
```

---

## 🧪 Testing

```bash
dotnet test TerminalLanBattler.sln -v normal
```

**16 Tests:**

- 10 game logic (damage, cooldowns, turn order)
- 6 serialization (JSON, validation)
- ✓ All pass

---

## ⚙️ Configuration

Edit `appsettings.json`:

```json
{
  "server": {
    "port": 7777,
    "bindAddress": "0.0.0.0",
    "heartbeatIntervalMs": 5000,
    "heartbeatTimeoutSec": 15,
    "reconnectWindowSec": 30,
    "minPlayersForMatch": 2,
    "maxPlayersInMatch": 6
  }
}
```

---

## 🚀 Commands Reference

### Server

```bash
dotnet run --project src/TerminalLanBattler.Server -- --port 7777
```

### Client

```bash
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Player" --class "Wizard"
```

### Build & Test

```bash
dotnet build TerminalLanBattler.sln -c Release
dotnet test TerminalLanBattler.sln -v normal
```

---

## 📚 Documentation

**See [MANUAL.md](MANUAL.md) for:**

- Complete gameplay guide
- All ability tables (damage, mana, cooldowns)
- Detailed strategy tips
- Sample 3-player match transcript
- Developer API reference
- Network protocol specification
- Architecture deep-dive
- Thread safety & performance

---

## 👨‍💻 Developer Quick Start

### Add a New Character Class

In `src/TerminalLanBattler.Shared/Game/CharacterClass.cs`:

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
        new Ability { Name = "Holy Strike", Type = AbilityType.SingleTarget,
                      ManaCost = 20, Cooldown = 1, BaseEffect = 15 }
    };
}
```

Register in `GetAllClassNames()` and `Get()` switch. Add tests. Done!

### Troubleshooting

| Issue              | Fix                            |
| ------------------ | ------------------------------ |
| Port in use        | `--port 8888`                  |
| Connection refused | Check firewall, server running |
| Tests fail         | `dotnet clean && dotnet build` |
| JSON error         | Check `messageType` case       |
| High latency       | Check network, CPU usage       |

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**Ready to battle?** 🎮⚔️

</div>
