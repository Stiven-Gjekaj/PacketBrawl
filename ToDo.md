# TerminalLanBattler - ToDo & Extension Guide

## High-Priority Enhancements

### [ ] Implement Delta Compression
**Description**: Currently, every `StateUpdateMessage` sends the entire game state. This is inefficient for large player counts.

**How to implement**:
1. Add `Delta<T>` class in `Shared/Game/` to track changed fields
2. Modify `ActionProcessor` to return a delta instead of full state
3. Update `StateUpdateMessage` to include a `delta` field
4. Modify clients to apply deltas incrementally to cached state
5. Update tests to verify delta correctness

**Files affected**:
- `src/TerminalLanBattler.Shared/Game/GameState.cs`
- `src/TerminalLanBattler.Shared/Messages/MessageBase.cs`
- `src/TerminalLanBattler.Client/GameClient.cs`
- `src/TerminalLanBattler.Server/GameServer.cs`

### [ ] Add Status Effects System
**Description**: Buffs/debuffs (burn, stun, poison) currently announced but not modeled in game logic.

**How to implement**:
1. Create `StatusEffect` class with duration and effect type
2. Add `List<StatusEffect>` to `PlayerState`
3. Implement effect tick logic in `GameState.AdvanceToNextTurn()`
4. Add handlers in `ActionProcessor` to apply/remove effects
5. Update `PlayerSnapshot` to include active effects
6. Add UI display of active effects in client

**Files affected**:
- `src/TerminalLanBattler.Shared/Game/GameState.cs`
- `src/TerminalLanBattler.Shared/Game/ActionProcessor.cs`
- `src/TerminalLanBattler.Client/GameClient.cs`
- `tests/TerminalLanBattler.Tests/GameLogicTests.cs` (add status effect tests)

### [ ] Add Item System
**Description**: Allow players to use consumable items (potions, scrolls) during combat.

**How to implement**:
1. Create `Item` and `ItemStack` classes
2. Add `Dictionary<string, ItemStack>` inventory to `PlayerState`
3. Add "UseItem" action handler in `ActionProcessor`
4. Create item factory with predefined items (health potion, mana potion, revive scroll)
5. Update UI to display inventory and allow item selection
6. Add item validation and cooldown logic

**Files affected**:
- `src/TerminalLanBattler.Shared/Game/` (new files: Item.cs)
- `src/TerminalLanBattler.Shared/Game/GameState.cs`
- `src/TerminalLanBattler.Shared/Game/ActionProcessor.cs`
- `src/TerminalLanBattler.Client/GameClient.cs`

### [ ] Add Spectator Mode
**Description**: Allow observers to watch a match without participating.

**How to implement**:
1. Add `SpectatorType` enum with Observer role
2. Create `ObserverConnection` class (no action sending)
3. Add logic in `GameServer.HandleClientAsync()` to accept spectators
4. Modify `BroadcastGameState()` to include spectator list
5. Add UI indicator showing spectators are watching
6. Implement spectator timeout/disconnect handling

**Files affected**:
- `src/TerminalLanBattler.Shared/Messages/MessageBase.cs` (add SpectatorJoin message)
- `src/TerminalLanBattler.Server/GameServer.cs`
- `src/TerminalLanBattler.Client/GameClient.cs`

## Medium-Priority Improvements

### [ ] Add Persistence Layer
**Description**: Store match history and player stats in a database.

**How to implement**:
1. Add `MatchRecord` and `PlayerRecord` entities
2. Integrate Entity Framework Core with PostgreSQL
3. Create `IMatchRepository` interface
4. Log match completion to database
5. Add match history query endpoints (if web API added later)

**Files affected** (new):
- `src/TerminalLanBattler.Server/Persistence/MatchRepository.cs`
- `src/TerminalLanBattler.Server/Persistence/DbContext.cs`

### [ ] Add Matchmaking System
**Description**: ELO-based skill matchmaking instead of random pairing.

**How to implement**:
1. Add `PlayerRating` (ELO) to `PlayerRecord`
2. Implement ELO calculation formula
3. Create matchmaking queue that groups similar-skilled players
4. Update match start logic to use matchmaking queue
5. Add win/loss history tracking

**Files affected**:
- `src/TerminalLanBattler.Server/GameServer.cs`
- `src/TerminalLanBattler.Server/Persistence/MatchRepository.cs` (add ELO update logic)

### [ ] Implement Replay System
**Description**: Record all actions and replay matches locally.

**How to implement**:
1. Create `ReplayFrame` class capturing turn state and action
2. Log each action to a `.replay` file (JSON format)
3. Add replay player client that reads `.replay` file
4. Implement playback with speed controls (1x, 2x, pause)
5. Add replay file naming with timestamp and player names

**Files affected**:
- `src/TerminalLanBattler.Server/GameServer.cs` (log actions)
- `src/TerminalLanBattler.Client/ReplayPlayer.cs` (new)

### [ ] Add Console Colors & UI Polish
**Description**: Make terminal UI more visually appealing.

**How to implement**:
1. Use `Console.ForegroundColor` and `Console.BackgroundColor` for health bars
2. Color-code damage/healing messages (red/green)
3. Add ASCII art for character classes
4. Display health bars as `[==== ]` style progress
5. Use ANSI escape codes for better cross-platform support

**Files affected**:
- `src/TerminalLanBattler.Client/GameClient.cs` (PrintGameState, HandleStateUpdate methods)

### [ ] Add Logging Framework
**Description**: Replace `Console.WriteLine` with structured logging.

**How to implement**:
1. Add Serilog NuGet package
2. Configure logging to console and file
3. Add contextual fields (PlayerId, MatchId, etc.)
4. Create log sinks for debugging (file at `logs/debug.txt`)
5. Add log level configuration in `appsettings.json`

**Files affected**:
- `src/TerminalLanBattler.Server/Program.cs`
- `src/TerminalLanBattler.Client/Program.cs`
- All classes (replace `Console.WriteLine` with logger calls)

## Low-Priority Polish

### [ ] Add More Character Classes
**Description**: Add 2-3 more class types (Paladin, Necromancer, etc.)

**How to implement**:
1. Create new class inheriting from `CharacterClass`
2. Define unique stats and 3+ abilities
3. Ensure balanced with existing classes
4. Add tests for new abilities
5. Document in MANUAL.md

**Files affected**:
- `src/TerminalLanBattler.Shared/Game/CharacterClass.cs` (add new class implementations)
- `tests/TerminalLanBattler.Tests/GameLogicTests.cs` (add tests)

### [ ] Add Web Dashboard (Separate Project)
**Description**: Create a web UI for match history, leaderboards, live match viewing.

**How to implement**:
1. Create `TerminalLanBattler.Web` project (ASP.NET Core)
2. Add API endpoints to server for querying match history
3. Build React/Vue frontend for dashboard
4. Display live matches via WebSocket/SignalR
5. Show player statistics and ELO ratings

**Files affected** (new):
- `src/TerminalLanBattler.Web/` (entire new directory)

### [ ] Add Configuration File Support
**Description**: Load settings from YAML/JSON files instead of hardcoding.

**How to implement**:
1. Add `IConfiguration` support via `Microsoft.Extensions.Configuration`
2. Load `appsettings.json` in `Program.cs`
3. Move constants to configuration (port, heartbeat interval, etc.)
4. Add environment-specific configs (`appsettings.Development.json`)
5. Add CLI flag to specify custom config file

**Files affected**:
- `src/TerminalLanBattler.Server/Program.cs`
- `appsettings.json` (already partially done)

## Testing Additions

### [ ] Add Integration Tests
**Description**: Test full match scenarios with mock clients.

**Location**: `tests/TerminalLanBattler.Tests/IntegrationTests.cs`

**Test scenarios**:
- Full 3-player match start to finish
- Player disconnect and reconnect
- Ability cooldown enforcement
- State synchronization across clients
- Invalid action rejection
- Match completion detection

### [ ] Add Performance Tests
**Description**: Benchmark serialization, action processing, etc.

**Location**: `tests/TerminalLanBattler.Tests/PerformanceTests.cs`

**Benchmarks**:
- Message serialization speed
- Action processor latency
- Turn advancement time
- Memory usage for large matches (6 players, 100 turns)

### [ ] Add Stress Tests
**Description**: Test server under high load (many concurrent matches).

**Location**: `tests/TerminalLanBattler.Tests/StressTests.cs`

**Scenarios**:
- 100 concurrent matches
- Rapid action processing
- Many simultaneous disconnects
- Large message payloads

## Documentation Tasks

### [ ] Add API Documentation
**Description**: Generate API docs from XML comments.

**How to implement**:
1. Enable XML doc generation in `.csproj` files (`<GenerateDocumentationFile>true</GenerateDocumentationFile>`)
2. Add `///` comments to all public classes/methods
3. Generate with Sandcastle or Docfx
4. Host on GitHub Pages

### [ ] Add Troubleshooting Guide
**Description**: Common issues and solutions.

**Topics**:
- Port already in use
- Connection timeouts
- Action validation failures
- Client state desync
- High latency

## Infrastructure Tasks

### [ ] Add Docker Support
**Description**: Containerize server for easy deployment.

**How to implement**:
1. Create `Dockerfile` for server image
2. Create `docker-compose.yml` for full stack
3. Add GitHub Actions workflow to build/push image
4. Document deployment instructions

**Files needed**:
- `Dockerfile`
- `docker-compose.yml`
- `deployment/` (deployment scripts)

### [ ] Add UDP Transport Option
**Description**: Support UDP as alternative to TCP (advanced).

**How to implement**:
1. Create `ITransport` interface
2. Implement `TcpTransport` and `UdpTransport`
3. Add packet-loss recovery (sequence numbers, retransmits)
4. Add configuration option to select transport
5. Document trade-offs (latency vs. reliability)

**Files needed** (new):
- `src/TerminalLanBattler.Shared/Networking/ITransport.cs`
- `src/TerminalLanBattler.Shared/Networking/TcpTransport.cs`
- `src/TerminalLanBattler.Shared/Networking/UdpTransport.cs`

## Refactoring Tasks

### [ ] Extract Constants to Configuration
**Description**: Move hardcoded values to `appsettings.json`.

**Examples**:
- `HeartbeatIntervalMs`, `ReconnectWindowSec`
- Class stats (HP, mana, attack, defense, speed)
- Ability values (damage, cooldown, mana cost)
- Match limits (min/max players)

### [ ] Reduce Lock Contention
**Description**: Improve server performance under concurrent load.

**Options**:
1. Use `ReaderWriterLockSlim` for read-heavy game state access
2. Implement action queue instead of direct mutation
3. Use message-passing actor model (Akka.NET)
4. Add async state mutations with queuing

### [ ] Add Dependency Injection
**Description**: Use DI for looser coupling and testability.

**How to implement**:
1. Add `Microsoft.Extensions.DependencyInjection`
2. Register services (GameServer, ActionProcessor, etc.)
3. Update constructor signatures
4. Add DI configuration in `Program.cs`

## How Contributors Can Help

1. **Pick a task from this list**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Implement changes** with tests
4. **Run full test suite**: `dotnet test`
5. **Update documentation** (README, ARCHITECTURE, code comments)
6. **Submit a pull request** with a clear description

### Difficulty Levels

- **Beginner**: Console colors, logging refactor, configuration extraction
- **Intermediate**: Status effects, item system, integration tests
- **Advanced**: Delta compression, matchmaking, UDP transport, web dashboard

**Questions?** Open an issue or start a discussion!
