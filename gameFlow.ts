/**
 * Game Flow Architecture — референсная реализация slot-специфичных flows
 *
 * Async/await flows вместо FSM. Каждый flow — класс с run(),
 * возвращающий следующий flow или null.
 *
 * РЕАЛИЗОВАНО В ДВИЖКЕ (modules/engine/flow/):
 * - BaseFlow (BaseFlow.js) — базовый класс с run(), execute(), onDispose(), dispose()
 * - delay() (BaseFlow.js) — утилита задержки
 * - ControllerStore (ControllerStore.js) — сервис, extends Service
 * - gameFlowLoop (gameFlowLoop.js) — основной цикл
 *
 * НЕ РЕАЛИЗОВАНО (только в этом референсе):
 * - createSkipController() — будет при реализации slot flows
 * - Все slot-специфичные flows (IdleFlow, SpinningFlow, PresentationFlow и т.д.)
 * - Интерфейсы (IHud, IReels, IApi, IStore и т.д.)
 *
 * Архитектура и диаграммы: см. ARCHITECTURE_FLOW_CONTROLLERS.md
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * PresentationAct base class (from existing engine)
 * Acts define: guard, action(), skip(), skipStep
 * Used by PresentationFlow via AsyncActionsScenario
 */
declare class PresentationAct {
    skipStep: boolean;
    get guard(): boolean;
    action(): unknown; // GSAP Timeline, Promise, or void
    skip(): void;
}

/**
 * AsyncActionsScenario (from existing engine)
 * Wraps PresentationAct[] → AsyncAction[] → ActsRunner
 */
declare class AsyncActionsScenario {
    constructor(acts: PresentationAct[]);
    start(): void;
    skipAllIfPossible(): void;
    readonly onComplete: Promise<void>;
}

/**
 * Act class constructor type
 * Acts are instantiated by PresentationFlow with step data
 */
type ActClass = new (ctx: GameContext, step: StepResult) => PresentationAct;

/**
 * Acts config: map of step type → act class
 * Determines which class handles each step type
 * Order is determined by server data (result.results), not by config
 */
type ActsConfig = Record<string, ActClass>;

/**
 * Game context containing all services and managers
 * Passed to every flow for access to game components
 */
interface GameContext {
    hud: IHud;
    reels: IReels;
    api: IApi;
    store: IStore;
    audio: IAudio;
    autoplay: IAutoplay;
    background: IBackground;
    controllers: ControllerStore;

    /** Acts config: map of step type → act class for base game presentation */
    presentationActs: ActsConfig;
    /** Acts config: map of step type → act class for free spins presentation (falls back to presentationActs) */
    freeSpinPresentationActs?: ActsConfig;
}

// =============================================================================
// HUD INTERFACES (сгруппированы по назначению)
// =============================================================================

/**
 * HUD (Heads-Up Display) interface
 * Manages UI state, display, buttons, popups and user input
 * Grouped by responsibility for better organization
 */
interface IHud {
    toIdleState(): void;
    toSpinningState(): void;
    toFreeSpinIdleState(): void;
    toFreeSpinsMode(): Promise<void>;
    toMainGameMode(): Promise<void>;

    /** Only methods used by flows. Act-specific display methods are defined by acts. */
    display: {
        setBalance(value: number): void;
        setTotalBet(value: number): void;
        setFreeSpinsCounter(value: number): void;
        showInfo(text: string): void;
        setInfoText(text: string): void;
    };

    buttons: {
        showAutoplayButton(): void;
        showStopAutoplayButton(): void;
    };

    popups: {
        showFreeSpinsIntro(count: number): Promise<void>;
        showFreeSpinsOutro(totalWin: number): Promise<void>;
        showRetrigger(count: number): Promise<void>;
        hideRetrigger(): void;
        showError(error: GameError): Promise<void>;
        showBuyBonus(): Promise<BuyBonusSelection>;
        showInfo(): Promise<void>;
        showSettings(): Promise<void>;
        showAutoplaySettings(): Promise<AutoplaySettings>;
    };

    waitAction(): Promise<UserAction>;
    onSkip(callback: () => void): () => void;
}

/**
 * Reels interface — only methods used by flows.
 * Act-specific methods (playWinAnimation, cascade, etc.) are defined by acts themselves.
 */
interface IReels {
    toIdleState(): void;
    spin(options: { instant: boolean }): SpinAnimation;
}

interface IApi {
    spin(bet: number): Promise<SpinResult>;
    freeSpin(): Promise<SpinResult>;
    buyFreeSpins(bet: number, index: number): Promise<SpinResult>;
}

/**
 * Store interface — only properties/methods used by flows.
 * Act-specific methods (addWin, setMultiplier, etc.) are defined by acts.
 * Controller-specific methods (nextBet, prevBet) are defined by controllers.
 */
interface IStore {
    balance: number;
    bet: number;
    totalWin: number;
    spinType: SpinType;
    freeSpinsLeft: number;
    freeSpinsCount: number;
    totalFreeSpinsWin: number;

    deductBet(amount?: number): void;
    rejectBet(): void;
    setSpinResult(result: SpinResult): void;
    hasFreeSpins(): boolean;
    decrementFreeSpins(): void;
}

interface IAudio {
    playSfx(name: string, options?: { loop?: boolean }): void;
    stopSfx(name: string): void;
    playMusic(name: string, options?: { loop?: boolean }): void;
}

interface IAutoplay {
    isActive(): boolean;
    getGamesLeft(): number;
    isTurboSpin: boolean;
    isQuickSpin: boolean;
    start(settings: AutoplaySettings): void;
    stop(): void;
    next(result: { win: number; loss: number }): void;
}

interface IBackground {
    toFreeSpinsMode(): void;
    toBaseGameMode(): void;
}

// Data types
type SpinType = "normal" | "quick" | "turbo";

interface UserAction {
    type: string;
    payload?: unknown;
}

interface SpinResult {
    error?: GameError;
    results: StepResult[];
}

interface GameError {
    code?: string;
    message?: string;
    custom_message?: string;
}

/**
 * Step result from server — flow only uses `type` to find the act class.
 * Concrete step data (matrix, pays, multipliers, etc.) is defined by acts.
 */
interface StepResult {
    type: string;
    [key: string]: unknown;
}

interface SpinAnimation {
    finished: Promise<void>;
    complete(): void;
}

interface BuyBonusSelection {
    confirmed: boolean;
    bet: number;
    index: number;
}

interface AutoplaySettings {
    confirmed: boolean;
    gamesLimit?: number;
    winLimit?: number;
    lossLimit?: number;
}

/**
 * Skip controller for animations
 * Allows to skip/fast-forward current animation or presentation
 */
interface SkipController {
    readonly isSkipped: boolean;
    readonly onSkip: Promise<void>;
    skip(): void;
}

/**
 * Controller store for background reactive services
 * Controllers handle local mutations (bets, autoplay state) without blocking flows
 */
interface ControllerStore {
    add(id: string, controller: IController): void;
    remove(id: string): void;
    get(id: string): IController | undefined;
}

/**
 * Base controller interface
 */
interface IController {
    destroy?(): void;
}

// =============================================================================
// BASE FLOW CLASS
// =============================================================================

/**
 * IMPLEMENTED: modules/engine/flow/BaseFlow.js
 *
 * Base class for all flows with automatic resource cleanup.
 * Below is the TypeScript version for reference and typing.
 *
 * Engine implementation (JS) provides:
 * - constructor(ctx), onDispose(callback), run(), execute(), dispose()
 * - delay(ms) utility function
 *
 * NOT in engine: createSkipController() — slot-specific, will be added later.
 */
abstract class BaseFlow {
    protected disposables: Array<() => void> = [];

    constructor(protected ctx: GameContext) {}

    protected onDispose(callback: () => void): void {
        this.disposables.push(callback);
    }

    /**
     * Create skip controller with automatic cleanup and autoplay handling
     * NOT IMPLEMENTED in engine — slot-specific, to be added later
     */
    protected createSkipController(): SkipController {
        const controller = createSkipController();
        const unsub = this.ctx.hud.onSkip(() => {
            controller.skip();
            if (this.ctx.autoplay.isActive()) {
                this.ctx.autoplay.stop();
                this.ctx.hud.buttons.showAutoplayButton();
            }
        });
        this.onDispose(unsub);
        return controller;
    }

    abstract run(): Promise<BaseFlow | null>;

    async execute(): Promise<BaseFlow | null> {
        try {
            return await this.run();
        } finally {
            this.dispose();
        }
    }

    private dispose(): void {
        this.disposables.forEach((d) => d());
        this.disposables = [];
    }
}

// =============================================================================
// MAIN LOOP
// =============================================================================

/**
 * IMPLEMENTED: modules/engine/flow/gameFlowLoop.js
 *
 * Engine version: gameFlowLoop(ctx, FirstFlow)
 * ctx is formed via services.getAll() — flat object with all registered services.
 *
 * Below is the slot-specific version for reference.
 */
export async function gameLoop(ctx: GameContext): Promise<void> {
    let nextFlow: BaseFlow | null = new IdleFlow(ctx);

    while (nextFlow) {
        nextFlow = await nextFlow.execute();
    }
}

// =============================================================================
// IDLE FLOW
// =============================================================================

/**
 * Idle state - waiting for user action
 *
 * Responsibilities:
 * - Set UI to idle state
 * - Update balance and bet display
 * - Handle autoplay continuation
 * - Route user actions to appropriate flows
 *
 * Local actions (betPlus, betMinus) should be handled by BetController
 * IdleFlow only routes to other flows (spin, settings, info, etc.)
 */
class IdleFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, reels, autoplay, store } = this.ctx;

        hud.toIdleState();
        reels.toIdleState();
        hud.display.setBalance(store.balance);
        hud.display.setTotalBet(store.bet);

        if (autoplay.isActive()) {
            hud.display.showInfo(`AUTO SPINS LEFT: ${autoplay.getGamesLeft()}`);
            return new SpinningFlow(this.ctx);
        }

        const action = await hud.waitAction();

        return this.routeAction(action);
    }

    private routeAction(action: UserAction): BaseFlow {
        const routes: Record<string, new (ctx: GameContext) => BaseFlow> = {
            spin: SpinningFlow,
            buyBonus: BuyBonusFlow,
            info: InfoFlow,
            settings: SettingsFlow,
            autoplaySettings: AutoplaySettingsFlow,
        };

        const FlowClass = routes[action.type];
        return FlowClass ? new FlowClass(this.ctx) : new IdleFlow(this.ctx);
    }
}

// =============================================================================
// SPINNING FLOW
// =============================================================================

/**
 * Spinning state - executing spin and waiting for result
 *
 * Flow:
 * 1. Start reels animation
 * 2. Request spin from API (parallel)
 * 3. Deduct bet from balance
 * 4. Wait for animation or skip
 * 5. Go to PresentationFlow with result
 *
 * Handles:
 * - Quick/Turbo spin modes
 * - Skip functionality
 * - Error handling
 * - Autoplay info display
 */
class SpinningFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, reels, api, store, audio, autoplay } = this.ctx;

        const spinType = store.spinType;
        const isQuickOrTurbo = spinType === "quick" || spinType === "turbo";
        const isTurbo = spinType === "turbo";

        hud.toSpinningState();
        hud.display.showInfo(
            autoplay.isActive() ? `AUTO SPINS LEFT: ${autoplay.getGamesLeft()}` : "GOOD LUCK!"
        );
        audio.playSfx("spin_button_click");

        const skipController = this.createSkipController();

        if (isTurbo) {
            skipController.skip();
        }

        try {
            const spinAnimation = reels.spin({ instant: isQuickOrTurbo });
            const resultPromise = api.spin(store.bet);

            store.deductBet();
            hud.display.setBalance(store.balance);

            const result = await resultPromise;

            if (result.error) {
                return new ErrorFlow(this.ctx, result.error);
            }

            store.setSpinResult(result);

            await Promise.race([spinAnimation.finished, skipController.onSkip]);

            if (skipController.isSkipped) {
                spinAnimation.complete();
            }

            return new PresentationFlow(this.ctx, {
                result,
                quickStop: skipController.isSkipped || isQuickOrTurbo,
                isTurbo,
            });
        } catch (error) {
            return new ErrorFlow(this.ctx, error as GameError);
        }
    }
}

// =============================================================================
// PRESENTATION FLOW
// =============================================================================

/**
 * Parameters for presentation flow
 */
interface PresentationParams {
    result: SpinResult;
    quickStop: boolean;
    isTurbo: boolean;
}

/**
 * Presentation state - showing spin results using acts from config
 *
 * Acts are defined in GameContext.presentationActs (array of PresentationAct classes).
 * Each act handles its own guard, skip, and GSAP timeline logic.
 *
 * Flow responsibilities:
 * - Instantiate acts from config with current params
 * - Run them via AsyncActionsScenario
 * - Integrate skip controller with scenario
 * - Route to next flow after presentation
 *
 * Acts handle:
 * - Visual presentation (animations, sounds, counters)
 * - Guard conditions (skip act if not applicable)
 * - Skip behavior (instant complete when skipped)
 *
 * After all acts complete:
 * - Updates autoplay state
 * - Routes to FreeSpinIntroFlow or IdleFlow
 */
class PresentationFlow extends BaseFlow {
    protected skipController: SkipController;
    protected params: PresentationParams;

    constructor(ctx: GameContext, params: PresentationParams) {
        super(ctx);
        this.params = params;
        this.skipController = this.createSkipController();

        if (ctx.autoplay.isActive() && ctx.autoplay.isTurboSpin) {
            this.skipController.skip();
        }
    }

    /**
     * Get acts config map for this presentation.
     * Override in subclasses (e.g. FreeSpinPresentationFlow) to use different acts.
     */
    protected getActMap(): ActsConfig {
        return this.ctx.presentationActs;
    }

    async run(): Promise<BaseFlow | null> {
        const { hud, store, autoplay } = this.ctx;

        try {
            const actMap = this.getActMap();

            // Build acts array from server data — order from result.results
            const acts = this.params.result.results
                .map(step => {
                    const ActClass = actMap[step.type];
                    return ActClass ? new ActClass(this.ctx, step) : null;
                })
                .filter((act): act is PresentationAct => act !== null);

            const scenario = new AsyncActionsScenario(acts);

            // Connect skip controller to scenario
            if (!this.skipController.isSkipped) {
                this.skipController.onSkip.then(() => scenario.skipAllIfPossible());
            } else {
                scenario.skipAllIfPossible();
            }

            scenario.start();
            await scenario.onComplete;

            // Update autoplay
            if (autoplay.isActive()) {
                const win = store.totalWin;
                const loss = win === 0 ? store.bet : 0;
                autoplay.next({ win, loss });
            }

            if (!autoplay.isActive()) {
                const texts = ["PLACE YOUR BETS!", "SPIN TO WIN!", "HOLD SPACE FOR TURBO SPIN"];
                hud.display.setInfoText(texts[Math.floor(Math.random() * texts.length)]);
            }

            return this.routeNext();
        } catch (error) {
            return new ErrorFlow(this.ctx, error as GameError);
        }
    }

    /**
     * Determine next flow after presentation.
     * Override in subclasses for different routing (e.g. free spins).
     */
    protected routeNext(): BaseFlow {
        if (this.ctx.store.hasFreeSpins()) {
            return new FreeSpinIntroFlow(this.ctx);
        }
        return new IdleFlow(this.ctx);
    }
}


// =============================================================================
// FREE SPINS FLOW
// =============================================================================

/**
 * Free spins intro - show popup and switch to bonus mode
 *
 * Flow:
 * 1. Show intro popup with free spins count
 * 2. Switch background to bonus mode
 * 3. Change music to free game theme
 * 4. Animate HUD to free spins mode
 * 5. Go to FreeSpinIdleFlow
 */
class FreeSpinIntroFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, audio, store, background } = this.ctx;

        await hud.popups.showFreeSpinsIntro(store.freeSpinsCount);

        background.toFreeSpinsMode();
        audio.playMusic("freegame_loop", { loop: true });

        await hud.toFreeSpinsMode();

        return new FreeSpinIdleFlow(this.ctx);
    }
}

/**
 * Free spin idle - brief pause before next free spin
 * Shows remaining free spins counter
 */
class FreeSpinIdleFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, store } = this.ctx;

        hud.toFreeSpinIdleState();
        hud.display.setFreeSpinsCounter(store.freeSpinsLeft);

        await delay(500);

        return new FreeSpinningFlow(this.ctx);
    }
}

/**
 * Free spin spinning - same as SpinningFlow but calls freeSpin API
 * Automatically continues to next free spin without user interaction
 */
class FreeSpinningFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, reels, api, store, audio } = this.ctx;

        const spinType = store.spinType;
        const isTurbo = spinType === "turbo";
        const isQuickOrTurbo = spinType === "quick" || isTurbo;

        hud.toSpinningState();
        audio.playSfx("spin_button_click");

        const skipController = this.createSkipController();

        if (isTurbo) skipController.skip();

        try {
            const spinAnimation = reels.spin({ instant: isQuickOrTurbo });
            const result = await api.freeSpin();

            if (result.error) {
                return new ErrorFlow(this.ctx, result.error);
            }

            store.setSpinResult(result);
            store.decrementFreeSpins();

            await Promise.race([spinAnimation.finished, skipController.onSkip]);
            if (skipController.isSkipped) spinAnimation.complete();

            return new FreeSpinPresentationFlow(this.ctx, {
                result,
                quickStop: skipController.isSkipped || isQuickOrTurbo,
                isTurbo,
            });
        } catch (error) {
            return new ErrorFlow(this.ctx, error as GameError);
        }
    }
}

/**
 * Free spin presentation - extends base PresentationFlow
 * Uses freeSpinPresentationActs config (falls back to presentationActs)
 * Routes to free spin flows instead of idle
 *
 * After presentation:
 * - If free spins left → FreeSpinIdleFlow (continue)
 * - If no free spins left → FreeSpinOutroFlow (end bonus)
 */
class FreeSpinPresentationFlow extends PresentationFlow {
    protected getActMap(): ActsConfig {
        return this.ctx.freeSpinPresentationActs ?? this.ctx.presentationActs;
    }

    protected routeNext(): BaseFlow {
        if (this.ctx.store.freeSpinsLeft > 0) {
            return new FreeSpinIdleFlow(this.ctx);
        }
        return new FreeSpinOutroFlow(this.ctx);
    }
}

/**
 * Free spins outro - show total win and return to base game
 *
 * Flow:
 * 1. Show outro popup with total free spins win
 * 2. Switch background back to base game
 * 3. Change music to base game theme
 * 4. Animate HUD back to normal mode
 * 5. Go to IdleFlow
 */
class FreeSpinOutroFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, audio, store, background } = this.ctx;

        await hud.popups.showFreeSpinsOutro(store.totalFreeSpinsWin);

        background.toBaseGameMode();
        audio.playMusic("basegame_loop", { loop: true });

        await hud.toMainGameMode();

        return new IdleFlow(this.ctx);
    }
}

// =============================================================================
// OTHER FLOWS
// =============================================================================

/**
 * Error flow - handle server errors and bet rejections
 *
 * Special cases:
 * - custom_message === "-1" → Bet rejected, restore balance
 * - Other errors → Show error popup
 *
 * Always returns to IdleFlow
 */
class ErrorFlow extends BaseFlow {
    constructor(ctx: GameContext, private error: GameError) {
        super(ctx);
    }

    async run(): Promise<BaseFlow | null> {
        const { hud, store } = this.ctx;

        if (this.error.custom_message === "-1") {
            store.rejectBet();
            hud.display.setBalance(store.balance);
            return new IdleFlow(this.ctx);
        }

        await hud.popups.showError(this.error);

        return new IdleFlow(this.ctx);
    }
}

/**
 * Buy bonus flow - handle bonus purchase
 *
 * Flow:
 * 1. Show buy bonus popup with options
 * 2. If confirmed:
 *    - Call buyFreeSpins API
 *    - Deduct cost from balance
 *    - Go to SpinningFlow (will trigger free spins)
 * 3. If cancelled → IdleFlow
 */
class BuyBonusFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, api, store } = this.ctx;

        const selection = await hud.popups.showBuyBonus();

        if (selection.confirmed) {
            const result = await api.buyFreeSpins(selection.bet, selection.index);

            if (result.error) {
                return new ErrorFlow(this.ctx, result.error);
            }

            store.setSpinResult(result);
            store.deductBet(selection.bet);
            hud.display.setBalance(store.balance);

            return new SpinningFlow(this.ctx);
        }

        return new IdleFlow(this.ctx);
    }
}

/**
 * Info flow - show game rules and paytable
 * Simple popup flow that always returns to idle
 */
class InfoFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        await this.ctx.hud.popups.showInfo();
        return new IdleFlow(this.ctx);
    }
}

/**
 * Settings flow - show game settings (sound, graphics, etc.)
 * Simple popup flow that always returns to idle
 */
class SettingsFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        await this.ctx.hud.popups.showSettings();
        return new IdleFlow(this.ctx);
    }
}

/**
 * Autoplay settings flow - configure autoplay parameters
 *
 * Flow:
 * 1. Show autoplay settings popup
 * 2. If confirmed:
 *    - Start autoplay with settings
 *    - Show stop autoplay button
 * 3. Return to IdleFlow (autoplay will trigger spin automatically)
 */
class AutoplaySettingsFlow extends BaseFlow {
    async run(): Promise<BaseFlow | null> {
        const { hud, autoplay } = this.ctx;

        const settings = await hud.popups.showAutoplaySettings();

        if (settings.confirmed) {
            autoplay.start(settings);
            hud.buttons.showStopAutoplayButton();
        }

        return new IdleFlow(this.ctx);
    }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Create skip controller for animations
 *
 * Returns controller with:
 * - isSkipped: boolean flag
 * - onSkip: Promise that resolves when skip() is called
 * - skip(): trigger skip
 *
 * Usage with Promise.race:
 * ```typescript
 * const skip = createSkipController();
 * await Promise.race([animation, skip.onSkip]);
 * if (skip.isSkipped) { ... }
 * ```
 */
function createSkipController(): SkipController {
    let isSkipped = false;
    let resolveSkip: (() => void) | null = null;

    const onSkip = new Promise<void>((resolve) => {
        resolveSkip = resolve;
    });

    return {
        get isSkipped() {
            return isSkipped;
        },
        get onSkip() {
            return onSkip;
        },
        skip() {
            if (!isSkipped) {
                isSkipped = true;
                resolveSkip?.();
            }
        },
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// CONTROLLER STORE
// =============================================================================

/**
 * IMPLEMENTED: modules/engine/flow/ControllerStore.js
 *
 * Engine version: ControllerStore extends Service
 * Registered in ServicesConfig, available via services.get("controllerStore")
 * or this.ctx.controllerStore in flows.
 *
 * Below is the TypeScript interface for reference.
 */

// =============================================================================
// EXPORTS
// =============================================================================

// Engine exports (from modules/engine/flow/):
// - BaseFlow, delay, ControllerStore, gameFlowLoop

// Slot-specific exports (this file, reference only):
export {
    BaseFlow,
    IdleFlow,
    SpinningFlow,
    PresentationFlow,
    FreeSpinIntroFlow,
    FreeSpinIdleFlow,
    FreeSpinningFlow,
    FreeSpinOutroFlow,
    ErrorFlow,
    BuyBonusFlow,
    InfoFlow,
    SettingsFlow,
    AutoplaySettingsFlow,
    createSkipController,
};

export type {
    GameContext,
    IHud,
    IReels,
    IApi,
    IStore,
    IAudio,
    IAutoplay,
    IBackground,
    SpinResult,
    StepResult,
    SkipController,
    UserAction,
    ControllerStore,
    IController,
};
