// PrimeChess OTB - Full routes.js

import express from "express";
const router = express.Router();
import { createMatch } from "./matchManager.js";

// Valid time controls in your system
const VALID_CONTROLS = ["15+10", "5+3", "2+1"];

// Create-game endpoint
router.post("/create-game", (req, res) => {
    const { timeControl } = req.body;

    if (!timeControl || !VALID_CONTROLS.includes(timeControl)) {
        return res.status(400).json({ error: "Invalid or missing time control" });
    }

    const code = createMatch(timeControl);
    return res.json({ code });
});

export default router;
