# TerminalLanBattler — Setup & Quick Start

## What Is This?

A complete, production-ready **turn-based LAN multiplayer battler** written in C#. 2–6 players connect over TCP/IP, choose from 4 hero classes, and battle in real-time with a terminal UI.

## Files You Have

✅ **README.md** — Quick start guide, feature overview, commands (friendly, concise)
✅ **MANUAL.md** — Complete gameplay guide, all abilities, strategy, sample transcript, dev reference (comprehensive)
✅ **Source Code** — 11 C# files in `src/` (Shared, Server, Client)
✅ **Tests** — 16 unit tests in `tests/`
✅ **Config** — `.sln`, `global.json`, `appsettings.json`

## 5-Minute Setup

### 1. Prerequisites
- .NET 8.0+ installed
- Windows/Mac/Linux
- 4 terminals open

### 2. Build
```bash
dotnet build TerminalLanBattler.sln -c Release
```

### 3. Run Server (Terminal 1)
```bash
dotnet run --project src/TerminalLanBattler.Server -- --port 7777
```

### 4. Run Clients (Terminals 2, 3, 4)
```bash
# Terminal 2
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Alice" --class "Wizard"

# Terminal 3
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Bob" --class "Knight"

# Terminal 4
dotnet run --project src/TerminalLanBattler.Client -- --host 127.0.0.1 --port 7777 --name "Charlie" --class "Archer"
```

### 5. Play!
- When 2+ players connect, match auto-starts
- Take turns choosing actions
- Last player alive wins

### 6. Test
```bash
dotnet test TerminalLanBattler.sln -v normal
```

---

## Documentation Guide

### For Players
→ Read **[README.md](README.md)** for:
- Overview & features
- Quick start (build/run commands)
- Character classes & abilities
- Network protocol basics

### For Gameplay Details
→ Read **[MANUAL.md](MANUAL.md)** for:
- Complete gameplay guide
- All ability tables (damage, mana, cooldowns)
- Strategy & tips
- Sample 3-player match transcript
- Damage calculations

### For Developers
→ Also in **[MANUAL.md](MANUAL.md)**:
- Architecture & design
- Network protocol spec
- Adding new classes
- Thread safety
- Performance tips
- Troubleshooting

---

## Project Structure

```
src/
├── TerminalLanBattler.Shared/    (Messages, game logic, serialization)
├── TerminalLanBattler.Server/    (Game loop, TCP listener)
└── TerminalLanBattler.Client/    (Terminal UI)
tests/
└── TerminalLanBattler.Tests/     (16 unit tests)
```

---

## Game Features

🎮 **4 Character Classes**
- Wizard (mana caster)
- Knight (tank)
- Archer (ranged)
- Rogue (burst DPS)

⚔️ **Each has 3+ unique abilities**
- Cooldowns (1–3 turns)
- Mana costs (15–50)
- Different effects (damage, shield, buff)

🔧 **Server-Authoritative**
- Server validates all actions
- Server applies effects
- Server broadcasts state
- Prevents cheating & desync

🌐 **Robust Networking**
- TCP/IP with line-delimited JSON
- Heartbeat detection (5 sec ping)
- Reconnection support (30 sec window)
- Payload validation (1 MB max)

🧪 **16 Unit Tests**
- Game logic (damage, cooldowns, turn order)
- Serialization (JSON roundtrip, validation)
- All pass

---

## Quick Reference

| Command | What It Does |
|---------|--------------|
| `dotnet build TerminalLanBattler.sln` | Compile everything |
| `dotnet test TerminalLanBattler.sln` | Run 16 unit tests |
| `dotnet run --project src/TerminalLanBattler.Server` | Start game server (port 7777) |
| `dotnet run --project src/TerminalLanBattler.Client` | Start game client (localhost) |
| `dotnet clean` | Remove build artifacts |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 7777 already in use | Use `--port 8888` |
| Connection refused | Check server is running, firewall allows port |
| Build fails | Run `dotnet clean`, then `dotnet build` |
| Tests fail | Ensure .NET 8.0+, run `dotnet restore` |

---

## Next Steps

1. **Play a match** using Quick Start above
2. **Read [README.md](README.md)** for overview
3. **Read [MANUAL.md](MANUAL.md)** for complete guide
4. **Add new class** (see MANUAL.md dev section)
5. **Optimize** (see performance section in MANUAL.md)

---

## Architecture Highlights

✅ Server-authoritative (no client-side cheating)
✅ Stateless TCP/JSON protocol (easy to debug)
✅ Deterministic game logic (easy to test)
✅ Thread-safe (locks + async I/O)
✅ Extensible (easy to add classes/abilities)
✅ Well-tested (16 comprehensive tests)
✅ Production-ready (~4,500 lines code)

---

**Questions?** Check [README.md](README.md) or [MANUAL.md](MANUAL.md) — both are comprehensive!

**Ready?** Run the commands above and start battling! 🎮⚔️
