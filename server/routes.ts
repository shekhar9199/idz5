import express from "express";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { getUncachableStripeClient } from "./stripeClient";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/upload-video", upload.single("video"), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfiwh5cqr";
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "idigital";

    if (!cloudName || !uploadPreset) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: "Cloudinary not configured" });
    }

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const blob = new Blob([fileBuffer], { type: req.file.mimetype });

      const cloudForm = new FormData();
      cloudForm.append("file", blob, req.file.originalname);
      cloudForm.append("upload_preset", uploadPreset);
      cloudForm.append("folder", "idigitalzone_videos");

      console.log("Uploading to Cloudinary:", cloudName, "preset:", uploadPreset);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: cloudForm as any }
      );

      fs.unlinkSync(req.file.path);

      if (!cloudRes.ok) {
        const errText = await cloudRes.text();
        console.error("Cloudinary upload error:", cloudRes.status, errText);
        return res.status(500).json({ error: "Cloud upload failed", details: errText });
      }

      const cloudData = await cloudRes.json() as any;
      console.log("Cloudinary upload success:", cloudData.secure_url);
      res.json({ url: cloudData.secure_url, filename: req.file.filename });
    } catch (err: any) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error("Upload error:", err?.message);
      res.status(500).json({ error: "Upload failed", details: err?.message });
    }
  });
  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const { planKey, customerName, customerPhone, igId, igPassword } = req.body;
      if (!planKey || !customerName || !customerPhone) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const stripe = await getUncachableStripeClient();

      const planMap: Record<string, { name: string; amount: number }> = {
        "one-time": { name: "One Time Ads Setup", amount: 34900 },
        "manage-weekly": { name: "Manage Ads - 1 Week", amount: 49900 },
        "manage-15days": { name: "Manage Ads - 15 Days", amount: 84900 },
        "manage-monthly": { name: "Manage Ads - 1 Month", amount: 149900 },
      };

      const plan = planMap[planKey];
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: plan.name,
                description: `Customer: ${customerName} | Phone: ${customerPhone}`,
              },
              unit_amount: plan.amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/api/payment-cancel`,
        metadata: {
          planKey,
          customerName,
          customerPhone,
          igId: igId || "",
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/payment-success", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0FDF4; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
            .card { background: #fff; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .icon { width: 64px; height: 64px; background: #0D9488; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
            .icon svg { width: 32px; height: 32px; }
            h1 { color: #0D9488; font-size: 22px; margin-bottom: 8px; }
            p { color: #6B7280; font-size: 15px; line-height: 1.5; }
            .note { margin-top: 20px; padding: 12px; background: #F0FDF4; border-radius: 10px; color: #0D9488; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon"><svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
            <h1>Payment Successful!</h1>
            <p>Your booking has been confirmed. Our team will set up your ads and reach out shortly.</p>
            <div class="note">You can close this page and return to the app.</div>
          </div>
        </body>
      </html>
    `);
  });

  app.get("/api/payment-cancel", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Cancelled</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FEF2F2; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
            .card { background: #fff; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .icon { width: 64px; height: 64px; background: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
            .icon svg { width: 32px; height: 32px; }
            h1 { color: #EF4444; font-size: 22px; margin-bottom: 8px; }
            p { color: #6B7280; font-size: 15px; line-height: 1.5; }
            .note { margin-top: 20px; padding: 12px; background: #FEF2F2; border-radius: 10px; color: #EF4444; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon"><svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>
            <h1>Payment Cancelled</h1>
            <p>Your payment was not completed. You can go back to the app and try again.</p>
            <div class="note">You can close this page and return to the app.</div>
          </div>
        </body>
      </html>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
