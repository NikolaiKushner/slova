import { ImageResponse } from "next/og";

import { BRAND_S_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Full-bleed: iOS applies its own squircle mask. Rounding here would sit
 * inside that mask and look like a padded tile.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#115E59",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path d={BRAND_S_PATH} fill="#F4FAF9" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
