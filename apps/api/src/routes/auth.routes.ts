import { Router } from "express";
import { passport } from "../services/auth.service.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: true,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login-failed",
    session: true,
  }),
  (_req, res) => {
    res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
  },
);

router.get("/me", (req, res) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
    return;
  }

  const user = req.user as any;

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
});

router.post("/logout", (req, res) => {
  req.logout((error) => {
    if (error) {
      res.status(500).json({
        success: false,
        error: "Logout failed",
      });
      return;
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        res.status(500).json({
          success: false,
          error: "Failed to destroy session",
        });
        return;
      }

      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

export default router;
