import { ImageResponse } from "next/og";

import { brandIconDataUri } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
        }}
      >
        <img width={size.width} height={size.height} src={brandIconDataUri()} alt="" />
      </div>
    ),
    { ...size },
  );
}
