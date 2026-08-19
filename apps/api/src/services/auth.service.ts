import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../database/prisma.js";
import { env } from "../config/env.js";

export function configureGoogleAuth() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.warn("[auth] Google OAuth credentials are not configured");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google account has no email address"));
          }

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName || email,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName || email,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
          });

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      },
    ),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

export { passport };
