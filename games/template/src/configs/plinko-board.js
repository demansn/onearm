import { PlinkoPhysicsPresets } from "onearm/slots";

export const PlinkoBoard = {
    rows: 12,
    pegRadius: 6,
    pegSpacing: 40,
    rowSpacing: 35,
    ballRadius: 10,
    pockets: 13,

    spawn: {
        x: 0.5,
        y: -20,
        variance: 0.4,
    },

    physics: PlinkoPhysicsPresets.classic,
};
