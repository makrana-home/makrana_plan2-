import logo from "@/assets/makrana-logo.png";
import horizontalLogo from "@/assets/makrana-logo-horizontal.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
  variant?: "stacked" | "horizontal";
};

export function BrandLogo({
  className,
  imageClassName,
  alt = "Makrana Home Art",
  variant = "stacked",
}: BrandLogoProps) {
  const isHorizontal = variant === "horizontal";

  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={isHorizontal ? horizontalLogo : logo}
        alt={alt}
        width={isHorizontal ? 660 : 489}
        height={isHorizontal ? 78 : 132}
        className={cn("block h-auto w-40", imageClassName)}
      />
    </span>
  );
}
