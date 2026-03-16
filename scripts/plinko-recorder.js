#!/usr/bin/env node
/**
 * Plinko Recording Pipeline
 *
 * Runs offline matter.js simulations to generate pre-recorded ball trajectories.
 * Each pocket gets N recordings saved as JSON keyframe data.
 *
 * Usage:
 *   node scripts/plinko-recorder.js \
 *     --board=games/sandbox/src/configs/plinko-board.js \
 *     --recordings=5 --theme=classic \
 *     --output=games/sandbox/assets/plinko/classic
 */

import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
    const args = {};
    for (const arg of process.argv.slice(2)) {
        const m = arg.match(/^--(\w[\w-]*)(?:=(.*))?$/);
        if (m) args[m[1]] = m[2] ?? true;
    }
    return args;
}

const cli = parseArgs();

if (!cli.board) {
    console.error("Usage: node scripts/plinko-recorder.js --board=<path> [--recordings=5] [--theme=classic] [--output=<dir>]");
    process.exit(1);
}

const RECORDINGS_PER_POCKET = Number(cli.recordings) || 5;
const THEME = cli.theme || "default";
const MAX_ATTEMPTS_MULTIPLIER = 100; // max attempts per recording

// ---------------------------------------------------------------------------
// Load board config
// ---------------------------------------------------------------------------

const boardPath = path.resolve(cli.board);
const boardModule = await import(pathToFileURL(boardPath).href);
const boardConfig = boardModule.PlinkoBoard ?? boardModule.default;

const {
    rows,
    pegRadius,
    pegSpacing,
    rowSpacing,
    ballRadius,
    pockets,
    spawn,
    physics,
} = boardConfig;

const boardWidth = (pockets - 1) * pegSpacing;
const boardHeight = rows * rowSpacing;

const outputDir = cli.output
    ? path.resolve(cli.output)
    : path.resolve(path.dirname(boardPath), `../../assets/plinko/${THEME}`);

// ---------------------------------------------------------------------------
// matter.js setup
// ---------------------------------------------------------------------------

let Matter;
try {
    Matter = (await import("matter-js")).default;
} catch {
    console.error("matter-js is not installed. Run: npm install -D matter-js");
    process.exit(1);
}

const { Engine, Bodies, Body, Composite, Events } = Matter;

// ---------------------------------------------------------------------------
// Build world geometry
// ---------------------------------------------------------------------------

function createWorld() {
    const engine = Engine.create({
        gravity: { x: physics.gravity.x, y: physics.gravity.y },
    });

    const pegs = [];
    const PEG_JITTER = 1.5; // ±px random offset for path variety
    for (let row = 0; row < rows; row++) {
        const count = row + 1;
        const offsetX = -(count - 1) * pegSpacing * 0.5;
        for (let col = 0; col < count; col++) {
            const jx = (Math.random() - 0.5) * 2 * PEG_JITTER;
            const jy = (Math.random() - 0.5) * 2 * PEG_JITTER;
            const peg = Bodies.circle(
                offsetX + col * pegSpacing + jx,
                row * rowSpacing + jy,
                pegRadius,
                { isStatic: true, restitution: physics.restitution, friction: physics.friction },
            );
            pegs.push(peg);
        }
    }

    // Side walls
    const wallThickness = 20;
    const wallHeight = boardHeight + 200;
    const leftWall = Bodies.rectangle(
        -boardWidth / 2 - wallThickness / 2 - pegSpacing * 0.5, boardHeight / 2,
        wallThickness, wallHeight,
        { isStatic: true },
    );
    const rightWall = Bodies.rectangle(
        boardWidth / 2 + wallThickness / 2 + pegSpacing * 0.5, boardHeight / 2,
        wallThickness, wallHeight,
        { isStatic: true },
    );

    // Floor
    const floorY = boardHeight + 40;
    const floor = Bodies.rectangle(0, floorY, boardWidth + pegSpacing * 2, 20, { isStatic: true });

    // Pocket dividers
    const dividers = [];
    const dividerHeight = 30;
    for (let i = 0; i < pockets; i++) {
        const x = -(pockets - 1) * pegSpacing * 0.5 + i * pegSpacing;
        // Dividers on both sides of each pocket
        if (i === 0 || i === pockets - 1) continue;
    }
    // Place dividers between pockets
    for (let i = 0; i <= pockets; i++) {
        const x = -(pockets) * pegSpacing * 0.5 + i * pegSpacing;
        const divider = Bodies.rectangle(
            x, floorY - dividerHeight / 2,
            4, dividerHeight,
            { isStatic: true },
        );
        dividers.push(divider);
    }

    // Pocket sensor bodies (for detection)
    const sensors = [];
    for (let i = 0; i < pockets; i++) {
        const x = -(pockets - 1) * pegSpacing * 0.5 + i * pegSpacing;
        const sensor = Bodies.rectangle(
            x, floorY - 5,
            pegSpacing * 0.8, 10,
            { isStatic: true, isSensor: true, label: `pocket-${i}` },
        );
        sensors.push(sensor);
    }

    Composite.add(engine.world, [...pegs, leftWall, rightWall, floor, ...dividers, ...sensors]);

    return { engine, sensors };
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

function detectBounces(engine, ball) {
    const bounceFrames = new Set();
    Events.on(engine, "collisionStart", (event) => {
        for (const pair of event.pairs) {
            if (pair.bodyA === ball || pair.bodyB === ball) {
                bounceFrames.add(engine._frameCount);
            }
        }
    });
    return bounceFrames;
}

// ---------------------------------------------------------------------------
// Keyframe reduction
// ---------------------------------------------------------------------------

function reduceKeyframes(rawFrames, bounceFrames, fps) {
    if (rawFrames.length <= 2) return rawFrames;

    const keyframes = [];
    const dt = 1 / fps;
    const ANGLE_THRESHOLD = 0.15; // radians — direction change threshold
    const ANCHOR_INTERVAL = 6;    // force a keyframe every N frames

    keyframes.push({
        t: round(0),
        x: round(rawFrames[0].x),
        y: round(rawFrames[0].y),
    });

    for (let i = 1; i < rawFrames.length - 1; i++) {
        const prev = rawFrames[i - 1];
        const curr = rawFrames[i];
        const next = rawFrames[i + 1];

        const isBounce = bounceFrames.has(i);
        const isAnchor = i % ANCHOR_INTERVAL === 0;

        // Direction change
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        let angleDiff = Math.abs(angle2 - angle1);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        const isDirectionChange = angleDiff > ANGLE_THRESHOLD;

        if (isBounce || isDirectionChange || isAnchor) {
            const kf = {
                t: round(i * dt),
                x: round(curr.x),
                y: round(curr.y),
            };
            if (isBounce) kf.bounce = true;
            keyframes.push(kf);
        }
    }

    // Always include last frame
    const last = rawFrames[rawFrames.length - 1];
    keyframes.push({
        t: round((rawFrames.length - 1) * dt),
        x: round(last.x),
        y: round(last.y),
    });

    return keyframes;
}

function round(v) {
    return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Run single simulation
// ---------------------------------------------------------------------------

function simulate(targetPocket) {
    const { engine, sensors } = createWorld();
    engine._frameCount = 0;

    // Bias spawn toward target pocket for better hit rates.
    // Normalised pocket position: 0 = leftmost, 1 = rightmost
    const pocketNorm = targetPocket / (pockets - 1);
    // Blend between config spawn.x and pocket position (50% spawn, 50% pocket bias)
    const biasedX = spawn.x * 0.5 + pocketNorm * 0.5;
    const baseX = (biasedX - 0.5) * boardWidth;
    const variance = (Math.random() * 2 - 1) * spawn.variance * pegSpacing;
    const startX = baseX + variance;
    const startY = spawn.y;

    const ball = Bodies.circle(startX, startY, ballRadius, {
        restitution: physics.restitution,
        friction: physics.friction,
        density: physics.ballDensity,
    });

    // Horizontal impulse: random base + bias toward target pocket
    const pocketX = -(pockets - 1) * pegSpacing * 0.5 + targetPocket * pegSpacing;
    const directionBias = Math.sign(pocketX - startX) * 0.001 * physics.ballDensity;
    const randomImpulse = (Math.random() - 0.5) * 0.002 * physics.ballDensity;
    Body.applyForce(ball, ball.position, { x: randomImpulse + directionBias, y: 0 });

    Composite.add(engine.world, ball);

    const bounceFrames = detectBounces(engine, ball);
    const rawFrames = [];
    let landedPocket = -1;

    const dt = 1000 / physics.fps;

    for (let step = 0; step < physics.simulationSteps; step++) {
        Engine.update(engine, dt);
        engine._frameCount = step;

        rawFrames.push({ x: ball.position.x, y: ball.position.y });

        // Check pocket sensors
        if (landedPocket === -1 && ball.speed < 0.5 && step > physics.simulationSteps * 0.3) {
            // Ball has settled — find nearest pocket
            const pocketPositions = [];
            for (let i = 0; i < pockets; i++) {
                pocketPositions.push(-(pockets - 1) * pegSpacing * 0.5 + i * pegSpacing);
            }
            let minDist = Infinity;
            for (let i = 0; i < pocketPositions.length; i++) {
                const dist = Math.abs(ball.position.x - pocketPositions[i]);
                if (dist < minDist) {
                    minDist = dist;
                    landedPocket = i;
                }
            }
            break;
        }
    }

    // If still moving at end, determine pocket by final x
    if (landedPocket === -1) {
        const pocketPositions = [];
        for (let i = 0; i < pockets; i++) {
            pocketPositions.push(-(pockets - 1) * pegSpacing * 0.5 + i * pegSpacing);
        }
        let minDist = Infinity;
        for (let i = 0; i < pocketPositions.length; i++) {
            const dist = Math.abs(ball.position.x - pocketPositions[i]);
            if (dist < minDist) {
                minDist = dist;
                landedPocket = i;
            }
        }
    }

    const keyframes = reduceKeyframes(rawFrames, bounceFrames, physics.fps);
    const duration = round(rawFrames.length / physics.fps);

    Composite.clear(engine.world);
    Engine.clear(engine);

    return { pocket: landedPocket, duration, keyframes };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Plinko Recorder`);
console.log(`  Board: ${boardPath}`);
console.log(`  Theme: ${THEME}`);
console.log(`  Pockets: ${pockets}`);
console.log(`  Recordings per pocket: ${RECORDINGS_PER_POCKET}`);
console.log(`  Output: ${outputDir}`);
console.log();

fs.mkdirSync(outputDir, { recursive: true });

let totalRecordings = 0;
let totalAttempts = 0;

for (let pocket = 0; pocket < pockets; pocket++) {
    const recordings = [];
    let attempts = 0;
    const maxAttempts = RECORDINGS_PER_POCKET * MAX_ATTEMPTS_MULTIPLIER;

    while (recordings.length < RECORDINGS_PER_POCKET && attempts < maxAttempts) {
        attempts++;
        totalAttempts++;
        const result = simulate(pocket);
        if (result.pocket === pocket) {
            recordings.push(result);
        }
    }

    const filename = `pocket-${String(pocket).padStart(2, "0")}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(recordings, null, 2));

    const avgKf = recordings.reduce((s, r) => s + r.keyframes.length, 0) / recordings.length;
    const size = (Buffer.byteLength(JSON.stringify(recordings)) / 1024).toFixed(1);
    console.log(
        `  pocket ${String(pocket).padStart(2, "0")}: ${recordings.length}/${RECORDINGS_PER_POCKET} recordings ` +
        `(${attempts} attempts, ~${Math.round(avgKf)} kf avg, ${size}KB)`,
    );

    totalRecordings += recordings.length;
}

console.log();
console.log(`Done: ${totalRecordings} recordings in ${totalAttempts} attempts`);
console.log(`Output: ${outputDir}`);
