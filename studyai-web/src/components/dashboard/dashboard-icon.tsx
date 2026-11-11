import type { HTMLAttributes } from "react";
import overview from "@/assets/icons/overview.svg";
import chart from "@/assets/icons/chart.svg";
import document from "@/assets/icons/document.svg";
import quiz from "@/assets/icons/quiz.svg";
import profile from "@/assets/icons/profile.svg";
import arrow from "@/assets/icons/arrow.svg";
import chevron from "@/assets/icons/chevron.svg";
import spark from "@/assets/icons/spark.svg";
import target from "@/assets/icons/target.svg";
import trophy from "@/assets/icons/trophy.svg";
import clock from "@/assets/icons/clock.svg";
import check from "@/assets/icons/check.svg";
import lock from "@/assets/icons/lock.svg";
import mail from "@/assets/icons/mail.svg";
import settings from "@/assets/icons/settings.svg";
import book from "@/assets/icons/book.svg";
import sidebar from "@/assets/icons/sidebar.svg";
import upload from "@/assets/icons/upload.svg";
import levelEasy from "@/assets/icons/level-easy.svg";
import levelMedium from "@/assets/icons/level-medium.svg";
import levelHard from "@/assets/icons/level-hard.svg";

const icons = {
  overview,
  chart,
  document,
  quiz,
  profile,
  arrow,
  chevron,
  spark,
  target,
  trophy,
  clock,
  check,
  lock,
  mail,
  settings,
  book,
  sidebar,
  upload,
  levelEasy,
  levelMedium,
  levelHard,
};

export type DashboardIconName = keyof typeof icons;

export function DashboardIcon({
  name,
  className = "size-5",
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { name: DashboardIconName }) {
  const mask = `url(${icons[name].src})`;
  return (
    <span
      aria-hidden="true"
      className={`dashboard-icon ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask, ...style }}
      {...props}
    />
  );
}
