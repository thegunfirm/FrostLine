// BACKUP of original verification endpoint before auto-login implementation
// Lines 92-111 from server/routes.ts

app.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: "Verification token required" });
    }
    
    const user = await storage.verifyUserEmail(token as string);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }
    
    // Redirect to frontend with success message
    res.redirect(`/?verified=true&email=${encodeURIComponent(user.email)}`);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
});