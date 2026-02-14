import { deepSeekService } from "../services/deepSeekService.js";

export async function authenticate(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Missing email or password",
      message: "Both email and password are required",
    });
  }

  try {
    await deepSeekService.authenticate(email, password);
    await deepSeekService.init();
    res.json({
      success: true,
      message: "Authentication successful. Session saved.",
    });
  } catch (error) {
    console.error("❌ [AuthController] Error:", error.message);
    res.status(401).json({
      error: "Authentication failed",
      message: error.message,
    });
  }
}
