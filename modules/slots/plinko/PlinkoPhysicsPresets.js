/**
 * Physics presets for Plinko recording pipeline.
 * Each preset defines matter.js simulation parameters that produce
 * visually distinct ball trajectories.
 */
export const PlinkoPhysicsPresets = {
    /** Classic Pachinko — crisp bounces, predictable gravity */
    classic: {
        restitution: 0.5,
        friction: 0.1,
        ballDensity: 1,
        gravity: { x: 0, y: 1 },
        simulationSteps: 600,
        fps: 60,
    },

    /** Water — slow descent, dampened bounces, floating feel */
    water: {
        restitution: 0.15,
        friction: 0.4,
        ballDensity: 0.6,
        gravity: { x: 0, y: 0.4 },
        simulationSteps: 900,
        fps: 60,
    },
};
