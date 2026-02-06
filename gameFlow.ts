/**
 * Game Flow Architecture
 *
 * Современная архитектура управления состояниями слота на основе async/await и классов.
 * Заменяет тяжёлую FSM (Finite State Machine) на лёгкие композируемые flows.
 *
 * ## Ключевые концепции
 *
 * ### 1. Flow как класс
 * Каждое состояние игры = класс, наследующий BaseFlow:
 * - `run()` — основная логика состояния
 * - `execute()` — обёртка с автоочисткой ресурсов
 * - Возвращает следующий flow или null для завершения
 *
 * ### 2. Автоматическая очистка ресурсов
 * BaseFlow управляет подписками и таймерами:
 * ```typescript
 * const unsub = hud.onSkip(() => ...);
 * this.onDispose(unsub); // Автоматически вызовется в finally
 * ```
 *
 * ### 3. SkipController
 * Единый механизм пропуска анимаций:
 * - `skipController.skip()` — пропустить текущую анимацию
 * - `skipController.onSkip` — Promise для Promise.race
 * - Создаётся через `this.createSkipController()` с автоочисткой
 *
 * ### 4. Композиция через наследование
 * FreeSpinPresentationFlow extends PresentationFlow — переиспользует логику презентации
 *
 * ### 5. ControllerStore
 * Хранилище для фоновых контроллеров (bets, autoplay):
 * ```typescript
 * ctx.controllers.add('bet', new BetController(ctx));
 * ctx.controllers.remove('bet'); // Автоматически вызовет destroy()
 * ```
 *
 * ## Структура flows
 *
 * ### Основной цикл игры
 * ```
 * IdleFlow
 *   ↓ (spin)
 * SpinningFlow
 *   ↓
 * PresentationFlow
 *   ↓ (hasFreeSpins)
 * FreeSpinIntroFlow → FreeSpinIdleFlow → FreeSpinningFlow → FreeSpinPresentationFlow → FreeSpinOutroFlow
 *   ↓
 * IdleFlow
 * ```
 *
 * ### Дополнительные flows
 * - `BuyBonusFlow` — покупка бонуса
 * - `InfoFlow` — информационный экран
 * - `SettingsFlow` — настройки
 * - `AutoplaySettingsFlow` — настройки автоигры
 * - `ErrorFlow` — обработка ошибок
 *
 * ## Преимущества над FSM
 *
 * | Критерий | FSM + States | Flow Classes |
 * |----------|--------------|--------------|
 * | Код | ~2000 строк | ~1000 строк |
 * | Явность переходов | 3/10 (goTo скрыт) | 10/10 (return flow) |
 * | Утечки памяти | Возможны | Невозможны |
 * | Добавление фич | Новый State + переходы | Новый класс |
 * | Читаемость | Разбросано по файлам | Линейный код |
 *
 * ## Пример использования
 *
 * ```typescript
 * // 1. Создать контекст
 * const ctx: GameContext = {
 *     hud, reels, api, store, audio, autoplay, background,
 *     controllers: createControllerStore()
 * };
 *
 * // 2. Добавить контроллеры (опционально)
 * ctx.controllers.add('bet', new BetController(ctx));
 *
 * // 3. Запустить игровой цикл
 * await gameLoop(ctx);
 * ```
 *
 * ## Расширение
 *
 * Добавить новый flow:
 * ```typescript
 * class CustomFlow extends BaseFlow {
 *     async run(): Promise<BaseFlow | null> {
 *         // Ваша логика
 *         return new IdleFlow(this.ctx);
 *     }
 * }
 *
 * // В IdleFlow.routeAction добавить маршрут
 * const routes = {
 *     custom: CustomFlow,
 *     // ...
 * };
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

type FlowFunction = (ctx: GameContext) => Promise<BaseFlow | null>;

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

    display: {
        setBalance(value: number): void;
        setWin(value: number): void;
        setTotalBet(value: number): void;
        setFreeSpinsCounter(value: number): void;
        showInfo(text: string): void;
        setInfoText(text: string): void;
        showWinInfo(): void;
        clearPayInfo(): void;
        showPayInfo(pay: Pay): void;
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

interface IReels {
    toIdleState(): void;
    goToIdle(): void;

    spin(options: { instant: boolean }): SpinAnimation;
    stop(matrix: ReelsMatrix): Promise<void>;
    quickStop(matrix: ReelsMatrix): Promise<void>;
    forceStop(matrix: ReelsMatrix): void;

    playWinAnimation(positions: Position[], isTurbo: boolean): Promise<void>;
    removeSymbolsByPositions(positions: Position[]): void;
    playPayAnimation(data: { positions: Position[]; win: number }): Promise<void>;

    cascade(step: CascadeStep): Promise<void>;
    forceCascade(step: CascadeStep): void;

    playMultiplierAnimation(multipliers: Multiplier[], isTurbo: boolean): Promise<void>;
    showMultiplierInstant(multipliers: Multiplier[]): void;

    playScatterAnimation(positions: Position[]): Promise<void>;
    skipWin(result: StepResult): void;
}

interface IApi {
    spin(bet: number): Promise<SpinResult>;
    freeSpin(): Promise<SpinResult>;
    buyFreeSpins(bet: number, index: number): Promise<SpinResult>;
}

interface IStore {
    balance: number;
    bet: number;
    win: number;
    totalWin: number;
    spinType: SpinType;
    freeSpinsLeft: number;
    freeSpinsCount: number;
    totalFreeSpinsWin: number;

    nextBet(): void;
    prevBet(): void;
    deductBet(amount?: number): void;
    rejectBet(): void;

    setSpinResult(result: SpinResult): void;
    addWin(value: number): void;
    setWin(value: number): void;
    setMultiplier(value: number): void;

    hasFreeSpins(): boolean;
    addFreeSpins(count: number): void;
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

type StepResult =
    | StopStep
    | PaysStep
    | CascadeStep
    | MultiplierStep
    | FreeSpinsTriggerStep
    | FreeSpinsRetriggerStep;

interface StopStep {
    type: "stop";
    matrix: ReelsMatrix;
}

interface PaysStep {
    type: "pays";
    pays: Pay[];
    win: number;
    winBeforePay: number;
    winAfterPay: number;
}

interface CascadeStep {
    type: "cascade";
    newSymbols: unknown;
}

interface MultiplierStep {
    type: "multiplier";
    multipliers: Multiplier[];
    multiplier: number;
    win: {
        total: number;
        beforeMultiplier: number;
    };
}

interface FreeSpinsTriggerStep {
    type: "freeSpinsTrigger";
    freeSpins: number;
    positions: Position[];
}

interface FreeSpinsRetriggerStep {
    type: "freeSpinsRetrigger";
    freeSpins: number;
}

interface Pay {
    positions: Position[];
    win: number;
    symbol?: string;
    count?: number;
}

interface Position {
    row: number;
    column: number;
}

interface Multiplier {
    row: number;
    column: number;
    multiplier: number;
}

interface ReelsMatrix {
    getSymbolsCount(symbol: string): number;
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
 * Options for presentation flow
 */
interface PresentationOptions {
    quickStop: boolean;
    isTurbo: boolean;
    skipController: SkipController;
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
 * Base class for all flows with automatic resource cleanup
 *
 * Features:
 * - Automatic disposal of subscriptions/timers via onDispose()
 * - Built-in skip controller creation with auto-cleanup
 * - Guaranteed cleanup even if exception occurs (finally block)
 *
 * Usage:
 * ```typescript
 * class MyFlow extends BaseFlow {
 *     async run(): Promise<BaseFlow | null> {
 *         const unsub = this.ctx.hud.onSkip(() => ...);
 *         this.onDispose(unsub); // Auto cleanup
 *
 *         await someAsyncWork();
 *
 *         return new NextFlow(this.ctx);
 *     }
 * }
 * ```
 */
abstract class BaseFlow {
    protected disposables: Array<() => void> = [];

    constructor(protected ctx: GameContext) {}

    /**
     * Register callback to be called on flow disposal
     * Typically used for unsubscribing from events
     */
    protected onDispose(callback: () => void): void {
        this.disposables.push(callback);
    }

    /**
     * Create skip controller with automatic cleanup and autoplay handling
     * Controller automatically stops autoplay when skip is triggered
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

    /**
     * Main flow logic - must be implemented by subclasses
     * @returns Next flow to execute or null to end game loop
     */
    abstract run(): Promise<BaseFlow | null>;

    /**
     * Execute flow with automatic cleanup
     * Called by gameLoop, should not be overridden
     */
    async execute(): Promise<BaseFlow | null> {
        try {
            return await this.run();
        } finally {
            this.dispose();
        }
    }

    /**
     * Dispose all registered callbacks
     * Automatically called in finally block
     */
    private dispose(): void {
        this.disposables.forEach((d) => d());
        this.disposables = [];
    }
}

// =============================================================================
// MAIN LOOP
// =============================================================================

/**
 * Main game loop
 * Executes flows sequentially until null is returned
 *
 * Each flow returns the next flow to execute:
 * - IdleFlow → SpinningFlow → PresentationFlow → IdleFlow (cycle)
 * - Any flow can return null to exit the loop
 *
 * @param ctx Game context with all services
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
 * Presentation state - showing spin results
 *
 * Handles all presentation steps in order:
 * - stop: Stop reels, show scatter animations
 * - pays: Show winning symbols and animate counter
 * - cascade: Remove winning symbols, drop new ones
 * - multiplier: Show multipliers and apply to win
 * - freeSpinsTrigger: Trigger free spins
 * - freeSpinsRetrigger: Add more free spins during bonus
 *
 * Features:
 * - Skip support for all steps
 * - Turbo mode with instant animations
 * - Autoplay integration
 * - Reusable via inheritance (FreeSpinPresentationFlow)
 *
 * After all steps:
 * - Updates autoplay state
 * - Routes to FreeSpinIntroFlow or IdleFlow
 */
class PresentationFlow extends BaseFlow {
    private skipController: SkipController;
    private quickStop: boolean;
    private isTurbo: boolean;
    private result: SpinResult;

    constructor(ctx: GameContext, params: PresentationParams) {
        super(ctx);
        this.result = params.result;
        this.quickStop = params.quickStop;
        this.isTurbo = params.isTurbo;
        this.skipController = this.createSkipController();

        if (ctx.autoplay.isActive() && ctx.autoplay.isTurboSpin) {
            this.skipController.skip();
        }
    }

    async run(): Promise<BaseFlow | null> {
        const { hud, store, autoplay } = this.ctx;

        try {
            for (const step of this.result.results) {
                await this.presentStep(step);

                if (this.skipController.isSkipped) {
                    await this.skipRemainingSteps(step);
                    break;
                }
            }

            if (autoplay.isActive()) {
                const win = store.totalWin;
                const loss = win === 0 ? store.bet : 0;
                autoplay.next({ win, loss });
            }

            if (!autoplay.isActive()) {
                const texts = ["PLACE YOUR BETS!", "SPIN TO WIN!", "HOLD SPACE FOR TURBO SPIN"];
                hud.display.setInfoText(texts[Math.floor(Math.random() * texts.length)]);
            }

            if (store.hasFreeSpins()) {
                return new FreeSpinIntroFlow(this.ctx);
            }

            return new IdleFlow(this.ctx);
        } catch (error) {
            return new ErrorFlow(this.ctx, error as GameError);
        }
    }

    private async presentStep(step: StepResult): Promise<void> {
        const handlers: Record<string, () => Promise<void>> = {
            stop: () => this.presentStop(step as StopStep),
            pays: () => this.presentPays(step as PaysStep),
            cascade: () => this.presentCascade(step as CascadeStep),
            multiplier: () => this.presentMultiplier(step as MultiplierStep),
            freeSpinsTrigger: () => this.presentFreeSpinsTrigger(step as FreeSpinsTriggerStep),
            freeSpinsRetrigger: () => this.presentRetrigger(step as FreeSpinsRetriggerStep),
        };

        await handlers[step.type]?.();
    }

    private async presentStop(step: StopStep): Promise<void> {
        const { reels, audio } = this.ctx;
        const { matrix } = step;

        const animation =
            this.quickStop || this.skipController.isSkipped
                ? reels.quickStop(matrix)
                : reels.stop(matrix);

        const scatterCount = Math.min(5, matrix.getSymbolsCount("S1"));
        if (scatterCount > 0) {
            audio.playSfx(`scatter_${scatterCount}`);
        }

        await waitOrSkip(animation, this.skipController, () => {
            reels.forceStop(matrix);
        });
    }

    private async presentPays(step: PaysStep): Promise<void> {
        const { hud, reels, store, audio } = this.ctx;
        const { pays, winAfterPay } = step;

        hud.display.showWinInfo();

        for (const pay of pays) {
            if (this.skipController.isSkipped) break;

            const { positions, win: payWin } = pay;

            const sounds = ["low_payout_1", "low_payout_2", "low_payout_3", "low_payout_4"];
            audio.playSfx(sounds[Math.floor(Math.random() * sounds.length)]);

            const symbolsAnimation = reels.playWinAnimation(positions, this.isTurbo);
            const counterAnimation = this.animateWinCounter(payWin);
            hud.display.showPayInfo(pay);

            await waitOrSkip(
                Promise.all([symbolsAnimation, counterAnimation]),
                this.skipController,
                () => {
                    store.addWin(payWin);
                    hud.display.setWin(store.win);
                    hud.display.setBalance(store.balance);
                }
            );

            reels.removeSymbolsByPositions(positions);

            if (!this.skipController.isSkipped) {
                await reels.playPayAnimation({ positions, win: payWin });
            }
        }

        hud.display.clearPayInfo();

        if (this.skipController.isSkipped) {
            hud.display.setBalance(store.balance);
            hud.display.setWin(winAfterPay);
            reels.goToIdle();
        }
    }

    private async animateWinCounter(win: number): Promise<void> {
        const { hud, store, audio } = this.ctx;

        if (this.isTurbo || this.skipController.isSkipped) {
            store.addWin(win);
            hud.display.setWin(store.win);
            hud.display.setBalance(store.balance);
            audio.playSfx("counter_end");
            return;
        }

        const duration = 1000;
        const startWin = store.win;
        const startBalance = store.balance;
        const targetWin = startWin + win;
        const targetBalance = startBalance + win;

        audio.playSfx("counter_loop", { loop: true });

        await animateValue({
            duration,
            onUpdate: (progress) => {
                const currentWin = Math.round(startWin + (targetWin - startWin) * progress);
                const currentBalance = Math.round(
                    startBalance + (targetBalance - startBalance) * progress
                );
                hud.display.setWin(currentWin);
                hud.display.setBalance(currentBalance);
            },
            skipController: this.skipController,
        });

        audio.stopSfx("counter_loop");
        audio.playSfx("counter_end");

        store.addWin(win);
    }

    private async presentCascade(step: CascadeStep): Promise<void> {
        const { reels } = this.ctx;

        await waitOrSkip(reels.cascade(step), this.skipController, () => {
            reels.forceCascade(step);
        });
    }

    private async presentMultiplier(step: MultiplierStep): Promise<void> {
        const { hud, reels, store } = this.ctx;
        const { multipliers, multiplier, win } = step;

        store.setMultiplier(multiplier);

        const animation = reels.playMultiplierAnimation(multipliers, this.isTurbo);

        await waitOrSkip(animation, this.skipController, () => {
            reels.showMultiplierInstant(multipliers);
        });

        if (!this.skipController.isSkipped) {
            await this.animateWinCounter(win.total - win.beforeMultiplier);
        } else {
            store.setWin(win.total);
            hud.display.setWin(win.total);
        }
    }

    private async presentFreeSpinsTrigger(step: FreeSpinsTriggerStep): Promise<void> {
        const { reels, audio, store } = this.ctx;

        store.addFreeSpins(step.freeSpins);
        audio.playSfx("freespins_trigger");
        await waitOrSkip(reels.playScatterAnimation(step.positions), this.skipController);
    }

    private async presentRetrigger(step: FreeSpinsRetriggerStep): Promise<void> {
        const { hud, audio, store } = this.ctx;

        store.addFreeSpins(step.freeSpins);
        audio.playSfx("freespins_retrigger");
        await waitOrSkip(hud.popups.showRetrigger(step.freeSpins), this.skipController, () => {
            hud.popups.hideRetrigger();
        });
    }

    private async skipRemainingSteps(currentStep: StepResult): Promise<void> {
        const { hud, reels, store } = this.ctx;
        const currentIndex = this.result.results.indexOf(currentStep);

        for (let i = currentIndex + 1; i < this.result.results.length; i++) {
            const step = this.result.results[i];

            switch (step.type) {
                case "stop":
                    reels.forceStop(step.matrix);
                    break;
                case "pays":
                    store.setWin(step.winAfterPay);
                    hud.display.setWin(step.winAfterPay);
                    reels.goToIdle();
                    break;
                case "cascade":
                    reels.forceCascade(step);
                    break;
                case "multiplier":
                    store.setWin(step.win.total);
                    hud.display.setWin(step.win.total);
                    break;
                case "freeSpinsTrigger":
                case "freeSpinsRetrigger":
                    store.addFreeSpins(step.freeSpins);
                    break;
            }
        }

        hud.display.setBalance(store.balance);
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
 * Reuses all presentation logic but routes to free spin flows
 *
 * After presentation:
 * - If free spins left → FreeSpinIdleFlow (continue)
 * - If no free spins left → FreeSpinOutroFlow (end bonus)
 */
class FreeSpinPresentationFlow extends PresentationFlow {
    async run(): Promise<BaseFlow | null> {
        const { store } = this.ctx;

        await super.run();

        if (store.freeSpinsLeft > 0) {
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

/**
 * Wait for promise or skip
 *
 * If already skipped → call onSkip immediately
 * Otherwise → race between promise and skip
 * If skipped during race → call onSkip
 *
 * @param promise Animation or async operation to wait for
 * @param skipController Skip controller
 * @param onSkip Optional callback when skipped (e.g. force complete animation)
 */
async function waitOrSkip(
    promise: Promise<unknown>,
    skipController: SkipController,
    onSkip?: () => void
): Promise<void> {
    if (skipController.isSkipped) {
        onSkip?.();
        return;
    }

    await Promise.race([promise, skipController.onSkip]);

    if (skipController.isSkipped) {
        onSkip?.();
    }
}

/**
 * Options for value animation
 */
interface AnimateValueOptions {
    duration: number;
    onUpdate: (progress: number) => void;
    skipController: SkipController;
}

/**
 * Animate value from 0 to 1 over duration
 * Used for counter animations, progress bars, etc.
 *
 * Respects skip controller - if skipped, jumps to progress = 1
 *
 * @param options Animation options
 */
async function animateValue({ duration, onUpdate, skipController }: AnimateValueOptions): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve) => {
        function tick() {
            if (skipController.isSkipped) {
                onUpdate(1);
                resolve();
                return;
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);

            onUpdate(progress);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                resolve();
            }
        }

        tick();
    });
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// CONTROLLER STORE
// =============================================================================

/**
 * Controller store implementation
 * Manages background reactive controllers (bets, autoplay, etc.)
 *
 * Controllers handle:
 * - Local state mutations (bet changes)
 * - UI subscriptions (button clicks)
 * - Background tasks (autoplay logic)
 *
 * Controllers should NOT:
 * - Block flow execution
 * - Trigger flow transitions
 */
class ControllerStoreImpl implements ControllerStore {
    private controllers = new Map<string, IController>();

    add(id: string, controller: IController): void {
        if (this.controllers.has(id)) {
            this.remove(id);
        }
        this.controllers.set(id, controller);
    }

    remove(id: string): void {
        const controller = this.controllers.get(id);
        if (controller) {
            controller.destroy?.();
            this.controllers.delete(id);
        }
    }

    get(id: string): IController | undefined {
        return this.controllers.get(id);
    }

    clear(): void {
        this.controllers.forEach((controller) => controller.destroy?.());
        this.controllers.clear();
    }
}

/**
 * Create controller store instance
 *
 * Usage:
 * ```typescript
 * const controllers = createControllerStore();
 * controllers.add('bet', new BetController(ctx));
 * controllers.add('autoplay', new AutoplayController(ctx));
 * // ... later
 * controllers.remove('bet'); // Calls destroy() automatically
 * ```
 */
export function createControllerStore(): ControllerStore {
    return new ControllerStoreImpl();
}

// =============================================================================
// EXPORTS
// =============================================================================

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
    FlowFunction,
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
    Pay,
    Position,
    ControllerStore,
    IController,
};
