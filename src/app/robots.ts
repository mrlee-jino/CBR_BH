import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/properties"],
      disallow: [
        "/preview",
        "/dashboard",
        "/owner",
        "/admin",
        "/auth",
        "/login",
        "/signup",
        "/reset-password",
        "/forgot-password",
        "/resend-confirmation",
        "/become-an-owner",
      ],
    },
  };
}
