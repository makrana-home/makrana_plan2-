import logo from "@/assets/makrana-logo.png";
import horizontalLogo from "@/assets/makrana-logo-guinda-horizontal.png";
import whiteHorizontalLogo from "@/assets/makrana-logo-white-horizontal.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
  variant?: "stacked" | "horizontal" | "horizontal-white";
};

export function BrandLogo({
  className,
  imageClassName,
  alt = "Makrana Home Art",
  variant = "stacked",
}: BrandLogoProps) {
  const isHorizontal = variant !== "stacked";
  const isWhiteHorizontal = variant === "horizontal-white";
  const imageSource = isWhiteHorizontal ? whiteHorizontalLogo : isHorizontal ? horizontalLogo : logo;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={imageSource}
        alt={alt}
        width={isWhiteHorizontal ? 1997 : isHorizontal ? 1998 : 489}
        height={isWhiteHorizontal ? 583 : isHorizontal ? 584 : 132}
        className={cn("block h-auto w-40", imageClassName)}
      />
    </span>
  );
}
